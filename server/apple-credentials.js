// BuildCheap — Apple Credential Management (AES-256-GCM encrypted)
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { queries } from './db.js';

const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'buildcheap-default-key-change-in-prod!!';

// Derive a 32-byte key from the env var
function getKey() {
    return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

// Encrypt plaintext with AES-256-GCM
export function encryptKey(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    return {
        encrypted,
        iv: iv.toString('base64'),
        authTag,
    };
}

// Decrypt ciphertext with AES-256-GCM
export function decryptKey(encrypted, ivBase64, authTagBase64) {
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Save Apple credentials (encrypts the .p8 private key)
export function saveCredentials(userId, issuerId, keyId, p8PrivateKey, teamId) {
    const { encrypted, iv, authTag } = encryptKey(p8PrivateKey);
    const id = crypto.randomUUID();
    queries.saveAppleCredentials.run(
        id, userId, issuerId, keyId, encrypted, iv, authTag, teamId || null
    );
    return { id, issuerId, keyId, teamId };
}

// Get and decrypt Apple credentials
export function getCredentials(userId) {
    const row = queries.getAppleCredentials.get(userId);
    if (!row) return null;

    const privateKey = decryptKey(row.private_key_encrypted, row.iv, row.auth_tag);
    return {
        id: row.id,
        userId: row.user_id,
        issuerId: row.issuer_id,
        keyId: row.key_id,
        privateKey,
        teamId: row.team_id,
    };
}

// Delete Apple credentials
export function deleteCredentials(userId) {
    return queries.deleteAppleCredentials.run(userId);
}

// Generate a signed JWT for Apple's App Store Connect API
export function generateASCToken(credentials) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: credentials.issuerId,
        iat: now,
        exp: now + 1200, // 20 minutes (Apple max)
        aud: 'appstoreconnect-v1',
    };

    return jwt.sign(payload, credentials.privateKey, {
        algorithm: 'ES256',
        header: {
            alg: 'ES256',
            kid: credentials.keyId,
            typ: 'JWT',
        },
    });
}
