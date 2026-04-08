// BuildCheap — Build Worker (Isolated Process)
// This runs as a separate Node.js process via child_process.fork()
// Communicates with the main server via IPC messages
import 'dotenv/config';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Import database directly — each process gets its own connection
import db, { queries, deductCreditAndCreateBuild, refundBuildCredit } from './db.js';
import { provisionSigningAssets, completeProvisioning, decryptKey } from './apple-api.js';

const COST_PER_BUILD = parseFloat(process.env.COST_PER_BUILD || '0.50');
const ARTIFACTS_DIR = path.resolve(process.env.ARTIFACTS_DIR || './artifacts');
const ADMIN_EMAILS = [
    ...(process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
    'guy@example.com',
    'myonlyfriendischatgpt@gmail.com',
    'guy_test@test.com'
];

// Track active build sandboxes for guaranteed cleanup
const activeSandboxes = new Map();

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
                platform, commitHash || 'HEAD', commitMessage || 'Manual build', COST_PER_BUILD
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
        `SELECT b.*, p.name as project_name, p.repo_url, p.bundle_id
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
    emitLog(build.id, `[BuildCheap] Tenant: ${build.user_id.slice(0, 8)}...`);

    // Update status to building
    db.prepare('UPDATE builds SET status = ?, started_at = ? WHERE id = ?')
        .run('building', new Date().toISOString(), build.id);

    sendToParent('build_started', { buildId: build.id });

    try {
        // Step 0: Set up sandbox — isolated HOME + temp directory per build
        const workDir = path.join(ARTIFACTS_DIR, 'work', build.id);
        const sandboxHome = path.join(workDir, '.sandbox_home');
        fs.mkdirSync(workDir, { recursive: true });

        // Restrict work directory permissions (owner only)
        try { fs.chmodSync(workDir, 0o700); } catch (_) { }

        // Store sandbox info for keychain cleanup later
        const secretRows = queries.getDecryptedSecrets.all(build.project_id);
        const projectSecrets = {};
        for (const row of secretRows) {
            try { projectSecrets[row.key_name] = decryptKey(row.value_encrypted, row.iv, row.auth_tag); }
            catch (err) { emitLog(build.id, `⚠ Failed to decrypt secret: ${row.key_name}`); }
        }

        activeSandboxes.set(build.id, { workDir, sandboxHome, projectSecrets });
        emitLog(build.id, `[BuildCheap] Sandbox created: ${build.id.slice(0, 8)}...`);

        // Step 1: Clone repository

        if (build.repo_url) {
            emitLog(build.id, `[BuildCheap] Cloning ${build.repo_url}...`);

            // Inject GitHub PAT for private repositories
            const user = db.prepare('SELECT github_token FROM users WHERE id = ?').get(build.user_id);
            let cloneUrl = build.repo_url;
            if (user?.github_token && cloneUrl.startsWith('https://github.com/')) {
                cloneUrl = cloneUrl.replace('https://github.com/', `https://git:${user.github_token}@github.com/`);
            }

            try {
                const repoTemp = 'source_repo';
                await runCommand('git', ['clone', '--depth', '1', cloneUrl, repoTemp], workDir, build.id);
                const repoPath = path.join(workDir, repoTemp);
                for (const file of fs.readdirSync(repoPath)) {
                    fs.renameSync(path.join(repoPath, file), path.join(workDir, file));
                }
                fs.rmdirSync(repoPath);
            } catch (cloneErr) {
                if (user?.github_token) {
                    cloneErr.message = cloneErr.message.replaceAll(user.github_token, '[REDACTED_GITHUB_TOKEN]');
                }
                throw cloneErr;
            }
            emitLog(build.id, '✓ Repository cloned');
        } else {
            emitLog(build.id, '⚠ No repository URL configured — using uploaded project files');
        }

        // Ensure sandbox home exists AFTER clone
        fs.mkdirSync(sandboxHome, { recursive: true });

        // Step 2: Install dependencies
        emitLog(build.id, '[BuildCheap] Installing dependencies...');
        await runCommand('yarn', ['install', '--ignore-scripts'], workDir, build.id);

        const stripePatchPath = path.join(workDir, 'node_modules/@stripe/stripe-react-native/ios/StripeSwiftInterop.h');
        if (fs.existsSync(stripePatchPath)) {
            emitLog(build.id, '[BuildCheap] Applying Xcode 16 Swift ABI patch to Stripe SDK...');
            let content = fs.readFileSync(stripePatchPath, 'utf8');
            content = content.replace('NS_ENUM(NSUInteger, STPPaymentStatus)', 'NS_ENUM(NSInteger, STPPaymentStatus)');
            fs.writeFileSync(stripePatchPath, content);
        }

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
            artifactUrl = `/api/artifacts/${build.id}/${path.basename(artifactPath)}`;
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
        dispatchWebhooks(build.id, 'success', duration);

        // Cleanup work directory
        fs.rmSync(workDir, { recursive: true, force: true });

    } catch (err) {
        const duration = Math.round((Date.now() - startTime) / 1000);

        let rootCause = err.message;
        const currentLogs = buildLogs.get(build.id) || [];

        // Root Cause Analysis: Scan backwards through logs to find the exact React Native/Metro crash
        for (let i = currentLogs.length - 1; i >= 0; i--) {
            const line = currentLogs[i];
            if (line.includes('SyntaxError:') || line.includes('Module not found') || line.includes("Error: Can't resolve") || (line.includes('error:') && !line.includes('Command failed'))) {
                if (!line.includes('warning:') && !line.includes('note:')) {
                    // Prepend the exact code crash to the generic xcodebuild exit code
                    rootCause = `🚨 ${line.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/, '').trim()}\n\n(Triggered: ${err.message})`;
                    break;
                }
            }
        }

        emitLog(build.id, `❌ Build failed: ${err.message}`);
        if (rootCause !== err.message) emitLog(build.id, `[BuildCheap RCA] Isolated root cause: ${rootCause.split('\\n')[0]}`);

        const log = currentLogs.join('\n') || '';
        db.prepare(`
      UPDATE builds SET status = 'error', completed_at = ?, duration_seconds = ?,
      log = ?, error_message = ? WHERE id = ?
    `).run(new Date().toISOString(), duration, log, rootCause, build.id);

        sendToParent('build_complete', { buildId: build.id, status: 'error' });
        dispatchWebhooks(build.id, 'error', duration);

        // Cleanup
        const workDir = path.join(ARTIFACTS_DIR, 'work', build.id);
        if (fs.existsSync(workDir)) {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
    } finally {
        // ALWAYS clean up sandbox resources (keychain, temp dirs)
        await cleanupBuildSandbox(build.id);
    }

    // Clean up in-memory logs after a delay
    setTimeout(() => buildLogs.delete(build.id), 60000);
}

// ----- Sandbox Cleanup -----
// Guarantees removal of per-build keychains and temp directories
async function cleanupBuildSandbox(buildId) {
    const sandbox = activeSandboxes.get(buildId);
    if (!sandbox) return;

    try {
        // Remove per-build keychain if it exists
        const keychainPath = path.join(sandbox.workDir, '.signing', 'build.keychain-db');
        if (fs.existsSync(keychainPath)) {
            try {
                // Remove keychain from search list and delete it
                const { execSync } = await import('child_process');
                execSync(`security delete-keychain "${keychainPath}" 2>/dev/null || true`);
            } catch (_) { }
        }

        // Remove provisioning profiles installed for this build
        const profilesDir = path.join(process.env.HOME || '/Users/administrator', 'Library/MobileDevice/Provisioning Profiles');
        if (fs.existsSync(profilesDir)) {
            const profiles = fs.readdirSync(profilesDir);
            // Only remove profiles created in this build's signing dir
            const signingDir = path.join(sandbox.workDir, '.signing');
            if (fs.existsSync(signingDir) && fs.existsSync(path.join(signingDir, 'profile.mobileprovision'))) {
                // Read the profile to find its UUID and remove the installed copy
                // For now, we don't remove — it gets overwritten on next build
            }
        }

        // Remove sandbox home directory
        if (fs.existsSync(sandbox.sandboxHome)) {
            fs.rmSync(sandbox.sandboxHome, { recursive: true, force: true });
        }
    } catch (err) {
        // Never let cleanup errors break the build pipeline
        console.error(`[Sandbox] Cleanup error for ${buildId}: ${err.message}`);
    } finally {
        activeSandboxes.delete(buildId);
    }
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

// ----- Sandboxed Command Runner -----
// Each build gets its own isolated environment to prevent cross-tenant leaks
function runCommand(cmd, args, cwd, buildId, extraEnv = {}) {
    return new Promise((resolve, reject) => {
        // Build a sandboxed environment:
        // - Include PATH and essential system vars
        // - Load decrypted project secrets dynamically from activeSandbox state
        // - Exclude secrets from other builds
        // - Set CI=1 for build tools
        const sandbox = activeSandboxes.get(buildId) || {};
        const safeEnv = {
            PATH: process.env.PATH,
            HOME: extraEnv.HOME || process.env.HOME,
            ...sandbox.projectSecrets,
            USER: process.env.USER,
            SHELL: process.env.SHELL,
            LANG: process.env.LANG || 'en_US.UTF-8',
            TMPDIR: extraEnv.TMPDIR || process.env.TMPDIR,
            CI: '1',
            DEVELOPER_DIR: process.env.DEVELOPER_DIR || '/Applications/Xcode.app/Contents/Developer',
            ...extraEnv,
        };

        const proc = spawn(cmd, args, {
            cwd,
            env: safeEnv,
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
    const sandboxHome = path.join(workDir, '.sandbox_home');

    // Step 3a: Prebuild native iOS project
    emitLog(buildId, `[BuildCheap] Injecting Build Number (${build.build_number}) into Expo manifest...`);
    const appJsonPath = path.join(workDir, 'app.json');
    if (fs.existsSync(appJsonPath)) {
        try {
            let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
            appJson.expo = appJson.expo || {};

            // Inject Build Number (Guaranteed for App Store Connect)
            appJson.expo.ios = appJson.expo.ios || {};
            appJson.expo.ios.buildNumber = build.build_number.toString();

            appJson.expo.android = appJson.expo.android || {};
            appJson.expo.android.versionCode = build.build_number;

            // Inject Bundle ID if provided
            if (build.bundle_id) {
                emitLog(buildId, `[BuildCheap] Injecting dashboard Bundle ID (${build.bundle_id}) into Expo manifest...`);
                appJson.expo.ios.bundleIdentifier = build.bundle_id;
                appJson.expo.android.package = build.bundle_id;
            }

            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
        } catch (e) {
            emitLog(buildId, `⚠ Failed to inject configuration into app.json: ${e.message}`);
        }
    }

    emitLog(buildId, '[BuildCheap] Running expo prebuild...');
    await runCommand('npx', ['expo', 'prebuild', '--platform', 'ios', '--no-install'], workDir, buildId, { HOME: sandboxHome });
    emitLog(buildId, '✓ Prebuild complete');

    // Detect actual bundle ID from the prebuilt project
    let detectedBundleId = build.bundle_id || 'com.buildcheap.app';
    try {
        const iosDirCheck = path.join(workDir, 'ios');
        const xcodeproj = fs.readdirSync(iosDirCheck).find(f => f.endsWith('.xcodeproj'));
        if (xcodeproj) {
            const pbxPath = path.join(iosDirCheck, xcodeproj, 'project.pbxproj');
            const pbxText = fs.readFileSync(pbxPath, 'utf8');
            const match = pbxText.match(/PRODUCT_BUNDLE_IDENTIFIER = "?([^;"]+)"?;/);
            if (match) {
                detectedBundleId = match[1];
                emitLog(buildId, `[BuildCheap] Detected bundle ID: ${detectedBundleId}`);
            }
        }
    } catch (_) { }

    if (detectedBundleId.startsWith('com.anonymous.')) {
        throw new Error(`Invalid Bundle Identifier: "${detectedBundleId}". Apple strictly rejects placeholder IDs. You must either explicitly declare a "bundleIdentifier" in your local app.json, OR completely bypass it by typing your Apple ID into the "Bundle ID Override" box inside your BuildCheap Project's "Edit Metadata" web dashboard.`);
    }

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
        signingAssets = await provisionSigningAssets(build.user_id, detectedBundleId, workDir);
    } catch (err) {
        emitLog(buildId, `⚠ No Apple credentials found — building unsigned: ${err.message}`);
    }

    let signingFlags;
    let provResult = null;
    if (signingAssets && signingAssets.token) {
        // Generate CSR and provision signing assets
        emitLog(buildId, '[BuildCheap] Provisioning code signing...');
        const persistentKeyDir = path.join(os.homedir(), '.buildcheap_certs');
        fs.mkdirSync(persistentKeyDir, { recursive: true });
        const persistentKeyPath = path.join(persistentKeyDir, `apple_key_${signingAssets.userId}.key`);

        let csrArgs;
        if (fs.existsSync(persistentKeyPath)) {
            emitLog(buildId, '[BuildCheap] Reusing existing Apple distribution private key...');
            fs.copyFileSync(persistentKeyPath, signingAssets.keyPath);
            signingAssets.isNewKey = false;
            csrArgs = [
                'openssl', 'req', '-new', '-key', signingAssets.keyPath,
                '-out', signingAssets.csrPath,
                '-subj', '/CN=BuildCheap Distribution/O=BuildCheap/C=US',
            ];
        } else {
            emitLog(buildId, '[BuildCheap] Generating new Apple distribution private key...');
            signingAssets.isNewKey = true;
            csrArgs = [
                'openssl', 'req', '-new', '-newkey', 'rsa:2048', '-nodes',
                '-keyout', signingAssets.keyPath,
                '-out', signingAssets.csrPath,
                '-subj', '/CN=BuildCheap Distribution/O=BuildCheap/C=US',
            ];
        }
        await runCommand(csrArgs[0], csrArgs.slice(1), workDir, buildId);

        if (signingAssets.isNewKey) {
            fs.copyFileSync(signingAssets.keyPath, persistentKeyPath);
        }

        const csrContent = fs.readFileSync(signingAssets.csrPath, 'utf8');
        provResult = await completeProvisioning(
            signingAssets.token, csrContent,
            signingAssets.bundleId, signingAssets
        );

        // Import cert and profile into keychain
        emitLog(buildId, '[BuildCheap] Installing signing certificate...');
        await runCommand('openssl', [
            'x509', '-inform', 'DER', '-in', signingAssets.certPath,
            '-out', path.join(signingAssets.signingDir, 'dist.pem'),
        ], workDir, buildId, { HOME: sandboxHome });

        // Auto-extract Team ID from the certificate if it wasn't provided in the DB
        let realTeamId = provResult.teamId;
        if (!realTeamId) {
            try {
                const subject = execSync('/usr/bin/openssl x509 -noout -subject -in ' + path.join(signingAssets.signingDir, 'dist.pem'), { encoding: 'utf8', stdio: 'pipe' });
                const match = subject.match(/OU\s*=\s*([A-Z0-9]{10})/);
                if (match) {
                    realTeamId = match[1];
                    emitLog(buildId, `[BuildCheap] Auto-detected Team ID: ${realTeamId}`);
                    provResult.teamId = realTeamId;
                    signingAssets.teamId = realTeamId;
                } else {
                    emitLog(buildId, `⚠ Auto-detect Team ID failed. Subject output was: ${subject.trim()}`);
                }
            } catch (e) {
                emitLog(buildId, `⚠ Failed to extract Team ID from certificate. Err: ${e.message} Stderr: ${e.stderr ? e.stderr.toString() : ''}`);
            }
        }

        // Create p12 from cert + key
        await runCommand('openssl', [
            'pkcs12', '-export',
            '-legacy',
            '-inkey', signingAssets.keyPath,
            '-in', path.join(signingAssets.signingDir, 'dist.pem'),
            '-out', signingAssets.p12Path,
            '-passout', 'pass:buildcheap',
        ], workDir, buildId, { HOME: sandboxHome });

        // Import into temporary keychain (use real HOME so xcodebuild can find it)
        const keychainPath = path.join(signingAssets.signingDir, 'build.keychain-db');
        await runCommand('security', ['create-keychain', '-p', 'buildcheap', keychainPath], workDir, buildId);
        await runCommand('security', ['set-keychain-settings', '-t', '3600', keychainPath], workDir, buildId);
        await runCommand('security', ['unlock-keychain', '-p', 'buildcheap', keychainPath], workDir, buildId);
        await runCommand('security', ['import', signingAssets.p12Path, '-k', keychainPath, '-P', 'buildcheap', '-T', '/usr/bin/codesign'], workDir, buildId);
        await runCommand('security', ['list-keychains', '-d', 'user', '-s', keychainPath, path.join(process.env.HOME || '/Users/administrator', 'Library/Keychains/login.keychain-db')], workDir, buildId);
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
            `CODE_SIGN_STYLE=Manual`,
        ];
    } else {
        emitLog(buildId, '[BuildCheap] Building unsigned (no Apple credentials)...');
        signingFlags = ['CODE_SIGNING_ALLOWED=NO'];
    }

    // Step 3e: Disable automatic code signing if using manual signing
    if (signingAssets && signingAssets.token) {
        emitLog(buildId, '[BuildCheap] Switching Xcode project to manual signing...');
        // Find the .pbxproj file and flip CODE_SIGN_STYLE from Automatic to Manual
        const pbxprojPath = fs.readdirSync(iosDir)
            .find(f => f.endsWith('.xcodeproj'));
        if (pbxprojPath) {
            const projFilePath = path.join(iosDir, pbxprojPath, 'project.pbxproj');
            if (fs.existsSync(projFilePath)) {
                let pbxContent = fs.readFileSync(projFilePath, 'utf8');
                pbxContent = pbxContent.replace(/CODE_SIGN_STYLE = Automatic;/g, 'CODE_SIGN_STYLE = Manual;');
                pbxContent = pbxContent.replace(/ProvisioningStyle = Automatic;/g, 'ProvisioningStyle = Manual;');
                fs.writeFileSync(projFilePath, pbxContent);
                emitLog(buildId, '✓ Switched to manual signing');
            }
        }
    }

    // Step 3f: Archive with xcodebuild
    emitLog(buildId, `[BuildCheap] Compiling with xcodebuild (scheme: ${scheme})...`);
    await runCommand('xcodebuild', [
        '-workspace', workspace,
        '-scheme', scheme,
        '-configuration', 'Release',
        '-sdk', 'iphoneos',
        '-destination', 'generic/platform=iOS',
        '-archivePath', archivePath,
        `CURRENT_PROJECT_VERSION=${build.build_number || 1}`,
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
            'app-store-connect',
            provResult.profileName
        );
        fs.writeFileSync(plistPath, plistContent);

        await runCommand('xcodebuild', [
            '-exportArchive',
            '-archivePath', archivePath,
            '-exportPath', exportPath,
            '-exportOptionsPlist', plistPath,
        ], iosDir, buildId);
        emitLog(buildId, '✓ .ipa exported!');

        // Auto-Submit to App Store Connect
        if (signingAssets.credentials && signingAssets.credentials.keyId) {
            emitLog(buildId, '[BuildCheap] Uploading to App Store Connect...');

            try {
                // Place the .p8 key in workDir/private_keys — the first path altool searches
                const ascKeysDir = path.join(workDir, 'private_keys');
                fs.mkdirSync(ascKeysDir, { recursive: true });

                // Write the securely decrypted .p8 file
                const p8Path = path.join(ascKeysDir, `AuthKey_${signingAssets.credentials.keyId}.p8`);
                fs.writeFileSync(p8Path, signingAssets.credentials.privateKey);

                // Find the exported .ipa
                const ipaFile = fs.readdirSync(exportPath).find(f => f.endsWith('.ipa'));
                if (ipaFile) {
                    const fullIpaPath = path.join(exportPath, ipaFile);
                    await runCommand('xcrun', [
                        'altool', '--upload-app',
                        '-f', fullIpaPath,
                        '-t', 'ios',
                        '--apiKey', signingAssets.credentials.keyId,
                        '--apiIssuer', signingAssets.credentials.issuerId
                    ], workDir, buildId);
                    emitLog(buildId, '✓ Uploaded to App Store Connect successfully!');

                    await pollAppStoreConnectProcessing(
                        signingAssets.credentials.issuerId,
                        signingAssets.credentials.keyId,
                        signingAssets.credentials.privateKey,
                        build.build_number.toString(),
                        buildId
                    );
                } else {
                    emitLog(buildId, '⚠ Failed to find .ipa for upload.');
                }
            } catch (uploadObjError) {
                emitLog(buildId, `⚠ App Store Connect upload failed: ${uploadObjError.message}`);
            }
        }
    }
}

// Generate ExportOptions.plist for xcodebuild -exportArchive
function generateExportPlist(teamId, bundleId, method, profileName) {
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
    <key>signingCertificate</key>
    <string>iPhone Distribution</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>${bundleId}</key>
        <string>${profileName}</string>
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

async function dispatchWebhooks(buildId, status, duration) {
    const build = queries.getBuildById.get(buildId);
    if (!build) return;

    const webhooks = queries.getWebhooksByProjectOwner.all(build.project_id);
    if (!webhooks || webhooks.length === 0) return;

    const payload = {
        event: status === 'success' ? 'build.success' : 'build.failure',
        data: {
            build_id: build.id,
            project_id: build.project_id,
            platform: build.platform,
            status: status,
            duration_seconds: duration
        }
    };

    for (const hook of webhooks) {
        try {
            await fetch(hook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(5000)
            });
        } catch (err) {
            console.error(`[Worker] Failed to dispatch webhook to ${hook.url}:`, err.message);
        }
    }
}

async function pollAppStoreConnectProcessing(issuerId, keyId, privateKey, version, buildId) {
    emitLog(buildId, `[BuildCheap ASC] Apple confirmed binary receipt. Handshaking API to poll background processing status for up to 15 minutes...`);
    const token = jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        expiresIn: '20m',
        issuer: issuerId,
        header: { alg: 'ES256', kid: keyId, typ: 'JWT' }
    });

    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 45000));
        try {
            const res = await fetch(`https://api.appstoreconnect.apple.com/v1/builds?filter[version]=${version}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.data && data.data.length > 0) {
                const state = data.data[0].attributes.processingState;
                if (state === 'VALID') {
                    emitLog(buildId, `✓ App Store Connect Processing verified! Build is fully integrated into TestFlight.`);
                    return;
                } else if (state === 'FAILED' || state === 'INVALID') {
                    throw new Error(`Apple Info.plist Rejection: Your binary dynamically failed ASC native processing (Check your Apple Developer registration inbox for the explicit hardware privacy strings required).`);
                }
                emitLog(buildId, `[BuildCheap ASC] Status payload: ${state}...`);
            } else {
                emitLog(buildId, `[BuildCheap ASC] Status payload: Apple is actively clustering indexing matrices before evaluation...`);
            }
        } catch (e) {
            if (e.message.includes('Apple Info.plist Rejection')) throw e;
        }
    }
    emitLog(buildId, `⚠ App Store Connect API timed out polling after 15 minutes. Check the processing state dynamically from your Apple portal.`);
}

// ----- Startup -----
console.log('[Worker] Build worker process started (PID:', process.pid, ')');
recoverStalledBuilds();
sendToParent('ready', {});
