// BuildCheap — Auth Routes (with HttpOnly cookie support)
import { Router } from 'express';
import { signup, login } from '../auth.js';
import { setAuthCookie, clearAuthCookie } from '../cookies.js';
import db, { queries } from '../db.js';
import crypto from 'crypto';

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

import { generateToken, authMiddleware } from '../auth.js';

// GET /api/auth/me — get current user
router.get('/me', authMiddleware, (req, res) => {
    const { password_hash, github_token, ...userData } = req.user;
    const token = generateToken(req.user);
    res.json({ user: { ...userData, has_github_token: !!github_token }, token });
});

// PUT /api/auth/me - update current user
router.put('/me', authMiddleware, (req, res) => {
    const { display_name } = req.body;

    if (typeof display_name !== 'string') {
        return res.status(400).json({ error: 'Display name must be a string' });
    }

    const trimmed = display_name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
        return res.status(400).json({ error: 'Display name must be between 2 and 50 characters' });
    }

    if (/[<>]/g.test(trimmed)) {
        return res.status(400).json({ error: 'Display name contains invalid characters' });
    }

    try {
        queries.updateUser.run(display_name.trim(), req.user.id);

        // Fetch fresh user data to return
        const updatedUser = queries.getUserById.get(req.user.id);
        const { password_hash, github_token, ...userData } = updatedUser;

        res.json({ user: { ...userData, has_github_token: !!github_token } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// POST /api/auth/avatar - upload avatar (Base64 dataURI)
router.post('/avatar', authMiddleware, (req, res) => {
    try {
        const { avatar } = req.body;

        if (!avatar || typeof avatar !== 'string') {
            return res.status(400).json({ error: 'Avatar data is required' });
        }

        // Validate it's a dataURI image
        if (!avatar.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid image format. Must be a data:image/ URI.' });
        }

        // Limit size to ~500KB (Base64 is ~33% larger than raw)
        if (avatar.length > 700000) {
            return res.status(400).json({ error: 'Image too large. Maximum size is 500KB.' });
        }

        queries.updateUserAvatar.run(avatar, req.user.id);

        const updatedUser = queries.getUserById.get(req.user.id);
        const { password_hash, github_token, ...userData } = updatedUser;

        res.json({ user: { ...userData, has_github_token: !!github_token } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// GET /api/auth/keys - list API keys
router.get('/keys', authMiddleware, (req, res) => {
    try {
        const keys = queries.getApiKeysByUser.all(req.user.id);
        res.json({ keys });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});

// POST /api/auth/keys - create API key
router.post('/keys', authMiddleware, (req, res) => {
    try {
        const { name, expiration_days } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Key name is required' });
        }

        const newKey = `bc_live_${crypto.randomBytes(24).toString('hex')}`;
        let expiresAt = null;
        if (expiration_days && expiration_days > 0) {
            const d = new Date();
            d.setDate(d.getDate() + Number(expiration_days));
            expiresAt = d.toISOString();
        }

        const id = crypto.randomUUID();
        queries.createApiKey.run(id, req.user.id, name.trim().slice(0, 50), newKey, expiresAt);

        const keyRecord = queries.getApiKeyById.get(id, req.user.id);
        res.json({ key: keyRecord });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

// PUT /api/auth/keys/:id/toggle - enable/disable API key
router.put('/keys/:id/toggle', authMiddleware, (req, res) => {
    try {
        const { is_active } = req.body;
        const keyId = req.params.id;
        queries.updateApiKeyStatus.run(is_active ? 1 : 0, keyId, req.user.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle API key' });
    }
});

// DELETE /api/auth/keys/:id - delete API key
router.delete('/keys/:id', authMiddleware, (req, res) => {
    try {
        queries.deleteApiKey.run(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

export default router;
