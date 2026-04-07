// BuildCheap — Apple App Store Connect API Client
// Handles certificate creation, bundle ID registration, and provisioning profiles
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getCredentials, generateASCToken, decryptKey } from './apple-credentials.js';

// Re-export decryptKey so worker.js can import it from this module
export { decryptKey };

const ASC_BASE = 'https://api.appstoreconnect.apple.com/v1';

// ------ HTTP Helper ------
async function ascFetch(endpoint, token, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${ASC_BASE}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const errMsg = data.errors?.[0]?.detail || data.errors?.[0]?.title || `Apple API error ${res.status}`;
        throw new Error(errMsg);
    }

    return data;
}

// ------ CSR Generation ------
// Generate a Certificate Signing Request + private key for Apple Distribution cert
export function createCSR() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Build a minimal CSR using Node's crypto
    // Apple accepts DER-encoded CSRs
    const sign = crypto.createSign('SHA256');
    // We need to construct a proper CSR — use the x509 API
    const csr = crypto.createSign('SHA256');

    // For simplicity, we'll use openssl via child_process for CSR generation
    // as Node's native crypto doesn't have a CSR builder
    return { privateKey, publicKey, needsOpenSSL: true };
}

// Generate CSR via openssl command (called from worker where shell access is available)
export function generateCSRCommand(keyPath, csrPath) {
    return [
        'openssl', 'req', '-new',
        '-newkey', 'rsa:2048',
        '-nodes',
        '-keyout', keyPath,
        '-out', csrPath,
        '-subj', '/CN=BuildCheap Distribution/O=BuildCheap/C=US',
    ];
}

// ------ Certificate Management ------

// List existing distribution certificates
export async function listCertificates(token) {
    const data = await ascFetch(
        '/certificates?filter[certificateType]=IOS_DISTRIBUTION&limit=200',
        token
    );
    return data.data || [];
}

// Create a new distribution certificate from a CSR
export async function createCertificate(token, csrContent) {
    const data = await ascFetch('/certificates', token, {
        method: 'POST',
        body: JSON.stringify({
            data: {
                type: 'certificates',
                attributes: {
                    certificateType: 'IOS_DISTRIBUTION',
                    csrContent: csrContent,
                },
            },
        }),
    });
    return data.data;
}

// Get or create a distribution certificate
export async function getOrCreateCertificate(token, csrContent, forceNew = false) {
    // First check for existing valid certs
    const existing = await listCertificates(token);
    const valid = existing.filter(c =>
        c.attributes.certificateType === 'IOS_DISTRIBUTION' &&
        new Date(c.attributes.expirationDate) > new Date()
    );

    if (!forceNew && valid.length > 0) {
        return { cert: valid[0], created: false };
    }

    // If forceNew, we must revoke existing certs to avoid hitting the 3-cert limit
    if (forceNew) {
        for (const c of valid) {
            try {
                await ascFetch(`/certificates/${c.id}`, token, { method: 'DELETE' });
            } catch (err) {
                console.error(`Failed to revoke cert ${c.id}:`, err.message);
            }
        }
    }

    // Create new cert
    const cert = await createCertificate(token, csrContent);
    return { cert, created: true };
}

// ------ Bundle ID Management ------

// List bundle IDs
export async function listBundleIds(token) {
    const data = await ascFetch('/bundleIds?limit=200', token);
    return data.data || [];
}

// Register a new bundle ID
export async function registerBundleId(token, identifier, name) {
    const data = await ascFetch('/bundleIds', token, {
        method: 'POST',
        body: JSON.stringify({
            data: {
                type: 'bundleIds',
                attributes: {
                    identifier,
                    name: name || identifier.split('.').pop(),
                    platform: 'IOS',
                },
            },
        }),
    });
    return data.data;
}

// Get or register a bundle ID
export async function getOrCreateBundleId(token, identifier) {
    const existing = await listBundleIds(token);
    const match = existing.find(b => b.attributes.identifier === identifier);

    if (match) {
        return { bundleIdResource: match, created: false };
    }

    const bundleIdResource = await registerBundleId(token, identifier);
    return { bundleIdResource, created: true };
}

// ------ Provisioning Profile Management ------

// Create an App Store provisioning profile
export async function createProvisioningProfile(token, certId, bundleIdResourceId, profileName) {
    const data = await ascFetch('/profiles', token, {
        method: 'POST',
        body: JSON.stringify({
            data: {
                type: 'profiles',
                attributes: {
                    name: profileName || `BuildCheap_${Date.now()}`,
                    profileType: 'IOS_APP_STORE',
                },
                relationships: {
                    bundleId: {
                        data: { type: 'bundleIds', id: bundleIdResourceId },
                    },
                    certificates: {
                        data: [{ type: 'certificates', id: certId }],
                    },
                },
            },
        }),
    });
    return data.data;
}

// ------ Orchestrator ------
// Full flow: generate signing assets for a build

export async function provisionSigningAssets(userId, bundleId, workDir) {
    const credentials = getCredentials(userId);
    if (!credentials) {
        return null; // No credentials stored — build unsigned
    }

    const token = generateASCToken(credentials);

    // Step 1: Generate CSR + private key
    const signingDir = path.join(workDir, '.signing');
    fs.mkdirSync(signingDir, { recursive: true });

    const keyPath = path.join(signingDir, 'dist.key');
    const csrPath = path.join(signingDir, 'dist.csr');
    const certPath = path.join(signingDir, 'dist.cer');
    const p12Path = path.join(signingDir, 'dist.p12');
    const profilePath = path.join(signingDir, 'profile.mobileprovision');

    // Return the commands and data needed — worker will execute
    return {
        credentials,
        token,
        signingDir,
        keyPath,
        csrPath,
        certPath,
        p12Path,
        profilePath,
        bundleId,
        teamId: credentials.teamId,
    };
}

// After CSR is generated on the Mac Mini, call this to provision via Apple API
export async function completeProvisioning(token, csrContent, bundleId, signingAssets) {
    // getOrCreateCertificate now knows whether to force generation of a new cert if the local key is new
    const certResult = await getOrCreateCertificate(token, csrContent, signingAssets.isNewKey);
    const certId = certResult.cert.id;

    // Save the downloaded certificate to disk
    const certContent = certResult.cert.attributes.certificateContent;
    const certBuffer = Buffer.from(certContent, 'base64');
    fs.writeFileSync(signingAssets.certPath, certBuffer);

    // 2. Register / Get Bundle ID
    const bundleResult = await getOrCreateBundleId(token, bundleId);
    const bundleIdResourceId = bundleResult.bundleIdResource.id;

    // 3. Create Provisioning Profile (always recreate to ensure cert linkage)
    const profileName = `BuildCheap ${bundleId} ${Date.now()}`;
    const profileData = await createProvisioningProfile(token, certId, bundleIdResourceId, profileName);

    const profileContent = profileData.attributes.profileContent;
    const profileBuffer = Buffer.from(profileContent, 'base64');
    fs.writeFileSync(signingAssets.profilePath, profileBuffer);

    return {
        certId: certId,
        profileId: profileData.id,
        profileName: profileData.attributes.name,
        profileUUID: profileData.attributes.uuid,
        teamId: signingAssets.teamId,
    };
}

// Test Apple credentials by listing certificates
export async function testCredentials(userId) {
    const credentials = getCredentials(userId);
    if (!credentials) {
        throw new Error('No Apple credentials stored');
    }

    const token = generateASCToken(credentials);
    const certs = await listCertificates(token);

    return {
        valid: true,
        certificateCount: certs.length,
        teamId: credentials.teamId,
    };
}
