// BuildCheap — Build Worker (Isolated Process)
// This runs as a separate Node.js process via child_process.fork()
// Communicates with the main server via IPC messages
import 'dotenv/config';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Import database directly — each process gets its own connection
import db, { queries, deductCreditAndCreateBuild, refundBuildCredit } from './db.js';

const COST_PER_BUILD = parseFloat(process.env.COST_PER_BUILD || '0.50');
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || './artifacts';

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
        if (user.credit_balance < COST_PER_BUILD) {
            throw new Error('Insufficient credits. Please purchase more credits to continue building.');
        }

        const buildNumber = queries.getNextBuildNumber.get(projectId).next;
        const buildId = crypto.randomUUID();

        // Atomic: deduct credit + create build record (persisted in SQLite)
        deductCreditAndCreateBuild(
            userId, buildId, projectId, buildNumber,
            platform, commitHash || 'HEAD', commitMessage || 'Manual build'
        );

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

        // Step 3: Run EAS build
        emitLog(build.id, `[BuildCheap] Running EAS build (${build.platform})...`);

        if (build.platform === 'ios' && process.env.IOS_BUILD_HOST && process.env.IOS_BUILD_HOST !== 'localhost') {
            emitLog(build.id, `[BuildCheap] Routing iOS build to macOS: ${process.env.IOS_BUILD_HOST}`);
            await runRemoteBuild(build.id, workDir, build.platform);
        } else {
            await runCommand('npx', ['eas-cli', 'build', '--local', '--platform', build.platform, '--non-interactive'], workDir, build.id);
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

// ----- Remote Mac Build via SSH -----
async function runRemoteBuild(buildId, workDir, platform) {
    const host = process.env.IOS_BUILD_HOST;
    const user = process.env.IOS_BUILD_USER || 'build';
    const sshKey = process.env.IOS_BUILD_SSH_KEY;
    const remotePath = `/tmp/buildcheap/${buildId}`;
    const sshArgs = sshKey ? ['-i', sshKey] : [];

    emitLog(buildId, `[BuildCheap] SSH to ${user}@${host}...`);

    await runCommand('rsync', [
        '-avz', '--delete', '-e', `ssh ${sshArgs.join(' ')} -o StrictHostKeyChecking=no`,
        `${workDir}/`, `${user}@${host}:${remotePath}/`
    ], workDir, buildId);

    await runCommand('ssh', [
        ...sshArgs, '-o', 'StrictHostKeyChecking=no', `${user}@${host}`,
        `cd ${remotePath} && npx eas-cli build --local --platform ${platform} --non-interactive`
    ], workDir, buildId);

    await runCommand('rsync', [
        '-avz', '-e', `ssh ${sshArgs.join(' ')} -o StrictHostKeyChecking=no`,
        `${user}@${host}:${remotePath}/`, `${workDir}/`
    ], workDir, buildId);
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
