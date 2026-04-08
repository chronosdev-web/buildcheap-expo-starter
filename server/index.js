// BuildCheap — Express Server (Production-Grade)
// Fix #2: HttpOnly cookies for JWT
// Fix #3: Worker runs as isolated child process
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fork } from 'child_process';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

import { authMiddleware } from './auth.js';
import { initStripe, handleWebhook } from './stripe.js';
import { queries } from './db.js';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import buildRoutes from './routes/builds.js';
import creditRoutes from './routes/credits.js';
import credentialRoutes from './routes/credentials.js';
import uploadRoutes from './routes/upload.js';
import webhookRoutes from './routes/webhooks.js';
import secretRoutes from './routes/secrets.js';
import orgRoutes from './routes/orgs.js';
import supportRoutes from './routes/support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ----- Worker Process (Fix #3: Isolated) -----
let worker = null;
const buildLogListeners = new Map(); // buildId -> Set<WebSocket>

function startWorker() {
    worker = fork(join(__dirname, 'worker.js'), [], {
        stdio: ['pipe', 'inherit', 'inherit', 'ipc'],
    });

    worker.on('message', (msg) => {
        // Broadcast build logs to WebSocket clients
        if (msg.type === 'build_log') {
            const listeners = buildLogListeners.get(msg.data.buildId);
            if (listeners) {
                const payload = JSON.stringify({ type: 'log', buildId: msg.data.buildId, line: msg.data.line });
                listeners.forEach(ws => {
                    if (ws.readyState === 1) ws.send(payload);
                });
            }
        }

        // Notify on build state changes
        if (msg.type === 'build_complete' || msg.type === 'build_started') {
            const listeners = buildLogListeners.get(msg.data.buildId);
            if (listeners) {
                const payload = JSON.stringify({ type: msg.type, ...msg.data });
                listeners.forEach(ws => {
                    if (ws.readyState === 1) ws.send(payload);
                });
            }
        }

        if (msg.type === 'ready') {
            console.log('[Server] Worker process ready');
        }

        if (msg.type === 'build_error') {
            console.error('[Server] IPC Worker Error:', msg.data.error || msg.data);
        }
    });

    worker.on('exit', (code) => {
        console.error(`[Server] Worker crashed with code ${code}, restarting in 2s...`);
        setTimeout(startWorker, 2000);
    });
}

startWorker();

// Helper to send message to worker
function sendToWorker(type, data) {
    if (worker && worker.connected) {
        worker.send({ type, data });
    }
}

// Make worker accessible to routes
app.set('sendToWorker', sendToWorker);

// Initialize Stripe
initStripe();

// ----- Middleware -----
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));

app.use(cookieParser());

// Raw body for Stripe webhooks (must be before json parser)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const event = await handleWebhook(req.body, req.headers['stripe-signature']);
        res.json({ received: true, type: event.type });
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

app.use(express.json());

// Cookie helpers imported from cookies.js (used by routes/auth.js)

// ----- Routes -----

// Public routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'BuildCheap',
        version: '1.0.0',
        cost_per_build: '$0.50',
        worker_connected: worker && worker.connected,
    });
});

// Protected routes
app.use('/api/auth/me', authMiddleware);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/builds', authMiddleware, buildRoutes);
app.use('/api/credits', authMiddleware, creditRoutes);
app.use('/api/credentials', authMiddleware, credentialRoutes);
app.use('/api/projects', authMiddleware, uploadRoutes);
app.use('/api/webhooks', authMiddleware, webhookRoutes);
app.use('/api/projects/:id/secrets', authMiddleware, secretRoutes);
app.use('/api/orgs', authMiddleware, orgRoutes);
app.use('/api/support', authMiddleware, supportRoutes);

// Dashboard endpoint
app.get('/api/dashboard', authMiddleware, (req, res) => {
    const stats = queries.getUserBuildStats.get(req.user.id);
    const projects = queries.getProjectsByUser.all(req.user.id);
    const recentBuilds = queries.getBuildsByUser.all(req.user.id, 5, 0);
    const creditHistory = queries.getCreditHistory.all(req.user.id, 10, 0);

    res.json({
        user: {
            display_name: req.user.display_name,
            email: req.user.email,
            credit_balance: req.user.credit_balance,
        },
        stats: {
            total_builds: stats.total_builds || 0,
            successful_builds: stats.successful_builds || 0,
            failed_builds: stats.failed_builds || 0,
            avg_duration: stats.avg_duration ? Math.round(stats.avg_duration) : 0,
            total_cost: stats.total_cost || 0,
            success_rate: stats.total_builds > 0
                ? ((stats.successful_builds / stats.total_builds) * 100).toFixed(1)
                : 0,
        },
        projects,
        recent_builds: recentBuilds,
        recent_transactions: creditHistory,
    });
});

// Serve CLI for direct download (no npm needed)
app.get('/cli/buildcheap.js', (req, res) => {
    res.download(join(__dirname, '..', 'cli', 'buildcheap.js'), 'buildcheap.js');
});

// Serve build artifacts securely as forced downloads bypassing Vercel SPA router
app.use('/api/artifacts', express.static(join(__dirname, '..', 'artifacts', 'builds'), {
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.ipa') || filepath.endsWith('.apk') || filepath.endsWith('.aab')) {
            const filename = filepath.split('/').pop() || filepath.split('\\').pop();
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
        }
    }
}));

// In production, serve the built frontend
app.use(express.static(join(__dirname, '..', 'dist')));
app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

// JSON 404 Handler for API routes
app.use('/api', (req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

// Global JSON Error Handler
app.use((err, req, res, next) => {
    console.error('[Express Error]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ----- WebSocket for Build Logs -----
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'auth') {
                try {
                    const decoded = jwt.verify(msg.token, process.env.JWT_SECRET || 'buildcheap-dev-secret-change-in-prod');
                    ws.userId = decoded.id;
                    ws.send(JSON.stringify({ type: 'auth', status: 'ok' }));
                } catch {
                    ws.send(JSON.stringify({ type: 'auth', status: 'error', error: 'Invalid token' }));
                }
            }

            if (msg.type === 'subscribe' && msg.buildId && ws.userId) {
                const build = queries.getBuildById.get(msg.buildId);
                if (build && build.user_id === ws.userId) {
                    if (!buildLogListeners.has(msg.buildId)) {
                        buildLogListeners.set(msg.buildId, new Set());
                    }
                    buildLogListeners.get(msg.buildId).add(ws);
                    ws.send(JSON.stringify({ type: 'subscribed', buildId: msg.buildId }));

                    // Send existing logs if build already has them
                    if (build.log) {
                        build.log.split('\n').forEach(line => {
                            ws.send(JSON.stringify({ type: 'log', buildId: msg.buildId, line }));
                        });
                    }
                }
            }
        } catch {
            // Ignore parse errors
        }
    });

    ws.on('close', () => {
        // Clean up listeners
        for (const [buildId, listeners] of buildLogListeners) {
            listeners.delete(ws);
            if (listeners.size === 0) buildLogListeners.delete(buildId);
        }
    });
});

// ----- Start Server -----
server.listen(PORT, () => {
    console.log(`
  ⚡ BuildCheap API Server
  ========================
  Local:    http://localhost:${PORT}
  Health:   http://localhost:${PORT}/api/health
  WebSocket: ws://localhost:${PORT}/ws
  Worker:   Isolated child process
  Auth:     HttpOnly secure cookies
  Queue:    SQLite-backed (persistent)
  
  Cost per build: $0.50
  Min credit purchase: $${process.env.MIN_CREDIT_PURCHASE || 5}
  `);
});

export default app;
