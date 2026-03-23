// BuildCheap — Auth Routes (with HttpOnly cookie support)
import { Router } from 'express';
import { signup, login } from '../auth.js';
import { setAuthCookie, clearAuthCookie } from '../cookies.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, display_name } = req.body;
        const result = await signup(email, password, display_name);

        // Set HttpOnly cookie
        setAuthCookie(res, result.token);

        // Also return token in body for WebSocket auth (can't use cookies there)
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await login(email, password);

        // Set HttpOnly cookie
        setAuthCookie(res, result.token);

        res.json(result);
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ message: 'Logged out' });
});

// GET /api/auth/me — get current user (requires auth middleware on the route mount)
router.get('/me', (req, res) => {
    const { password_hash, ...user } = req.user;
    res.json({ user });
});

export default router;
