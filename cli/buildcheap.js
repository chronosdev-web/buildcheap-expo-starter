#!/usr/bin/env node

// ─────────────────────────────────────────────────
// BuildCheap CLI — Expo-style build workflow
// Usage:
//   buildcheap login
//   buildcheap build --platform ios
//   buildcheap build --platform ios --project <id>
//   buildcheap projects
//   buildcheap upload --project <id>
// ─────────────────────────────────────────────────

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import readline from 'readline';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// ── Config ──────────────────────────────────────
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.buildcheap.json');
const DEFAULT_SERVER = 'https://buildcheap.dev';
const VERSION = '1.0.0';

// Default ignore patterns (like .easignore / .gitignore)
const DEFAULT_IGNORE = [
    'node_modules', '.git', '.expo', 'dist', 'build',
    '.DS_Store', 'Thumbs.db', '*.log', '.env', '.env.local',
    'ios/Pods', 'android/.gradle', 'android/app/build',
    '__pycache__', '.next', '.nuxt', 'coverage',
];

// ── Helpers ─────────────────────────────────────
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

function log(msg) { console.log(msg); }
function info(msg) { log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`); }
function success(msg) { log(`${COLORS.green}✔${COLORS.reset} ${msg}`); }
function warn(msg) { log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`); }
function error(msg) { log(`${COLORS.red}✖${COLORS.reset} ${msg}`); }
function bold(msg) { return `${COLORS.bright}${msg}${COLORS.reset}`; }
function dim(msg) { return `${COLORS.dim}${msg}${COLORS.reset}`; }

function banner() {
    log('');
    log(`${COLORS.cyan}${COLORS.bright}  ╔══════════════════════════════════╗${COLORS.reset}`);
    log(`${COLORS.cyan}${COLORS.bright}  ║    🚀 BuildCheap CLI v${VERSION}     ║${COLORS.reset}`);
    log(`${COLORS.cyan}${COLORS.bright}  ║    Build native apps cheap.      ║${COLORS.reset}`);
    log(`${COLORS.cyan}${COLORS.bright}  ╚══════════════════════════════════╝${COLORS.reset}`);
    log('');
}

function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function askQuestion(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(prompt, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function askPassword(promptText) {
    return new Promise(resolve => {
        process.stdout.write(promptText);
        if (!process.stdin.isTTY) {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.resume();
            rl.once('line', (line) => {
                rl.close();
                resolve(line.trim());
            });
            return;
        }
        let password = '';
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        const listener = (char) => {
            if (char === '\n' || char === '\r' || char === '\u0004') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', listener);
                process.stdout.write('\n');
                resolve(password);
            } else if (char === '\u0003') {
                process.exit(1);
            } else if (char === '\x08' || char === '\x7f') {
                if (password.length > 0) password = password.slice(0, -1);
            } else {
                password += char;
            }
        };
        process.stdin.on('data', listener);
    });
}

// ── HTTP Client (zero dependencies) ─────────────
function apiRequest(config, method, path, body = null, isStream = false) {
    return new Promise((resolve, reject) => {
        const url = new URL(config.server || DEFAULT_SERVER);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const headers = {};
        if (config.apiKey) headers['x-api-key'] = config.apiKey;

        if (body && !isStream) {
            headers['Content-Type'] = 'application/json';
        }
        if (isStream) {
            headers['Content-Type'] = 'application/gzip';
        }

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: `/api${path}`,
            method,
            headers,
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
                    } else {
                        resolve(parsed);
                    }
                } catch {
                    if (res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    } else {
                        resolve(data);
                    }
                }
            });
        });

        req.on('error', reject);

        if (body && !isStream) {
            req.write(JSON.stringify(body));
        }

        if (isStream && body) {
            body.pipe(req);
            return;
        }

        req.end();
    });
}

function streamUpload(config, projectId, readableStream, contentLength) {
    return new Promise((resolve, reject) => {
        const url = new URL(config.server || DEFAULT_SERVER);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: `/api/projects/${projectId}/upload`,
            method: 'POST',
            headers: {
                'x-api-key': config.apiKey,
                'Content-Type': 'application/gzip',
            },
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
                    } else {
                        resolve(parsed);
                    }
                } catch {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        readableStream.pipe(req);
    });
}

// ── WebSocket Log Streaming (zero dependencies) ──
function streamBuildLogs(config, buildId) {
    return new Promise((resolve) => {
        const url = new URL(config.server || DEFAULT_SERVER);
        const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';

        // We'll use a raw HTTP upgrade since we can't use the `ws` package
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        const key = crypto.randomBytes(16).toString('base64');

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: '/ws',
            method: 'GET',
            headers: {
                'Connection': 'Upgrade',
                'Upgrade': 'websocket',
                'Sec-WebSocket-Version': '13',
                'Sec-WebSocket-Key': key,
            },
        };

        const req = client.request(options);

        req.on('upgrade', (res, socket) => {
            // Send auth
            const authMsg = JSON.stringify({ type: 'auth', token: config.apiKey });
            sendWsFrame(socket, authMsg);

            // Subscribe to build
            const subMsg = JSON.stringify({ type: 'subscribe', buildId });
            sendWsFrame(socket, subMsg);

            socket.on('data', (data) => {
                try {
                    // Parse WebSocket frames (simplified)
                    const frames = parseWsFrames(data);
                    for (const frame of frames) {
                        try {
                            const msg = JSON.parse(frame);
                            if (msg.type === 'log') {
                                process.stdout.write(`${dim('│')} ${msg.line}\n`);
                            } else if (msg.type === 'build_complete') {
                                if (msg.status === 'success') {
                                    success('Build completed successfully!');
                                    if (msg.artifact_url) {
                                        log(`${COLORS.green}📦 Artifact: ${msg.artifact_url}${COLORS.reset}`);
                                    }
                                } else {
                                    error(`Build failed with status: ${msg.status}`);
                                }
                                socket.destroy();
                                resolve(msg);
                            }
                        } catch { }
                    }
                } catch { }
            });

            socket.on('close', () => resolve(null));
            socket.on('error', () => resolve(null));
        });

        req.on('error', (err) => {
            warn(`Could not connect to log stream: ${err.message}`);
            warn('Build is still running. Check the dashboard for status.');
            resolve(null);
        });

        req.end();
    });
}

function sendWsFrame(socket, data) {
    const payload = Buffer.from(data);
    const frame = [];
    frame.push(0x81); // text frame, FIN bit set
    if (payload.length < 126) {
        frame.push(payload.length | 0x80); // masked
    } else if (payload.length < 65536) {
        frame.push(126 | 0x80);
        frame.push((payload.length >> 8) & 0xFF);
        frame.push(payload.length & 0xFF);
    }
    // Add mask key (required for client frames)
    const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    frame.push(...mask);
    // Mask the payload
    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
        masked[i] = payload[i] ^ mask[i % 4];
    }
    socket.write(Buffer.concat([Buffer.from(frame), masked]));
}

function parseWsFrames(data) {
    const frames = [];
    let offset = 0;
    while (offset < data.length) {
        if (offset + 2 > data.length) break;
        const byte2 = data[offset + 1];
        const masked = (byte2 & 0x80) !== 0;
        let payloadLen = byte2 & 0x7F;
        let headerLen = 2;

        if (payloadLen === 126) {
            if (offset + 4 > data.length) break;
            payloadLen = data.readUInt16BE(offset + 2);
            headerLen = 4;
        } else if (payloadLen === 127) {
            headerLen = 10;
            payloadLen = Number(data.readBigUInt64BE(offset + 2));
        }

        if (masked) headerLen += 4;
        if (offset + headerLen + payloadLen > data.length) break;

        let payload;
        if (masked) {
            const mask = data.slice(offset + headerLen - 4, offset + headerLen);
            payload = Buffer.alloc(payloadLen);
            for (let i = 0; i < payloadLen; i++) {
                payload[i] = data[offset + headerLen + i] ^ mask[i % 4];
            }
        } else {
            payload = data.slice(offset + headerLen, offset + headerLen + payloadLen);
        }

        frames.push(payload.toString('utf-8'));
        offset += headerLen + payloadLen;
    }
    return frames;
}

// ── Project Compression ─────────────────────────
function compressProject(projectDir) {
    info('Compressing project...');

    // Read .easignore, .buildcheapignore, or .gitignore for ignore patterns
    let ignorePatterns = [...DEFAULT_IGNORE];
    for (const ignoreFile of ['.buildcheapignore', '.easignore', '.gitignore']) {
        const ignorePath = path.join(projectDir, ignoreFile);
        if (fs.existsSync(ignorePath)) {
            const lines = fs.readFileSync(ignorePath, 'utf-8').split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#'));
            ignorePatterns = [...ignorePatterns, ...lines];
            info(`Using ignore patterns from ${ignoreFile}`);
            break;
        }
    }

    // Create tar.gz using the system tar command (available on macOS/Linux)
    const excludeArgs = ignorePatterns
        .filter(p => !p.includes('*')) // tar doesn't handle globs the same way
        .map(p => `--exclude='${p}'`)
        .join(' ');

    const tmpFile = path.join(os.tmpdir(), `buildcheap-upload-${Date.now()}.tar.gz`);

    try {
        execSync(
            `tar -czf "${tmpFile}" ${excludeArgs} -C "${projectDir}" .`,
            { stdio: 'pipe', maxBuffer: 1024 * 1024 * 100 }
        );
    } catch (err) {
        throw new Error(`Failed to compress project: ${err.stderr?.toString() || err.message}`);
    }

    const stats = fs.statSync(tmpFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    success(`Compressed to ${sizeMB}MB`);

    return tmpFile;
}

// ── Commands ────────────────────────────────────

async function cmdLogin() {
    banner();
    log(bold('  Log in to BuildCheap\n'));

    const email = await askQuestion(`  ${COLORS.cyan}Email${COLORS.reset}: `);
    if (!email) { error('Email is required'); process.exit(1); }

    const password = await askPassword(`  ${COLORS.cyan}Password${COLORS.reset}: `);
    if (!password) { error('Password is required'); process.exit(1); }

    info('Verifying credentials...');
    const tempConfig = { server: DEFAULT_SERVER };

    try {
        const data = await apiRequest(tempConfig, 'POST', '/auth/login', { email, password });

        if (!data.user.api_key) {
            throw new Error('API Key missing from server response. Generate one in the dashboard first.');
        }

        const config = { server: DEFAULT_SERVER, apiKey: data.user.api_key };
        saveConfig(config);
        log('');
        success(`Logged in as ${bold(data.user.display_name || data.user.email)}`);
        info(`Config saved to ${dim(CONFIG_FILE)}`);
    } catch (err) {
        error(`Login failed: ${err.message}`);
        process.exit(1);
    }
}

async function cmdProjects() {
    const config = loadConfig();
    if (!config.server || !config.apiKey) {
        error('Not logged in. Run: buildcheap login');
        process.exit(1);
    }

    banner();
    info('Fetching projects...\n');

    try {
        const data = await apiRequest(config, 'GET', '/projects');
        if (!data.projects || data.projects.length === 0) {
            warn('No projects found. Create one on the dashboard or use: buildcheap init');
            return;
        }

        log(bold('  Your Projects:\n'));
        for (const p of data.projects) {
            log(`  ${COLORS.cyan}${p.name}${COLORS.reset}`);
            log(`    ID: ${dim(p.id)}`);
            log(`    Platform: ${p.platform || 'both'}`);
            log(`    Repo: ${p.repo_url ? dim(p.repo_url) : dim('(no repo — use upload)')}`);
            log('');
        }
    } catch (err) {
        error(`Failed to fetch projects: ${err.message}`);
    }
}

async function cmdBuild(args) {
    const config = loadConfig();
    if (!config.server || !config.apiKey) {
        error('Not logged in. Run: buildcheap login');
        process.exit(1);
    }

    banner();

    const platform = args.platform || 'ios';
    let projectId = args.project;

    // If no project ID specified, try to read from .buildcheap.json in current dir
    if (!projectId) {
        const localConfig = path.join(process.cwd(), 'buildcheap.json');
        if (fs.existsSync(localConfig)) {
            try {
                const lc = JSON.parse(fs.readFileSync(localConfig, 'utf-8'));
                projectId = lc.project_id;
                info(`Using project from local buildcheap.json: ${dim(projectId)}`);
            } catch { }
        }
    }

    // If still no project, list them and ask
    if (!projectId) {
        try {
            const data = await apiRequest(config, 'GET', '/projects');
            if (!data.projects || data.projects.length === 0) {
                error('No projects found. Create one on the dashboard first.');
                process.exit(1);
            }

            log(bold('  Select a project:\n'));
            data.projects.forEach((p, i) => {
                log(`  ${COLORS.cyan}[${i + 1}]${COLORS.reset} ${p.name} ${dim(`(${p.id.slice(0, 8)}...)`)}`);
            });
            log('');

            const choice = await askQuestion(`  Enter number (1-${data.projects.length}): `);
            const idx = parseInt(choice) - 1;
            if (idx < 0 || idx >= data.projects.length) {
                error('Invalid selection');
                process.exit(1);
            }
            projectId = data.projects[idx].id;

            // Save for future runs
            const saveLocal = await askQuestion(`  Save to buildcheap.json for future runs? (y/n): `);
            if (saveLocal.toLowerCase() === 'y') {
                fs.writeFileSync(
                    path.join(process.cwd(), 'buildcheap.json'),
                    JSON.stringify({ project_id: projectId }, null, 2)
                );
                success('Saved project config to buildcheap.json');
            }
        } catch (err) {
            error(`Failed to list projects: ${err.message}`);
            process.exit(1);
        }
    }

    log('');
    log(`${COLORS.magenta}${COLORS.bright}  ── Build Pipeline ──${COLORS.reset}`);
    log('');

    // Step 1: Compress & Upload
    info(`Platform: ${bold(platform)}`);
    info(`Project: ${dim(projectId)}`);
    log('');

    const projectDir = process.cwd();
    let archivePath;

    try {
        archivePath = compressProject(projectDir);
    } catch (err) {
        error(err.message);
        process.exit(1);
    }

    // Step 2: Upload
    info('Uploading to BuildCheap...');
    try {
        const fileStream = fs.createReadStream(archivePath);
        const result = await streamUpload(config, projectId, fileStream);
        success(`Upload complete! ${result.files} files extracted on server.`);
    } catch (err) {
        error(`Upload failed: ${err.message}`);
        fs.unlinkSync(archivePath);
        process.exit(1);
    }

    // Clean up archive
    fs.unlinkSync(archivePath);

    // Step 3: Trigger build
    log('');
    info('Triggering build...');
    try {
        const buildResult = await apiRequest(config, 'POST', '/builds', {
            project_id: projectId,
            platform,
            commit_hash: 'upload',
            commit_message: 'CLI upload build',
        });
        success(`Build queued! ${dim(buildResult.message || '')}`);
    } catch (err) {
        error(`Failed to trigger build: ${err.message}`);
        process.exit(1);
    }

    // Step 4: Stream logs
    log('');
    log(`${COLORS.cyan}${COLORS.bright}  ── Build Logs ──${COLORS.reset}`);
    log('');

    // Poll for the build ID from the builds list
    info('Waiting for build to start...');
    let buildId = null;
    for (let i = 0; i < 15; i++) {
        try {
            const buildsData = await apiRequest(config, 'GET', '/builds?limit=1&offset=0');
            if (buildsData.builds && buildsData.builds.length > 0) {
                const latest = buildsData.builds[0];
                if (latest.project_id === projectId) {
                    buildId = latest.id;
                    break;
                }
            }
        } catch { }
        await new Promise(r => setTimeout(r, 2000));
    }

    if (!buildId) {
        warn('Could not find build ID to stream logs.');
        warn('Check the BuildCheap dashboard for build status.');
        process.exit(0);
    }

    info(`Build ID: ${dim(buildId)}`);
    log('');

    // Poll build status and logs (simpler than WebSocket, works everywhere)
    let lastLogLength = 0;
    let pollCount = 0;
    const MAX_POLLS = 600; // 10 minutes at 1s intervals

    while (pollCount < MAX_POLLS) {
        try {
            const buildData = await apiRequest(config, 'GET', `/builds/${buildId}`);
            const build = buildData.build || buildData;

            // Get logs
            try {
                const logData = await apiRequest(config, 'GET', `/builds/${buildId}/log`);
                const logText = logData.log || logData.logs || '';
                if (typeof logText === 'string' && logText.length > lastLogLength) {
                    const newLines = logText.slice(lastLogLength);
                    process.stdout.write(newLines);
                    lastLogLength = logText.length;
                } else if (Array.isArray(logText)) {
                    const lines = logText.slice(lastLogLength);
                    for (const line of lines) {
                        process.stdout.write(`${dim('│')} ${line}\n`);
                    }
                    lastLogLength = logText.length;
                }
            } catch { }

            if (build.status === 'success') {
                log('');
                success(`Build #${build.build_number} completed successfully! ✨`);
                if (build.artifact_url) {
                    log(`  ${COLORS.green}📦 Download: ${config.server}${build.artifact_url}${COLORS.reset}`);
                }
                process.exit(0);
            } else if (build.status === 'error' || build.status === 'failed') {
                log('');
                error(`Build #${build.build_number} failed.`);
                process.exit(1);
            }
        } catch { }

        await new Promise(r => setTimeout(r, 1000));
        pollCount++;
    }

    warn('Build timed out waiting for completion. Check the dashboard.');
}

async function cmdInit() {
    const config = loadConfig();
    if (!config.server || !config.apiKey) {
        error('Not logged in. Run: buildcheap login');
        process.exit(1);
    }

    banner();
    log(bold('  Initialize BuildCheap in this project\n'));

    const name = await askQuestion(`  ${COLORS.cyan}Project name${COLORS.reset}: `);
    if (!name) { error('Project name is required'); process.exit(1); }

    const bundle_id = await askQuestion(`  ${COLORS.cyan}Bundle ID${COLORS.reset} (e.g. com.company.app): `);

    info('Creating project on BuildCheap...');
    try {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const result = await apiRequest(config, 'POST', '/projects', {
            name,
            slug,
            bundle_id: bundle_id || null,
            platform: 'ios',
        });

        const projectId = result.project?.id || result.id;
        fs.writeFileSync(
            path.join(process.cwd(), 'buildcheap.json'),
            JSON.stringify({ project_id: projectId, name }, null, 2)
        );

        log('');
        success(`Project "${name}" created!`);
        info(`Saved config to ${dim('buildcheap.json')}`);
        log('');
        log(`  Next steps:`);
        log(`    ${COLORS.cyan}buildcheap build --platform ios${COLORS.reset}`);
        log('');
    } catch (err) {
        error(`Failed to create project: ${err.message}`);
        process.exit(1);
    }
}

async function cmdCredentials() {
    const config = loadConfig();
    if (!config.server || !config.apiKey) {
        error('Not logged in. Run: buildcheap login');
        process.exit(1);
    }

    banner();
    log(bold('  Connect App Store Connect\n'));

    // Auto-search for .p8 files
    const home = os.homedir();
    const searchDirs = [
        path.join(home, 'Downloads'),
        path.join(home, 'Desktop'),
        home,
        process.cwd(),
    ];

    const found = [];
    for (const dir of searchDirs) {
        try {
            const files = fs.readdirSync(dir);
            for (const f of files) {
                if (f.startsWith('AuthKey_') && f.endsWith('.p8')) {
                    const full = path.join(dir, f);
                    if (!found.some(x => x.path === full)) {
                        const keyId = f.replace('AuthKey_', '').replace('.p8', '');
                        found.push({ path: full, filename: f, keyId });
                    }
                }
            }
        } catch (_) { }
    }

    let selectedPath;
    let autoKeyId;

    if (found.length > 0) {
        log(`  ${COLORS.green}Found ${found.length} .p8 file${found.length > 1 ? 's' : ''} on your machine:${COLORS.reset}\n`);
        found.forEach((f, i) => {
            log(`    ${COLORS.cyan}[${i + 1}]${COLORS.reset} ${f.filename}  ${dim(`(${f.path})`)}`);
        });
        log(`    ${COLORS.cyan}[0]${COLORS.reset} Enter a path manually`);
        log('');

        const choice = await askQuestion(`  ${COLORS.cyan}Select a key${COLORS.reset} [1${found.length > 1 ? `-${found.length}` : ''} or 0]: `);
        const idx = parseInt(choice, 10);

        if (idx >= 1 && idx <= found.length) {
            selectedPath = found[idx - 1].path;
            autoKeyId = found[idx - 1].keyId;
            success(`Selected: ${found[idx - 1].filename}`);
        } else {
            const manual = await askQuestion(`  ${COLORS.cyan}Path to .p8 file${COLORS.reset}: `);
            if (!manual) { error('.p8 file path is required'); process.exit(1); }
            selectedPath = path.resolve(manual.trim());
        }
    } else {
        log(dim('  No .p8 files found in Downloads, Desktop, or home directory.\n'));
        const manual = await askQuestion(`  ${COLORS.cyan}Path to .p8 file${COLORS.reset}: `);
        if (!manual) { error('.p8 file path is required'); process.exit(1); }
        selectedPath = path.resolve(manual.trim());
    }

    if (!fs.existsSync(selectedPath)) {
        error(`File not found: ${selectedPath}`);
        process.exit(1);
    }

    const p8Key = fs.readFileSync(selectedPath, 'utf-8');
    if (!p8Key.includes('BEGIN PRIVATE KEY')) {
        error('This does not look like a valid .p8 private key file.');
        process.exit(1);
    }

    log('');
    const issuerId = await askQuestion(`  ${COLORS.cyan}Issuer ID${COLORS.reset}: `);
    if (!issuerId) { error('Issuer ID is required'); process.exit(1); }

    let finalKeyId;
    if (autoKeyId) {
        finalKeyId = autoKeyId;
        info(`Key ID: ${autoKeyId} (from filename)`);
    } else {
        const keyId = await askQuestion(`  ${COLORS.cyan}Key ID${COLORS.reset}: `);
        finalKeyId = keyId.trim();
        if (!finalKeyId) { error('Key ID is required'); process.exit(1); }
    }

    const teamId = await askQuestion(`  ${COLORS.cyan}Team ID${COLORS.reset} (optional, press Enter to skip): `);

    info('Saving Apple credentials...');
    try {
        await apiRequest(config, 'POST', '/credentials/apple', {
            issuer_id: issuerId.trim(),
            key_id: finalKeyId,
            team_id: teamId ? teamId.trim() : '',
            p8_key: p8Key,
        });
        log('');
        success('App Store Connect credentials saved!');
        log(`  Your builds will now be signed and uploaded to TestFlight automatically.`);
        log('');
    } catch (err) {
        error(`Failed to save credentials: ${err.message}`);
        process.exit(1);
    }
}

async function cmdSecrets(args) {
    const config = loadConfig();
    if (!config.server || !config.apiKey) {
        error('Not logged in. Run: buildcheap login');
        process.exit(1);
    }

    // Resolve project ID
    let projectId = args.project;
    if (!projectId) {
        const localConfig = path.join(process.cwd(), 'buildcheap.json');
        if (fs.existsSync(localConfig)) {
            try {
                const lc = JSON.parse(fs.readFileSync(localConfig, 'utf-8'));
                projectId = lc.project_id;
            } catch { }
        }
    }

    if (!projectId) {
        // Interactive: let user pick a project
        try {
            const data = await apiRequest(config, 'GET', '/projects');
            if (!data.projects || data.projects.length === 0) {
                error('No projects found. Create one first: buildcheap init');
                process.exit(1);
            }
            log('');
            log(bold('  Select a project:\n'));
            data.projects.forEach((p, i) => {
                log(`  ${COLORS.cyan}[${i + 1}]${COLORS.reset} ${p.name} ${dim(`(${p.id.slice(0, 8)}...)`)}`);
            });
            log('');
            const choice = await askQuestion(`  Enter number (1-${data.projects.length}): `);
            const idx = parseInt(choice) - 1;
            if (idx < 0 || idx >= data.projects.length) {
                error('Invalid selection');
                process.exit(1);
            }
            projectId = data.projects[idx].id;
        } catch (err) {
            error(`Failed to list projects: ${err.message}`);
            process.exit(1);
        }
    }

    const subCommand = args._[1]; // set, rm/remove/delete, or undefined (list)

    if (subCommand === 'set' || subCommand === 'add') {
        // buildcheap secrets set KEY VALUE
        const keyName = args._[2];
        const value = args._[3];

        if (!keyName || !value) {
            banner();
            log(bold('  Usage:\n'));
            log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} KEY VALUE`);
            log('');
            log(bold('  Examples:\n'));
            log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} APP_NAME MyApp`);
            log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} APP_VERSION 1.0.1`);
            log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} REVENUECAT_API_KEY appl_xxxxxxxxxxx`);
            log('');
            process.exit(1);
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(keyName)) {
            error(`Invalid variable name: "${keyName}". Use UPPER_CASE with underscores (e.g. APP_NAME).`);
            process.exit(1);
        }

        try {
            await apiRequest(config, 'POST', `/projects/${projectId}/secrets`, {
                key_name: keyName,
                value: value,
            });
            success(`Secret ${bold(keyName)} saved! It will be injected into your next build.`);
        } catch (err) {
            error(`Failed to save secret: ${err.message}`);
            process.exit(1);
        }

    } else if (subCommand === 'rm' || subCommand === 'remove' || subCommand === 'delete') {
        // buildcheap secrets rm KEY
        const keyName = args._[2];
        if (!keyName) {
            error('Usage: buildcheap secrets rm KEY_NAME');
            process.exit(1);
        }

        try {
            const data = await apiRequest(config, 'GET', `/projects/${projectId}/secrets`);
            const secret = (data.secrets || []).find(s => s.key_name === keyName);
            if (!secret) {
                error(`Secret "${keyName}" not found.`);
                const existing = (data.secrets || []).map(s => s.key_name);
                if (existing.length > 0) {
                    info(`Existing secrets: ${existing.join(', ')}`);
                }
                process.exit(1);
            }
            await apiRequest(config, 'DELETE', `/projects/${projectId}/secrets/${secret.id}`);
            success(`Secret ${bold(keyName)} removed.`);
        } catch (err) {
            error(`Failed to delete secret: ${err.message}`);
            process.exit(1);
        }

    } else {
        // Default: list all secrets
        banner();
        log(bold('  Environment Secrets\n'));

        try {
            const data = await apiRequest(config, 'GET', `/projects/${projectId}/secrets`);
            const secrets = data.secrets || [];

            if (secrets.length === 0) {
                log(dim('  No secrets configured for this project.\n'));
                log(`  Add one with: ${COLORS.cyan}buildcheap secrets set KEY VALUE${COLORS.reset}`);
                log('');
                log(bold('  Common variables:\n'));
                log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} APP_NAME      ${dim('Your app display name')}`);
                log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} APP_VERSION   ${dim('Version (e.g. 1.0.1)')}`);
                log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} APP_SLUG      ${dim('URL-safe name (e.g. my-app)')}`);
                log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} REVENUECAT_API_KEY  ${dim('IAP service key')}`);
                log('');
            } else {
                log(`  ${dim('KEY')}${' '.repeat(28)}${dim('STATUS')}`);
                log(`  ${'─'.repeat(45)}`);
                for (const s of secrets) {
                    const padding = ' '.repeat(Math.max(1, 30 - s.key_name.length));
                    log(`  ${COLORS.cyan}${s.key_name}${COLORS.reset}${padding}${COLORS.green}● encrypted${COLORS.reset}`);
                }
                log('');
                log(`  ${dim(`${secrets.length} secret(s) configured. These will be injected at build time.`)}`);
                log('');
            }
        } catch (err) {
            error(`Failed to fetch secrets: ${err.message}`);
            process.exit(1);
        }
    }
}

// ── CLI Entry ───────────────────────────────────
function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].slice(2);
            const next = argv[i + 1];
            if (next && !next.startsWith('--')) {
                args[key] = next;
                i++;
            } else {
                args[key] = true;
            }
        } else {
            args._.push(argv[i]);
        }
    }
    return args;
}

function printHelp() {
    banner();
    log(bold('  Commands:\n'));
    log(`    ${COLORS.cyan}login${COLORS.reset}       Log in to your BuildCheap server`);
    log(`    ${COLORS.cyan}init${COLORS.reset}        Initialize a project in this directory`);
    log(`    ${COLORS.cyan}projects${COLORS.reset}    List your projects`);
    log(`    ${COLORS.cyan}build${COLORS.reset}       Compress, upload, and build your project`);
    log(`    ${COLORS.cyan}secrets${COLORS.reset}     Manage environment variables for your project`);
    log(`    ${COLORS.cyan}credentials${COLORS.reset} Connect your App Store Connect API key`);
    log('');
    log(bold('  Secrets:\n'));
    log(`    ${COLORS.cyan}buildcheap secrets${COLORS.reset}                  List all secrets`);
    log(`    ${COLORS.cyan}buildcheap secrets set${COLORS.reset} KEY VALUE   Add or update a secret`);
    log(`    ${COLORS.cyan}buildcheap secrets rm${COLORS.reset} KEY          Remove a secret`);
    log('');
    log(bold('  Build Options:\n'));
    log(`    ${dim('--platform')} ios|android    Target platform (default: ios)`);
    log(`    ${dim('--project')}  <id>           Project ID (or use buildcheap.json)`);
    log('');
    log(bold('  Workflow:\n'));
    log(`    ${dim('1.')} ${COLORS.cyan}buildcheap login${COLORS.reset}                    Connect to your server`);
    log(`    ${dim('2.')} ${COLORS.cyan}buildcheap init${COLORS.reset}                     Create a new project`);
    log(`    ${dim('3.')} ${COLORS.cyan}buildcheap secrets set${COLORS.reset} APP_NAME MyApp  Configure your build`);
    log(`    ${dim('4.')} ${COLORS.cyan}buildcheap build --platform ios${COLORS.reset}     Ship it!`);
    log('');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const command = args._[0];

    switch (command) {
        case 'login':
            await cmdLogin();
            break;
        case 'projects':
        case 'list':
            await cmdProjects();
            break;
        case 'build':
            await cmdBuild(args);
            break;
        case 'init':
            await cmdInit();
            break;
        case 'credentials':
        case 'creds':
            await cmdCredentials();
            break;
        case 'secrets':
        case 'env':
            await cmdSecrets(args);
            break;
        case 'help':
        case '--help':
        case '-h':
            printHelp();
            break;
        case 'version':
        case '--version':
        case '-v':
            log(`BuildCheap CLI v${VERSION}`);
            break;
        default:
            printHelp();
    }
}

main().catch(err => {
    error(err.message);
    process.exit(1);
});
