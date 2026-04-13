import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db, { queries } from '../db.js';
import { decryptKey } from '../apple-api.js';

const router = Router();

// Middleware to authenticate worker node
router.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.WORKER_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized worker node' });
    }
    next();
});

// Configure local multer storage for artifacts
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.resolve(process.env.ARTIFACTS_DIR || './artifacts', 'builds', req.params.id);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// GET /api/worker/jobs/next — Pull the next build job
router.get('/jobs/next', (req, res) => {
    // We must run this transaction to atomically claim the next build
    const claimNextBuild = db.transaction(() => {
        const next = db.prepare(
            `SELECT b.*, p.name as project_name, p.repo_url, p.bundle_id
             FROM builds b JOIN projects p ON b.project_id = p.id
             WHERE b.status = 'queued' ORDER BY b.created_at ASC LIMIT 1`
        ).get();

        if (!next) return null;

        db.prepare('UPDATE builds SET status = ?, started_at = ? WHERE id = ?')
            .run('building', new Date().toISOString(), next.id);

        return next;
    });

    try {
        const nextJob = claimNextBuild();
        if (!nextJob) {
            return res.json({ job: null });
        }

        // Gather all necessary info (like decrypted secrets and GH token)
        const user = db.prepare('SELECT github_token FROM users WHERE id = ?').get(nextJob.user_id);
        const secretRows = queries.getDecryptedSecrets.all(nextJob.project_id);
        const secrets = {};
        for (const row of secretRows) {
            try { secrets[row.key_name] = decryptKey(row.value_encrypted, row.iv, row.auth_tag); }
            catch (err) { /* ignore corrupt keys */ }
        }

        res.json({
            job: {
                id: nextJob.id,
                project_id: nextJob.project_id,
                user_id: nextJob.user_id,
                build_number: nextJob.build_number,
                platform: nextJob.platform,
                repo_url: nextJob.repo_url,
                github_token: user?.github_token,
                bundle_id: nextJob.bundle_id,
                secrets: secrets,
                status: 'building'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/worker/jobs/:id/log — Stream realtime logs
router.post('/jobs/:id/log', (req, res) => {
    const { id } = req.params;
    const { lines } = req.body; // Expecting an array of strings

    if (!lines || !Array.isArray(lines)) {
        return res.status(400).json({ error: 'lines must be an array' });
    }

    try {
        const build = queries.getBuildById.get(id);
        if (!build) return res.status(404).json({ error: 'Build not found' });

        const newLogAppend = lines.join('\\n') + '\\n';

        // Append raw log to database immediately
        const currentLog = build.log || '';
        db.prepare('UPDATE builds SET log = ? WHERE id = ?').run(currentLog + newLogAppend, id);

        // Broadcast to all connected WebSocket clients so UI updates instantly
        const wsBroadcast = req.app.get('wsBroadcast');
        if (wsBroadcast) {
            for (const line of lines) {
                wsBroadcast({
                    type: 'build_log',
                    data: { buildId: id, line }
                });
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/worker/jobs/:id/status — Mark build complete or error
router.post('/jobs/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, error_message, duration_seconds } = req.body;

    try {
        const build = queries.getBuildById.get(id);
        if (!build) return res.status(404).json({ error: 'Build not found' });

        db.prepare(
            `UPDATE builds SET status = ?, completed_at = ?, duration_seconds = ?, error_message = ? WHERE id = ?`
        ).run(status, new Date().toISOString(), duration_seconds, error_message || null, id);

        // Broadcast final status to UI
        const wsBroadcast = req.app.get('wsBroadcast');
        if (wsBroadcast) {
            wsBroadcast({ type: 'build_complete', data: { buildId: id, status } });
        }

        // Dispatch webhooks (fire and forget)
        const webhooks = queries.getWebhooksByProjectOwner.all(build.project_id);
        if (webhooks && webhooks.length > 0) {
            const payload = {
                event: status === 'success' ? 'build.success' : 'build.failure',
                data: {
                    build_id: id,
                    project_id: build.project_id,
                    platform: build.platform,
                    status: status,
                    duration_seconds: duration_seconds
                }
            };
            for (const hook of webhooks) {
                fetch(hook.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(5000)
                }).catch(() => { });
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/worker/jobs/:id/artifact — Upload the compiled IPA/APK
router.post('/jobs/:id/artifact', upload.single('artifact'), (req, res) => {
    const { id } = req.params;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const artifactUrl = `/api/artifacts/${id}/${req.file.originalname}`;
        const artifactSize = req.file.size;

        db.prepare('UPDATE builds SET artifact_url = ?, artifact_size = ? WHERE id = ?')
            .run(artifactUrl, artifactSize, id);

        res.json({ success: true, url: artifactUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
