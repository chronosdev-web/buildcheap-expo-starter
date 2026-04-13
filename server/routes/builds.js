// BuildCheap — Build Routes (using worker IPC)
import { Router } from 'express';
import { queries, deductCreditAndCreateBuild } from '../db.js';
import crypto from 'crypto';

const router = Router();

// Admin emails bypass credit checks
const ADMIN_EMAILS = [
    ...(process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
    'guy@example.com',
    'myonlyfriendischatgpt@gmail.com',
    'guy_test@test.com' // including previous tests just in case
];

// POST /api/builds — trigger a new build (via worker process)
router.post('/', (req, res) => {
    try {
        const { project_id, platform, commit_hash, commit_message } = req.body;

        if (!project_id || !platform) {
            return res.status(400).json({ error: 'project_id and platform are required' });
        }

        if (!['ios', 'android'].includes(platform)) {
            return res.status(400).json({ error: 'Platform must be ios or android' });
        }

        // Verify project exists and user owns it
        const project = queries.getProjectById.get(project_id);
        if (!project || project.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check credits (skip for admins)
        const COST = parseFloat(process.env.COST_PER_BUILD || '0.50');
        const isAdmin = ADMIN_EMAILS.includes(req.user.email?.toLowerCase());
        if (!isAdmin && req.user.credit_balance < COST) {
            return res.status(402).json({
                error: 'Insufficient credits. Please purchase more credits to continue building.',
                balance: req.user.credit_balance,
                required: COST,
            });
        }

        const buildNumber = queries.getNextBuildNumber.get(project_id).next;
        const buildId = crypto.randomUUID();

        queries.createBuild.run(
            buildId, project_id, req.user.id, buildNumber,
            platform, commit_hash || 'HEAD', commit_message || 'Manual build'
        );

        // Return immediately — build is queued
        res.status(202).json({
            status: 'queued',
            message: 'Build queued. Connect via WebSocket to stream logs.',
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/builds — list user's builds
router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const builds = queries.getBuildsByUser.all(req.user.id, limit, offset);
    res.json({ builds });
});

// GET /api/builds/stats — build statistics
router.get('/stats', (req, res) => {
    const stats = queries.getUserBuildStats.get(req.user.id);
    const queuedCount = queries.getActiveBuildCount.get().count;
    res.json({ stats, queue: { active: queuedCount } });
});

// GET /api/builds/:id — get build details
router.get('/:id', (req, res) => {
    const build = queries.getBuildById.get(req.params.id);
    if (!build || build.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Build not found' });
    }
    res.json({ build });
});

// GET /api/builds/:id/log — get build logs
router.get('/:id/log', (req, res) => {
    const build = queries.getBuildById.get(req.params.id);
    if (!build || build.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Build not found' });
    }
    let logStr = build.log || '';
    if (logStr.length > 50000) {
        logStr = '... [Log truncated to last 50,000 characters for browser performance] ...\n\n' + logStr.slice(-50000);
    }
    res.json({ log: logStr });
});

export default router;
