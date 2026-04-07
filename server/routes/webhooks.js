// BuildCheap — Webhooks Route
import { Router } from 'express';
import { queries } from '../db.js';
import crypto from 'crypto';

const router = Router();

// GET /api/webhooks
router.get('/', (req, res) => {
    try {
        const webhooks = queries.getWebhooksByUser.all(req.user.id);
        res.json({ webhooks });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
});

// POST /api/webhooks
router.post('/', (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Valid HTTP/HTTPS URL is required' });
    }

    try {
        const id = crypto.randomUUID();
        queries.createWebhook.run(id, req.user.id, url.trim());
        res.status(201).json({ id, url });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create webhook' });
    }
});

// DELETE /api/webhooks/:id
router.delete('/:id', (req, res) => {
    try {
        const result = queries.deleteWebhook.run(req.params.id, req.user.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
});

export default router;
