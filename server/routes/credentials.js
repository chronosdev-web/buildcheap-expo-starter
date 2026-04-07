// BuildCheap — Apple Credential Routes
import { Router } from 'express';
import { saveCredentials, getCredentials, deleteCredentials } from '../apple-credentials.js';
import { testCredentials } from '../apple-api.js';
import { queries } from '../db.js';

const router = Router();

// POST /api/credentials/github — save GitHub PAT
router.post('/github', (req, res) => {
    try {
        const { token } = req.body;

        // Allow deleting token by sending empty string
        queries.updateUserGithubToken.run(token || null, req.user.id);

        res.json({
            message: token ? 'GitHub Access Token saved successfully' : 'GitHub Access Token removed',
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/credentials/apple — save App Store Connect API Key
router.post('/apple', async (req, res) => {
    try {
        const { issuer_id, key_id, p8_key, team_id } = req.body;

        if (!issuer_id || !key_id || !p8_key) {
            return res.status(400).json({
                error: 'issuer_id, key_id, and p8_key are required',
                help: 'Get these from App Store Connect → Users & Access → Integrations → API Keys',
            });
        }

        // Validate the .p8 key looks correct
        if (!p8_key.includes('BEGIN PRIVATE KEY')) {
            return res.status(400).json({
                error: 'Invalid .p8 key format. It should start with -----BEGIN PRIVATE KEY-----',
            });
        }

        const result = saveCredentials(req.user.id, issuer_id, key_id, p8_key, team_id);

        res.json({
            message: 'Apple credentials saved successfully',
            credentials: {
                issuer_id: result.issuerId,
                key_id: result.keyId,
                team_id: result.teamId,
                saved: true,
            },
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/credentials/apple — check if credentials exist (no secrets exposed)
router.get('/apple', (req, res) => {
    try {
        const creds = getCredentials(req.user.id);

        if (!creds) {
            return res.json({ connected: false });
        }

        res.json({
            connected: true,
            issuer_id: creds.issuerId,
            key_id: creds.keyId,
            team_id: creds.teamId,
            // Never expose the private key
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/credentials/apple — remove stored credentials
router.delete('/apple', (req, res) => {
    try {
        deleteCredentials(req.user.id);
        res.json({ message: 'Apple credentials removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/credentials/apple/test — verify credentials work
router.post('/apple/test', async (req, res) => {
    try {
        const result = await testCredentials(req.user.id);
        res.json({
            status: 'ok',
            message: 'Apple credentials are valid!',
            ...result,
        });
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: 'Apple credentials are invalid or expired',
            error: err.message,
        });
    }
});

export default router;
