// BuildCheap — Build Worker (Isolated Process)
// This runs as a separate Node.js process via child_process.fork()
// Communicates with the main server via IPC messages
import 'dotenv/config';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Import database directly — each process gets its own connection
import db, { queries, deductCreditAndCreateBuild, refundBuildCredit } from './db.js';
import { provisionSigningAssets, completeProvisioning } from './apple-api.js';

const COST_PER_BUILD = parseFloat(process.env.COST_PER_BUILD || '0.50');
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || './artifacts';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

let isProcessing = false;

// ----- IPC Communication with parent process -----
process.on('message', (msg) => {
    if (msg.type === 'queue_build') {
        handleQueueBuild(msg.data);
    }
    if (msg.type === 'get_status') {
        sendStatus();
    }
});

function sendToParent(type, data) {
    if (process.send) {
        process.send({ type, data });
    }
}

// ----- Build Queue (SQLite-backed, persistent) -----

// On startup, recover any builds stuck in 'queued' or 'building' status
function recoverStalledBuilds() {
    const stalled = db.prepare(
        `SELECT b.*, p.name as project_name, p.slug as project_slug, p.repo_url
     FROM builds b JOIN projects p ON b.project_id = p.id
     WHERE b.status IN ('queued', 'building') ORDER BY b.created_at ASC`
    ).all();

    if (stalled.length > 0) {
        console.log(`[Worker] Recovering ${stalled.length} stalled build(s)...`);
        for (const build of stalled) {
            // Reset 'building' back to 'queued' so they re-enter the queue properly
            if (build.status === 'building') {
                db.prepare('UPDATE builds SET status = ? WHERE id = ?').run('queued', build.id);
            }
        }
        // Kick off processing
        processNextInQueue();
    }
}

function handleQueueBuild(data) {
    const { userId, projectId, platform, commitHash, commitMessage } = data;

    try {
        const project = queries.getProjectById.get(projectId);
        if (!project) throw new Error('Project not found');
        if (project.user_id !== userId) throw new Error('Not your project');

        const user = queries.getUserById.get(userId);
        const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase());

        if (!isAdmin && user.credit_balance < COST_PER_BUILD) {
            throw new Error('Insufficient credits. Please purchase more credits to continue building.');
        }

        const buildNumber = queries.getNextBuildNumber.get(projectId).next;
        const buildId = crypto.randomUUID();

        if (isAdmin) {
            // Admin: create build without deducting credits
            queries.createBuild.run(
                buildId, projectId, userId, buildNumber,
                platform, commitHash || 'HEAD', commitMessage || 'Manual build'
            );
        } else {
            // Regular user: atomic credit deduction + build creation
            deductCreditAndCreateBuild(
                userId, buildId, projectId, buildNumber,
                platform, commitHash || 'HEAD', commitMessage || 'Manual build'
            );
        }

        sendToParent('build_queued', {
            build_id: buildId,
            build_number: buildNumber,
            status: 'queued',
        });

        // Start processing if not already
        if (!isProcessing) {
            processNextInQueue();
        }
    } catch (err) {
        sendToParent('build_error', { error: err.message, userId });
    }
}

// Pull next queued build from SQLite and process it
async function processNextInQueue() {
    const next = db.prepare(
        `SELECT b.*, p.name as project_name, p.repo_url
     FROM builds b JOIN projects p ON b.project_id = p.id
     WHERE b.status = 'queued' ORDER BY b.created_at ASC LIMIT 1`
    ).get();

    if (!next) {
        isProcessing = false;
        sendToParent('queue_empty', {});
        return;
    }

    isProcessing = true;
    await executeBuild(next);
    processNextInQueue();
}

// Execute a single build
async function executeBuild(build) {
    const startTime = Date.now();

    emitLog(build.id, `[BuildCheap] Starting build for ${build.project_name} (${build.platform})`);
    emitLog(build.id, `[BuildCheap] Build ID: ${build.id}`);

    // Update status to building
    db.prepare('UPDATE builds SET status = ?, started_at = ? WHERE id = ?')
        .run('building', new Date().toISOString(), build.id);

    sendToParent('build_started', { buildId: build.id });

    try {
        // Step 1: Clone repository
        const workDir = path.join(ARTIFACTS_DIR, 'work', build.id);
        fs.mkdirSync(workDir, { recursive: true });

        if (build.repo_url) {
            emitLog(build.id, `[BuildCheap] Cloning ${build.repo_url}...`);
            await runCommand('git', ['clone', '--depth', '1', build.repo_url, '.'], workDir, build.id);
            emitLog(build.id, '✓ Repository cloned');
        } else {
            emitLog(build.id, '⚠ No repository URL configured — using uploaded project files');
        }

        // Step 2: Install dependencies
        emitLog(build.id, '[BuildCheap] Installing dependencies...');
        await runCommand('npm', ['install', '--legacy-peer-deps'], workDir, build.id);
        emitLog(build.id, '✓ Dependencies installed');

        // Step 3: Build native app
        if (build.platform === 'ios') {
            await buildIOS(build, workDir);
        } else {
            emitLog(build.id, `[BuildCheap] Building Android app...`);
            await runCommand('npx', ['expo', 'run:android', '--variant', 'release', '--no-build-cache'], workDir, build.id);
        }

        emitLog(build.id, '✓ Build complete!');

        // Step 4: Store artifact
        const artifactPath = findArtifact(workDir, build.platform);
        let artifactUrl = null;
        let artifactSize = 0;

        if (artifactPath) {
            const destDir = path.join(ARTIFACTS_DIR, 'builds', build.id);
            fs.mkdirSync(destDir, { recursive: true });
            const destPath = path.join(destDir, path.basename(artifactPath));
            fs.copyFileSync(artifactPath, destPath);
            artifactSize = fs.statSync(destPath).size;
            artifactUrl = `/artifacts/builds/${build.id}/${path.basename(artifactPath)}`;
            emitLog(build.id, `✓ Artifact: ${path.basename(artifactPath)} (${(artifactSize / 1024 / 1024).toFixed(1)} MB)`);
        }

        const duration = Math.round((Date.now() - startTime) / 1000);
        emitLog(build.id, `✅ Build successful! Duration: ${formatDuration(duration)} · Cost: $${COST_PER_BUILD}`);

        // Collect all logs and persist
        const log = buildLogs.get(build.id)?.join('\n') || '';
        db.prepare(`
      UPDATE builds SET status = 'success', completed_at = ?, duration_seconds = ?,
      artifact_url = ?, artifact_size = ?, log = ? WHERE id = ?
    `).run(new Date().toISOString(), duration, artifactUrl, artifactSize, log, build.id);

        sendToParent('build_complete', { buildId: build.id, status: 'success' });

        // Cleanup work directory
        fs.rmSync(workDir, { recursive: true, force: true });

    } catch (err) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        emitLog(build.id, `❌ Build failed: ${err.message}`);

        const log = buildLogs.get(build.id)?.join('\n') || '';
        db.prepare(`
      UPDATE builds SET status = 'error', completed_at = ?, duration_seconds = ?,
      log = ?, error_message = ? WHERE id = ?
    `).run(new Date().toISOString(), duration, log, err.message, build.id);

        // Refund credit
        refundBuildCredit(build.user_id, build.id, COST_PER_BUILD);
        emitLog(build.id, '💰 Credit refunded due to build failure');

        sendToParent('build_complete', { buildId: build.id, status: 'error' });

        // Cleanup
        const workDir = path.join(ARTIFACTS_DIR, 'work', build.id);
        if (fs.existsSync(workDir)) {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    }

    // Clean up in-memory logs after a delay
    setTimeout(() => buildLogs.delete(build.id), 60000);
}

// ----- Log Management -----
const buildLogs = new Map();

function emitLog(buildId, line) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logLine = `[${timestamp}] ${line}`;

    if (!buildLogs.has(buildId)) buildLogs.set(buildId, []);
    buildLogs.get(buildId).push(logLine);

    // Send log to parent process for WebSocket broadcast
    sendToParent('build_log', { buildId, line: logLine });
}

// ----- Command Runner -----
function runCommand(cmd, args, cwd, buildId) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, {
            cwd,
            env: { ...process.env, CI: '1' },
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        proc.stdout.on('data', (data) => {
            data.toString().split('\n').filter(l => l.trim()).forEach(line => emitLog(buildId, line));
        });

        proc.stderr.on('data', (data) => {
            data.toString().split('\n').filter(l => l.trim()).forEach(line => emitLog(buildId, line));
        });

        proc.on('close', (code) => {
            code === 0 ? resolve() : reject(new Error(`'${cmd} ${args.join(' ')}' exited with code ${code}`));
        });

        proc.on('error', (err) => reject(new Error(`Failed to start: ${cmd} — ${err.message}`)));
    });
}

// ----- iOS Build Pipeline -----
async function buildIOS(build, workDir) {
    const buildId = build.id;

    // Step 3a: Prebuild native iOS project
    emitLog(buildId, '[BuildCheap] Running expo prebuild...');
    await runCommand('npx', ['expo', 'prebuild', '--platform', 'ios', '--no-install'], workDir, buildId);
    emitLog(buildId, '✓ Prebuild complete');

    // Step 3b: Install CocoaPods
    emitLog(buildId, '[BuildCheap] Installing CocoaPods...');
    await runCommand('pod', ['install'], path.join(workDir, 'ios'), buildId);
    emitLog(buildId, '✓ CocoaPods installed');

    // Step 3c: Find workspace and scheme
    const iosDir = path.join(workDir, 'ios');
    const files = fs.readdirSync(iosDir);
    const workspace = files.find(f => f.endsWith('.xcworkspace'));
    const scheme = workspace ? workspace.replace('.xcworkspace', '') : 'App';
    const archivePath = path.join(workDir, 'build', 'app.xcarchive');
    const exportPath = path.join(workDir, 'build', 'export');

    // Step 3d: Check for Apple credentials (code signing)
    let signingAssets = null;
    try {
        signingAssets = await provisionSigningAssets(build.user_id, build.bundle_id || 'com.buildcheap.app', workDir);
    } catch (err) {
        emitLog(buildId, `⚠ No Apple credentials found — building unsigned: ${err.message}`);
    }

    let signingFlags;
    if (signingAssets && signingAssets.token) {
        // Generate CSR and provision signing assets
        emitLog(buildId, '[BuildCheap] Provisioning code signing...');
        const csrArgs = [
            'openssl', 'req', '-new', '-newkey', 'rsa:2048', '-nodes',
            '-keyout', signingAssets.keyPath,
            '-out', signingAssets.csrPath,
            '-subj', '/CN=BuildCheap Distribution/O=BuildCheap/C=US',
        ];
        await runCommand(csrArgs[0], csrArgs.slice(1), workDir, buildId);

        const csrContent = fs.readFileSync(signingAssets.csrPath, 'utf8');
        const provResult = await completeProvisioning(
            signingAssets.token, csrContent,
            signingAssets.bundleId, signingAssets
        );

        // Import cert and profile into keychain
        emitLog(buildId, '[BuildCheap] Installing signing certificate...');
        await runCommand('openssl', [
            'x509', '-inform', 'DER', '-in', signingAssets.certPath,
            '-out', path.join(signingAssets.signingDir, 'dist.pem'),
        ], workDir, buildId);

        // Create p12 from cert + key
        await runCommand('openssl', [
            'pkcs12', '-export',
            '-inkey', signingAssets.keyPath,
            '-in', path.join(signingAssets.signingDir, 'dist.pem'),
            '-out', signingAssets.p12Path,
            '-passout', 'pass:buildcheap',
        ], workDir, buildId);

        // Import into temporary keychain
        const keychainPath = path.join(signingAssets.signingDir, 'build.keychain-db');
        await runCommand('security', ['create-keychain', '-p', 'buildcheap', keychainPath], workDir, buildId);
        await runCommand('security', ['set-keychain-settings', '-t', '3600', keychainPath], workDir, buildId);
        await runCommand('security', ['unlock-keychain', '-p', 'buildcheap', keychainPath], workDir, buildId);
        await runCommand('security', ['import', signingAssets.p12Path, '-k', keychainPath, '-P', 'buildcheap', '-T', '/usr/bin/codesign'], workDir, buildId);
        await runCommand('security', ['list-keychains', '-d', 'user', '-s', keychainPath, 'login.keychain-db'], workDir, buildId);
        await runCommand('security', ['set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s', '-k', 'buildcheap', keychainPath], workDir, buildId);

        // Copy provisioning profile
        const profilesDir = path.join(process.env.HOME || '/Users/administrator', 'Library/MobileDevice/Provisioning Profiles');
        fs.mkdirSync(profilesDir, { recursive: true });
        fs.copyFileSync(signingAssets.profilePath, path.join(profilesDir, `${provResult.profileUUID}.mobileprovision`));

        emitLog(buildId, '✓ Code signing provisioned');

        signingFlags = [
            `DEVELOPMENT_TEAM=${signingAssets.teamId}`,
            `CODE_SIGN_IDENTITY=iPhone Distribution`,
            `PROVISIONING_PROFILE_SPECIFIER=${provResult.profileName}`,
        ];
    } else {
        emitLog(buildId, '[BuildCheap] Building unsigned (no Apple credentials)...');
        signingFlags = ['CODE_SIGNING_ALLOWED=NO'];
    }

    // Step 3e: Archive with xcodebuild
    emitLog(buildId, `[BuildCheap] Compiling with xcodebuild (scheme: ${scheme})...`);
    await runCommand('xcodebuild', [
        '-workspace', workspace,
        '-scheme', scheme,
        '-configuration', 'Release',
        '-sdk', 'iphoneos',
        '-destination', 'generic/platform=iOS',
        '-archivePath', archivePath,
        'archive',
        ...signingFlags,
    ], iosDir, buildId);
    emitLog(buildId, '✓ Archive complete');

    // Step 3f: Export to .ipa (only if signed)
    if (signingAssets && signingAssets.token) {
        emitLog(buildId, '[BuildCheap] Exporting .ipa...');
        fs.mkdirSync(exportPath, { recursive: true });

        // Generate ExportOptions.plist
        const plistPath = path.join(workDir, 'build', 'ExportOptions.plist');
        const plistContent = generateExportPlist(
            signingAssets.teamId,
            signingAssets.bundleId,
            'app-store'
        );
        fs.writeFileSync(plistPath, plistContent);

        await runCommand('xcodebuild', [
            '-exportArchive',
            '-archivePath', archivePath,
            '-exportPath', exportPath,
            '-exportOptionsPlist', plistPath,
        ], iosDir, buildId);
        emitLog(buildId, '✓ .ipa exported!');
    }
}

// Generate ExportOptions.plist for xcodebuild -exportArchive
function generateExportPlist(teamId, bundleId, method) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>${method}</string>
    <key>teamID</key>
    <string>${teamId}</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>signingStyle</key>
    <string>manual</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>${bundleId}</key>
        <string>BuildCheap_${bundleId.replace(/\./g, '_')}</string>
    </dict>
</dict>
</plist>`;
}

// ----- Artifact Finder -----
function findArtifact(workDir, platform) {
    const extensions = platform === 'ios' ? ['.ipa'] : ['.apk', '.aab'];
    function search(dir) {
        if (!fs.existsSync(dir)) return null;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) return fullPath;
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                const found = search(fullPath);
                if (found) return found;
            }
        }
        return null;
    }
    return search(workDir);
}

function formatDuration(seconds) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function sendStatus() {
    const queuedCount = db.prepare("SELECT COUNT(*) as count FROM builds WHERE status = 'queued'").get().count;
    const activeCount = db.prepare("SELECT COUNT(*) as count FROM builds WHERE status = 'building'").get().count;
    sendToParent('status', { queued: queuedCount, active: activeCount, processing: isProcessing });
}

// ----- Startup -----
console.log('[Worker] Build worker process started (PID:', process.pid, ')');
recoverStalledBuilds();
sendToParent('ready', {});
