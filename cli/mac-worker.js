#!/usr/bin/env node

/**
 * BuildCheap — Remote Cloud Build Agent (macOS)
 * 
 * Runs on the user's macOS machine. Polls the GCP API for queued jobs,
 * compiles the iOS app natively using Xcode, and streams logs/artifacts
 * directly back to the cloud.
 */

import 'dotenv/config';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const SERVER_URL = process.env.SERVER_URL || 'https://buildcheap.dev';
const WORKER_API_KEY = process.env.WORKER_API_KEY || 'mac-worker-secret-42';
const ARTIFACTS_DIR = path.resolve(process.env.ARTIFACTS_DIR || './sandbox');
const ASC_BASE = 'https://api.appstoreconnect.apple.com/v1';

// Ensure sandbox directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function withRetry(operationName, fn, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries) {
                console.error(`[Retry] ${operationName} failed permanently after ${maxRetries} attempts: ${error.message}`);
                throw error;
            }
            const delay = 1000 * Math.pow(2, attempt);
            console.warn(`[Retry] ${operationName} failed (Attempt ${attempt}/${maxRetries}). Retrying in ${delay / 1000}s... Error: ${error.message}`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

async function apiFetch(endpoint, method = 'GET', body = null, isFormData = false) {
    return withRetry(`apiFetch ${method} ${endpoint}`, async () => {
        const options = {
            method,
            headers: { 'x-api-key': WORKER_API_KEY }
        };
        if (body) {
            if (isFormData) {
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        const res = await fetch(`${SERVER_URL}${endpoint}`, options);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API Error ${res.status}: ${text}`);
        }
        return res.json();
    });
}

const logQueue = {};
const queueTimer = {};

function streamLog(buildId, line) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logLine = `[${timestamp}] ${line}`;
    console.log(`[Job ${buildId}] ${line}`);

    if (!logQueue[buildId]) logQueue[buildId] = [];
    logQueue[buildId].push(logLine);

    if (!queueTimer[buildId]) {
        queueTimer[buildId] = setTimeout(() => {
            const lines = logQueue[buildId];
            delete logQueue[buildId];
            delete queueTimer[buildId];

            fetch(`${SERVER_URL}/api/worker/jobs/${buildId}/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': WORKER_API_KEY
                },
                body: JSON.stringify({ lines })
            }).catch(() => { });
        }, 500);
    }
}

async function updateStatus(buildId, status, errorMessage = null, durationSeconds = 0) {
    await apiFetch(`/api/worker/jobs/${buildId}/status`, 'POST', {
        status,
        error_message: errorMessage,
        duration_seconds: durationSeconds
    });
}

function runCommand(cmd, args, cwd, buildId, extraEnv = {}) {
    return new Promise((resolve, reject) => {
        const nodePaths = [
            path.dirname(process.execPath),
            '/usr/local/bin',
            '/opt/homebrew/bin',
            '/opt/homebrew/sbin',
            `${process.env.HOME}/.nvm/versions/node/v22.16.0/bin`,
            `${process.env.HOME}/.nvm/versions/node/v20.19.0/bin`,
            `${process.env.HOME}/.nvm/versions/node/v18.20.8/bin`,
            '/usr/bin',
            '/bin',
            '/usr/sbin',
            '/sbin',
        ].join(':');
        const safeEnv = {
            PATH: `${nodePaths}:${process.env.PATH || ''}`,
            HOME: extraEnv.HOME || process.env.HOME,
            USER: process.env.USER,
            SHELL: process.env.SHELL,
            LANG: process.env.LANG || 'en_US.UTF-8',
            DEVELOPER_DIR: process.env.DEVELOPER_DIR || '/Applications/Xcode.app/Contents/Developer',
            CI: '1',
            ...extraEnv,
        };

        // Use /usr/bin/env to force resolving the executable via safeEnv.PATH
        const proc = spawn('/usr/bin/env', [cmd, ...args], { cwd, env: safeEnv, stdio: ['pipe', 'pipe', 'pipe'] });
        proc.stdout.on('data', data => data.toString().split('\n').filter(l => l.trim()).forEach(line => streamLog(buildId, line)));
        proc.stderr.on('data', data => data.toString().split('\n').filter(l => l.trim()).forEach(line => streamLog(buildId, line)));
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`'${cmd}' exited with code ${code}`)));
        proc.on('error', err => reject(new Error(`Failed to start: ${cmd} — ${err.message}`)));
    });
}

/* -------------------------------------------------------------
 * APPLE APP STORE CONNECT API LOGIC
 * ------------------------------------------------------------- */
function generateASCToken(keys) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: keys.issuerId,
        iat: now,
        exp: now + 1200,
        aud: 'appstoreconnect-v1'
    };

    return jwt.sign(payload, keys.privateKey, {
        algorithm: 'ES256',
        header: { alg: 'ES256', kid: keys.keyId, typ: 'JWT' }
    });
}

async function ascFetch(endpoint, token, options = {}) {
    return withRetry(`ascFetch ${endpoint}`, async () => {
        const url = endpoint.startsWith('http') ? endpoint : `${ASC_BASE}${endpoint}`;
        const res = await fetch(url, {
            ...options,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.errors?.[0]?.detail || `Apple API error ${res.status}`);
        return data;
    });
}

async function provisionSigning(token, csrContent, bundleId, isNewKey = false) {
    // 1. Certificate
    const existingCerts = await ascFetch('/certificates?filter[certificateType]=IOS_DISTRIBUTION&limit=200', token);
    const valid = (existingCerts.data || []).filter(c => new Date(c.attributes.expirationDate) > new Date());

    if (isNewKey && valid.length > 0) {
        for (const c of valid) {
            try { await ascFetch(`/certificates/${c.id}`, token, { method: 'DELETE' }); } catch (e) { }
        }
        valid.length = 0; // Clear them so a new one is forced
    }

    let certId;
    if (valid.length > 0) {
        certId = valid[0].id;
    } else {
        const certRes = await ascFetch('/certificates', token, {
            method: 'POST', body: JSON.stringify({ data: { type: 'certificates', attributes: { certificateType: 'IOS_DISTRIBUTION', csrContent } } })
        });
        certId = certRes.data.id;
        valid.push(certRes.data);
    }
    const certContent = valid.find(c => c.id === certId).attributes.certificateContent;

    // 2. Bundle ID
    const existingBundles = await ascFetch('/bundleIds?limit=200', token);
    let bundleIdResourceId = existingBundles.data?.find(b => b.attributes.identifier === bundleId)?.id;
    if (!bundleIdResourceId) {
        const createBundle = await ascFetch('/bundleIds', token, {
            method: 'POST', body: JSON.stringify({ data: { type: 'bundleIds', attributes: { identifier: bundleId, name: bundleId.split('.').pop(), platform: 'IOS' } } })
        });
        bundleIdResourceId = createBundle.data.id;
    }

    // 3. Profile
    const profileName = `BuildCheap ${bundleId} ${Date.now()}`;
    const profileRes = await ascFetch('/profiles', token, {
        method: 'POST', body: JSON.stringify({
            data: { type: 'profiles', attributes: { name: profileName, profileType: 'IOS_APP_STORE' }, relationships: { bundleId: { data: { type: 'bundleIds', id: bundleIdResourceId } }, certificates: { data: [{ type: 'certificates', id: certId }] } } }
        })
    });
    const profileContent = profileRes.data.attributes.profileContent;

    return { certContent, profileContent, profileName, profileUUID: profileRes.data.attributes.uuid };
}

async function uploadIpaToAsc(ipaPath, workDir, buildId, keys) {
    streamLog(buildId, '[BuildCheap ASC] Uploading IPA via altool...');
    const ascKeysDir = path.join(workDir, 'private_keys');
    fs.mkdirSync(ascKeysDir, { recursive: true });

    const p8Path = path.join(ascKeysDir, `AuthKey_${keys.keyId}.p8`);
    fs.writeFileSync(p8Path, keys.privateKey);

    await withRetry('App Store Connect Transporter Upload', async () => {
        await runCommand('xcrun', [
            'altool', '--upload-app',
            '-f', ipaPath,
            '-t', 'ios',
            '--apiKey', keys.keyId,
            '--apiIssuer', keys.issuerId
        ], workDir, buildId);
    }, 4);

    streamLog(buildId, '✓ Uploaded to App Store Connect successfully!');
}

/* -------------------------------------------------------------
 * BUILD EXECUTION
 * ------------------------------------------------------------- */
async function processJob(job) {
    const startTime = Date.now();
    streamLog(job.id, `[Remote Agent] Starting build for Project ${job.project_id}`);

    const workDir = path.join(ARTIFACTS_DIR, job.id);
    const sandboxHome = path.join(workDir, '.home');
    fs.mkdirSync(workDir, { recursive: true });

    try {
        // Step 1: Clone or Download Source
        streamLog(job.id, '[Remote Agent] Fetching source repository...');
        if (job.repo_url && (job.repo_url.startsWith('/') || job.repo_url.startsWith('file://'))) {
            // Download compressed source from API
            streamLog(job.id, 'Downloading local CLI upload from BuildCheap dev server...');
            const res = await fetch(`${SERVER_URL}/api/worker/jobs/${job.id}/source`, {
                headers: { 'x-api-key': WORKER_API_KEY }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download source`);

            const tarPath = path.join(workDir, 'source.tar.gz');
            const dest = fs.createWriteStream(tarPath);
            await pipeline(res.body, dest);

            // Extract tar using local command
            await runCommand('tar', ['-xzf', 'source.tar.gz'], workDir, job.id);
            fs.unlinkSync(tarPath);
            streamLog(job.id, '✓ Code downloaded and extracted');
        } else if (job.repo_url) {
            let cloneUrl = job.repo_url;
            if (job.github_token && cloneUrl && typeof cloneUrl === 'string') cloneUrl = cloneUrl.replace('https://github.com/', `https://git:${job.github_token}@github.com/`);

            await runCommand('git', ['clone', '--depth', '1', cloneUrl, '.'], workDir, job.id);
            streamLog(job.id, '✓ Code pulled via Git');
        } else {
            throw new Error("No repository URL configured and no source files attached. Please link a GitHub repository or use the CLI to upload source files.");
        }

        // Setup sandbox home
        fs.mkdirSync(sandboxHome, { recursive: true });

        // Step 2: Install
        streamLog(job.id, '[Remote Agent] Installing dependencies...');
        await runCommand('yarn', ['install'], workDir, job.id);

        const stripePatch = path.join(workDir, 'node_modules/@stripe/stripe-react-native/ios/StripeSwiftInterop.h');
        if (fs.existsSync(stripePatch)) {
            let content = fs.readFileSync(stripePatch, 'utf8').replace('NS_ENUM(NSUInteger, STPPaymentStatus)', 'NS_ENUM(NSInteger, STPPaymentStatus)');
            fs.writeFileSync(stripePatch, content);
        }

        // Step 3: Expo Prebuild
        streamLog(job.id, '[Remote Agent] Running expo prebuild...');
        const appJsonPath = path.join(workDir, 'app.json');
        const appConfigJsPath = path.join(workDir, 'app.config.js');
        const appConfigTsPath = path.join(workDir, 'app.config.ts');

        if (fs.existsSync(appJsonPath)) {
            // Static app.json — inject build overrides directly
            let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
            appJson.expo = appJson.expo || {};
            appJson.expo.ios = appJson.expo.ios || {};
            appJson.expo.ios.buildNumber = job.build_number.toString();
            if (job.bundle_id) appJson.expo.ios.bundleIdentifier = job.bundle_id;
            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
        } else if (fs.existsSync(appConfigJsPath) || fs.existsSync(appConfigTsPath)) {
            // Dynamic app.config.js/ts — Expo merges app.json into dynamic config when both exist.
            // Create a companion app.json with build number/bundle ID overrides.
            streamLog(job.id, '[Remote Agent] Detected dynamic config (app.config.js). Generating companion app.json with build overrides...');
            const overrides = {
                expo: {
                    ios: { buildNumber: job.build_number.toString() },
                    android: { versionCode: job.build_number }
                }
            };
            if (job.bundle_id) {
                overrides.expo.ios.bundleIdentifier = job.bundle_id;
                overrides.expo.android.package = job.bundle_id;
            }
            fs.writeFileSync(appJsonPath, JSON.stringify(overrides, null, 2));
        }

        // Build env vars from project secrets so dynamic configs (app.config.js) can read them
        const buildEnv = { HOME: sandboxHome };
        const appleKeyNames = new Set([
            'apple_issuer_id', 'apple_key_id', 'apple_private_key', 'apple_team_id',
            'APPLE_ISSUER_ID', 'APPLE_KEY_ID', 'APPLE_P8', 'APPLE_TEAM_ID'
        ]);
        if (job.secrets) {
            for (const [key, value] of Object.entries(job.secrets)) {
                if (!appleKeyNames.has(key) && value) {
                    buildEnv[key] = value;
                }
            }
            const injectedKeys = Object.keys(buildEnv).filter(k => k !== 'HOME');
            if (injectedKeys.length > 0) {
                streamLog(job.id, `[Remote Agent] Injecting ${injectedKeys.length} project secret(s) into build environment: ${injectedKeys.join(', ')}`);
            }
        }

        await runCommand('yarn', ['expo', 'prebuild', '--platform', 'ios', '--no-install'], workDir, job.id, buildEnv);

        // Step 4: CocoaPods
        streamLog(job.id, '[Remote Agent] Installing CocoaPods...');
        await runCommand('pod', ['install', '--repo-update'], path.join(workDir, 'ios'), job.id);

        const iosDir = path.join(workDir, 'ios');
        const workspace = fs.readdirSync(iosDir).find(f => f.endsWith('.xcworkspace'));
        const scheme = workspace ? workspace.replace('.xcworkspace', '') : 'App';
        const archivePath = path.join(workDir, 'build', 'app.xcarchive');
        const exportPath = path.join(workDir, 'build', 'export');

        let actualBundleId = job.bundle_id;
        try {
            if (!actualBundleId && fs.existsSync(path.join(workDir, 'app.json'))) {
                const appJson = JSON.parse(fs.readFileSync(path.join(workDir, 'app.json'), 'utf8'));
                actualBundleId = appJson.expo?.ios?.bundleIdentifier;
            }
        } catch (e) { }
        // Fallback: try reading app.config.js by evaluating it (for bundleIdentifier with env var defaults)
        if (!actualBundleId && (fs.existsSync(path.join(workDir, 'app.config.js')) || fs.existsSync(path.join(workDir, 'app.config.ts')))) {
            try {
                const configContent = fs.readFileSync(path.join(workDir, 'app.config.js'), 'utf8');
                const bundleMatch = configContent.match(/bundleIdentifier[:\s]*['"]([^'"]+)['"]/);
                if (bundleMatch && bundleMatch[1] && !bundleMatch[1].includes('process.env')) {
                    actualBundleId = bundleMatch[1];
                    streamLog(job.id, `[Remote Agent] Extracted bundle ID from app.config.js: ${actualBundleId}`);
                }
                // Also try the fallback default pattern: process.env.X || "value"
                if (!actualBundleId) {
                    const fallbackMatch = configContent.match(/bundleIdentifier[:\s]*(?:process\.env\.[\w]+\s*\|\|\s*)['"]([^'"]+)['"]/);
                    if (fallbackMatch && fallbackMatch[1]) {
                        actualBundleId = fallbackMatch[1];
                        streamLog(job.id, `[Remote Agent] Extracted fallback bundle ID from app.config.js: ${actualBundleId}`);
                    }
                }
            } catch (e) { }
        }
        // Fallback: read from .env file (Expo projects often store IOS_BUNDLE_ID there)
        if (!actualBundleId) {
            try {
                const envPath = path.join(workDir, '.env');
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const match = envContent.match(/^IOS_BUNDLE_ID\s*=\s*(.+)$/m);
                    if (match && match[1]) actualBundleId = match[1].trim();
                }
            } catch (e) { }
        }
        // Fallback: read from generated pbxproj after expo prebuild
        if (!actualBundleId && workspace) {
            try {
                const pbxPath = path.join(iosDir, workspace.replace('.xcworkspace', '.xcodeproj'), 'project.pbxproj');
                if (fs.existsSync(pbxPath)) {
                    const pbx = fs.readFileSync(pbxPath, 'utf8');
                    const m = pbx.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?([^";]+)"?;/);
                    if (m && m[1] && !m[1].includes('$')) actualBundleId = m[1];
                }
            } catch (e) { }
        }
        if (!actualBundleId) actualBundleId = 'com.buildcheap.default';

        const keys = {
            issuerId: job.secrets?.apple_issuer_id,
            keyId: job.secrets?.apple_key_id,
            privateKey: job.secrets?.apple_private_key,
            teamId: job.secrets?.apple_team_id
        };

        let signingFlags = ['CODE_SIGNING_ALLOWED=NO'];
        let provSetup = null;

        if (keys.issuerId && keys.privateKey) {
            streamLog(job.id, '[Remote Agent] Connecting to Apple & Securing Keychain...');
            const token = generateASCToken(keys);

            const signingDir = path.join(workDir, '.signing');
            fs.mkdirSync(signingDir, { recursive: true });

            const persistentSigningDir = path.join(process.env.HOME || '/Users/administrator', '.buildcheap_certs');
            fs.mkdirSync(persistentSigningDir, { recursive: true });

            const persistentKey = path.join(persistentSigningDir, 'dist.key');
            const persistentCsr = path.join(persistentSigningDir, 'dist.csr');

            let isNewKey = false;
            if (!fs.existsSync(persistentKey) || !fs.existsSync(persistentCsr)) {
                await runCommand('/usr/bin/openssl', ['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', persistentKey, '-out', persistentCsr, '-subj', '/CN=BuildCheap Distribution/O=BuildCheap/C=US'], persistentSigningDir, job.id, { HOME: sandboxHome });
                isNewKey = true;
            }

            fs.copyFileSync(persistentKey, path.join(signingDir, 'dist.key'));
            fs.copyFileSync(persistentCsr, path.join(signingDir, 'dist.csr'));

            const csrContent = fs.readFileSync(path.join(signingDir, 'dist.csr'), 'utf8');

            // Provision
            provSetup = await provisionSigning(token, csrContent, actualBundleId, isNewKey);
            fs.writeFileSync(path.join(signingDir, 'dist.cer'), Buffer.from(provSetup.certContent, 'base64'));

            // Convert to DER for importing
            await runCommand('/usr/bin/openssl', ['x509', '-inform', 'DER', '-in', path.join(signingDir, 'dist.cer'), '-out', path.join(signingDir, 'dist.pem')], workDir, job.id, { HOME: sandboxHome });
            await runCommand('/usr/bin/openssl', ['pkcs12', '-export', '-inkey', path.join(signingDir, 'dist.key'), '-in', path.join(signingDir, 'dist.pem'), '-out', path.join(signingDir, 'dist.p12'), '-passout', 'pass:buildcheap'], workDir, job.id, { HOME: sandboxHome });

            if (!keys.teamId || keys.teamId === 'null') {
                try {
                    const subject = execSync(`/usr/bin/openssl x509 -in "${path.join(signingDir, 'dist.pem')}" -noout -subject`).toString();
                    const ouMatch = subject.match(/OU\s*=\s*([A-Z0-9]{10})/);
                    if (ouMatch && ouMatch[1]) {
                        keys.teamId = ouMatch[1];
                        streamLog(job.id, `[Remote Agent] Dynamically extracted Apple Team ID ${keys.teamId} from Distribution Certificate`);
                    }
                } catch (e) { }
            }

            // Create Keychain
            const keychainPath = path.join(signingDir, 'build.keychain-db');
            await runCommand('security', ['create-keychain', '-p', 'buildcheap', keychainPath], workDir, job.id);
            await runCommand('security', ['set-keychain-settings', '-t', '3600', keychainPath], workDir, job.id);
            await runCommand('security', ['unlock-keychain', '-p', 'buildcheap', keychainPath], workDir, job.id);
            await runCommand('security', ['import', path.join(signingDir, 'dist.p12'), '-k', keychainPath, '-P', 'buildcheap', '-T', '/usr/bin/codesign'], workDir, job.id);
            await runCommand('security', ['list-keychains', '-d', 'user', '-s', keychainPath, path.join(process.env.HOME || '/Users/administrator', 'Library/Keychains/login.keychain-db')], workDir, job.id);
            await runCommand('security', ['set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s', '-k', 'buildcheap', keychainPath], workDir, job.id);

            // Save Profile
            const profilesDir = path.join(process.env.HOME || '/Users/guy', 'Library/MobileDevice/Provisioning Profiles');
            fs.mkdirSync(profilesDir, { recursive: true });
            fs.writeFileSync(path.join(profilesDir, `${provSetup.profileUUID}.mobileprovision`), Buffer.from(provSetup.profileContent, 'base64'));

            // Inject Manual signing to project
            if (workspace && fs.existsSync(iosDir)) {
                const pbxprojPath = path.join(iosDir, workspace.replace('.xcworkspace', '.xcodeproj'), 'project.pbxproj');
                let pbxContent = fs.readFileSync(pbxprojPath, 'utf8').replace(/CODE_SIGN_STYLE = Automatic;/g, 'CODE_SIGN_STYLE = Manual;').replace(/ProvisioningStyle = Automatic;/g, 'ProvisioningStyle = Manual;');
                fs.writeFileSync(pbxprojPath, pbxContent);

                signingFlags = [];
                if (keys.teamId && keys.teamId !== 'null') {
                    signingFlags.push(`DEVELOPMENT_TEAM=${keys.teamId}`);
                }
                signingFlags.push(`CODE_SIGN_IDENTITY=iPhone Distribution`);
                signingFlags.push(`PROVISIONING_PROFILE_SPECIFIER=${provSetup.profileName}`);
                signingFlags.push(`CODE_SIGN_STYLE=Manual`);
            }
        }

        // Step 5: Pre-Archive Stamping & Archive
        // Apple TestFlight strictly rejects identical CFBundleVersions. Expo notoriously hardcodes this to '1'.
        // Force-stamp the unique build system job ID tightly into the Info.plist before compilation using PlistBuddy.
        if (fs.existsSync(iosDir)) {
            try {
                const plists = execSync(`find "${iosDir}" -name Info.plist -not -path "*/Pods/*"`, { encoding: 'utf8' }).split('\n').filter(Boolean);
                for (const plist of plists) {
                    try {
                        execSync(`/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${job.build_number}" "${plist}"`);
                        streamLog(job.id, `[Remote Agent] Auto-stamped CFBundleVersion=${job.build_number} securely into ${path.basename(path.dirname(plist))}/Info.plist`);
                    } catch (err) {
                        try { execSync(`/usr/libexec/PlistBuddy -c "Add :CFBundleVersion string ${job.build_number}" "${plist}"`); } catch (e) { }
                    }
                }
            } catch (err) { }
        }

        streamLog(job.id, '[Remote Agent] Compiling iOS framework (this may take 5-15 mins)...');
        await runCommand('xcodebuild', ['-workspace', workspace, '-scheme', scheme, '-configuration', 'Release', '-sdk', 'iphoneos', '-destination', 'generic/platform=iOS', '-archivePath', archivePath, `CURRENT_PROJECT_VERSION=${job.build_number}`, 'archive', ...signingFlags], iosDir, job.id);

        // Export IPA
        if (keys.issuerId) {
            streamLog(job.id, '[Remote Agent] Exporting .ipa archive...');
            fs.mkdirSync(exportPath, { recursive: true });

            // Extract teamId if missing
            if (!keys.teamId && fs.existsSync(path.join(workDir, '.signing', 'dist.pem'))) {
                const subject = execSync('/usr/bin/openssl x509 -noout -subject -in ' + path.join(workDir, '.signing', 'dist.pem'), { encoding: 'utf8' });
                const match = subject.match(/OU\s*=\s*([A-Z0-9]{10})/);
                if (match) keys.teamId = match[1];
            }

            let provProfilesXml = '';
            if (provSetup && provSetup.profileUUID) {
                provProfilesXml = `<key>provisioningProfiles</key><dict><key>${actualBundleId}</key><string>${provSetup.profileUUID}</string></dict>`;
                streamLog(job.id, `[Remote Agent] Exporting using Profile UUID: ${actualBundleId} -> ${provSetup.profileUUID}`);
            } else {
                streamLog(job.id, `[Remote Agent] WARNING: Missing provSetup or profileUUID. Export will likely fail!`);
            }

            const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict><key>method</key><string>app-store-connect</string><key>teamID</key><string>${keys.teamId}</string><key>uploadBitcode</key><false/><key>uploadSymbols</key><true/><key>signingStyle</key><string>manual</string><key>signingCertificate</key><string>iPhone Distribution</string>${provProfilesXml}</dict>
</plist>`;
            fs.writeFileSync(path.join(workDir, 'build', 'ExportOptions.plist'), plistContent);

            await runCommand('xcodebuild', ['-exportArchive', '-archivePath', archivePath, '-exportPath', exportPath, '-exportOptionsPlist', path.join(workDir, 'build', 'ExportOptions.plist')], iosDir, job.id);

            const ipaPath = path.join(exportPath, fs.readdirSync(exportPath).find(f => f.endsWith('.ipa')));

            // Upload to BuildCheap
            streamLog(job.id, '[Remote Agent] Uploading .ipa back to dashboard...');
            try {
                await withRetry('IPA Dashboard Upload', async () => {
                    execSync(`curl -sS -X POST -H 'x-api-key: ${WORKER_API_KEY}' -F "artifact=@${ipaPath}" ${SERVER_URL}/api/worker/jobs/${job.id}/artifact`);
                });
                streamLog(job.id, '✓ Successfully uploaded .ipa to dashboard via cURL!');
            } catch (err) {
                throw new Error(`cURL IPA upload failed: ${err.message}`);
            }

            // Submit to Apple
            await uploadIpaToAsc(ipaPath, workDir, job.id, keys);
        }

        const dur = Math.round((Date.now() - startTime) / 1000);
        streamLog(job.id, `✅ Remote Xcodebuild successful in ${dur}s`);
        await updateStatus(job.id, 'success', null, dur);

    } catch (err) {
        streamLog(job.id, `❌ Build failed: ${err.message}`);
        await updateStatus(job.id, 'error', err.message, Math.round((Date.now() - startTime) / 1000));
    } finally {
        // Aggressive Sandbox Cleanup
        streamLog(job.id, '[Remote Agent] Executing aggressive sandbox wipe...');
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) { }
        try { execSync(`rm -rf "/Users/${process.env.USER || 'administrator'}/Library/Developer/Xcode/DerivedData/*"`); } catch (_) { }
        try { execSync(`security delete-keychain "build.keychain-db"`); } catch (_) { }
    }
}

/* -------------------------------------------------------------
 * AGENT POLLING LOOP
 * ------------------------------------------------------------- */
async function pollLoop() {
    console.log(`[Agent] Polling ${SERVER_URL} for new jobs...`);
    try {
        const res = await apiFetch('/api/worker/jobs/next');
        if (res.job) {
            console.log(`[Agent] Picked up job ${res.job.id} - ${res.job.bundle_id}`);
            await processJob(res.job);
        }
    } catch (err) {
        console.error(`[Agent] API Error: ${err.message}`);
    }
    setTimeout(pollLoop, 10000); // 10 seconds empty poll rate
}

console.log('==== BUILDCHEAP REMOTE AGENT ====');
console.log(`Host Cloud: ${SERVER_URL}`);
console.log(`Workspace: ${ARTIFACTS_DIR}`);
pollLoop();
