// BuildCheap — Environment Secrets Route
import { Router } from 'express';
import { queries } from '../db.js';
import crypto from 'crypto';
import { encryptKey } from '../apple-credentials.js'; // Reuse AES-256-GCM logic

const router = Router({ mergeParams: true }); // Allows access to /api/projects/:id/...

// Middleware to ensure user owns the project
router.use((req, res, next) => {
    const project = queries.getProjectById.get(req.params.id);
    if (!project || project.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this project' });
    }
    next();
});

// GET /api/projects/:id/secrets
router.get('/', (req, res) => {
    try {
        const secrets = queries.getProjectSecrets.all(req.params.id);
        res.json({ secrets });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch secrets' });
    }
});

// POST /api/projects/:id/secrets
router.post('/', (req, res) => {
    const { key_name, value } = req.body;

    if (!key_name || !value || typeof key_name !== 'string' || typeof value !== 'string') {
        return res.status(400).json({ error: 'Key and Value strings are required' });
    }

    // Basic UNIX environment variable validation
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key_name)) {
        return res.status(400).json({ error: 'Invalid environment variable name' });
    }

    try {
        const id = crypto.randomUUID();
        // Encrypt the sensitive value
        const { encrypted, iv, authTag } = encryptKey(value);

        queries.createProjectSecret.run(
            id, req.params.id, key_name.trim(), encrypted, iv, authTag
        );
        res.status(201).json({ success: true, key_name: key_name.trim() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save secret' });
    }
});

// DELETE /api/projects/:id/secrets/:secretId
router.delete('/:secretId', (req, res) => {
    try {
        const result = queries.deleteProjectSecret.run(req.params.secretId, req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Secret not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete secret' });
    }
});

export default router;
