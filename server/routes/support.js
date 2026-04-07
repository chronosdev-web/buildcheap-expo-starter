import express from 'express';
import crypto from 'crypto';
import { queries } from '../db.js';

const router = express.Router();

// Users fetching their own bugs
router.get('/', (req, res) => {
    try {
        const bugs = queries.getUserBugs.all(req.user.id);
        res.json(bugs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bug reports' });
    }
});

// Admin fetching all bugs across the platform
router.get('/all', (req, res) => {
    try {
        // Simple admin check: only your exact email
        if (req.user.email !== 'myonlyfriendischatgpt@gmail.com' && req.user.email !== 'guy@chronos.dev') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }
        const bugs = queries.getAllBugs.all();
        res.json(bugs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch global bugs' });
    }
});

// Submit a new bug
router.post('/', (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and Description are required' });
    }
    if (title.length > 200 || description.length > 10000) {
        return res.status(400).json({ error: 'Input exceeds maximum length' });
    }

    try {
        const bugId = crypto.randomUUID();
        queries.createBugReport.run(bugId, req.user.id, title, description);
        res.json({ success: true, id: bugId });
    } catch (err) {
        console.error('Failed to submit bug:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin close bug
router.put('/:id/resolve', (req, res) => {
    try {
        if (req.user.email !== 'myonlyfriendischatgpt@gmail.com' && req.user.email !== 'guy@chronos.dev') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        queries.resolveBug.run('resolved', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
