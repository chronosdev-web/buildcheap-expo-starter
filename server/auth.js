// BuildCheap — Authentication (with HttpOnly cookie support)
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { queries } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'buildcheap-dev-secret-change-in-prod';
const TOKEN_EXPIRY = '30d';

// Generate JWT token
export function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
}

// Hash password
export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

// Compare password
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

// Generate API key
export function generateApiKey() {
    return 'bc_live_' + crypto.randomBytes(32).toString('hex');
}

// Auth middleware — supports HttpOnly cookie, Bearer token, and API key
export function authMiddleware(req, res, next) {
    try {
        let token = null;

        // 1. Check HttpOnly cookie first (most secure)
        if (req.cookies && req.cookies.bc_auth) {
            token = req.cookies.bc_auth;
        }

        // 2. Fall back to Authorization header (for API clients)
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.slice(7);
            }
        }

        // 3. Check for API key (for CI/CD integrations)
        const apiKeyHeader = req.headers['x-api-key'];
        if (apiKeyHeader) {
            const keyRecord = queries.getApiKeyByValue.get(apiKeyHeader);
            if (!keyRecord) {
                return res.status(401).json({ error: 'Invalid API key' });
            }
            if (!keyRecord.is_active) {
                return res.status(401).json({ error: 'API key is disabled' });
            }
            if (keyRecord.expires_at) {
                const expiresAt = new Date(keyRecord.expires_at);
                if (expiresAt < new Date()) {
                    return res.status(401).json({ error: 'API key has expired.' });
                }
            }
            // Update last used at in background
            queries.updateApiKeyLastUsed.run(keyRecord.id);

            const user = queries.getUserById.get(keyRecord.user_id);
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }
            req.user = user;
            return next();
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = queries.getUserById.get(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Signup
export async function signup(email, password, displayName) {
    if (!email || !password || !displayName) {
        throw new Error('Email, password and display name are required');
    }
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }

    const existing = queries.getUserByEmail.get(email);
    if (existing) {
        throw new Error('Email already registered');
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    queries.createUser.run(id, email, passwordHash, displayName, null);

    // Auto-generate the first API key for the new user
    const apiKey = generateApiKey();
    queries.createApiKey.run(crypto.randomUUID(), id, 'Default CLI Key', apiKey, null);

    const user = queries.getUserById.get(id);
    const token = generateToken(user);

    return { user: sanitizeUser(user), token };
}

// Login
export async function login(email, password) {
    const user = queries.getUserByEmail.get(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
        throw new Error('Invalid email or password');
    }

    const token = generateToken(user);
    return { user: sanitizeUser(user), token };
}

function sanitizeUser(user) {
    const { password_hash, ...safe } = user;
    return safe;
}
