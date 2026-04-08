// BuildCheap — API Helper (with HttpOnly cookie support)
import { store, initAuthFromResponse, clearAuthState } from './store.js';

const API_BASE = '/api';

export const CONFIG = {
    COST_PER_BUILD: 0.50
};

// Check if user is authenticated (based on store state)
export function isAuthenticated() {
    return store.get('isAuthenticated');
}

// Get token from store (for WebSocket auth only)
export function getToken() {
    return store.get('token');
}

// API fetch wrapper — uses credentials: 'include' to send HttpOnly cookies
async function apiFetch(path, options = {}) {
    const headers = {
        ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include', // Sends HttpOnly cookie automatically
    });

    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error(`[apiFetch ERROR] URL: ${API_BASE}${path}`);
        console.error(`[apiFetch ERROR] Status: ${res.status}`);
        console.error(`[apiFetch ERROR] Response text:`, text.substring(0, 200));
        throw new Error(`Failed parsing JSON for ${path}. Server returned HTML. Check dev tools console.`);
    }

    if (!res.ok) {
        if (res.status === 401) {
            clearAuthState();
            window.location.hash = '#/login';
        }
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

// Auth
export const auth = {
    signup: async (email, password, display_name) => {
        const data = await apiFetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, display_name }),
        });
        // Token comes back in response AND is set as HttpOnly cookie
        // We store token in memory only for WebSocket auth
        initAuthFromResponse(data.user, data.token);
        return data;
    },

    login: async (email, password) => {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        initAuthFromResponse(data.user, data.token);
        return data;
    },

    logout: async () => {
        await apiFetch('/auth/logout', { method: 'POST' });
        clearAuthState();
    },

    me: async () => {
        const data = await apiFetch('/auth/me');
        store.update({
            user: data.user,
            isAuthenticated: true,
        });
        return data;
    },

    update: async (updates) => {
        const data = await apiFetch('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        store.update({ user: data.user });
        return data;
    },

    uploadAvatar: async (base64DataUri) => {
        const data = await apiFetch('/auth/avatar', {
            method: 'POST',
            body: JSON.stringify({ avatar: base64DataUri }),
        });
        store.update({ user: data.user });
        return data;
    },
};

// Projects
export const projects = {
    list: async () => {
        const data = await apiFetch('/projects');
        store.set('projects', data.projects);
        return data;
    },
    create: (data) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) }),
    get: (id) => apiFetch(`/projects/${id}`),
    update: (id, data) => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
    upload: async (projectId, file) => {
        const isZip = file.name.endsWith('.zip');
        const res = await fetch(`/api/projects/${projectId}/upload${isZip ? '?format=zip' : ''}`, {
            method: 'POST',
            headers: { 'Content-Type': isZip ? 'application/zip' : 'application/gzip' },
            credentials: 'include',
            body: file,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Upload failed');
        }
        return res.json();
    },
};

// Builds
export const builds = {
    trigger: (project_id, platform, commit_hash, commit_message) =>
        apiFetch('/builds', { method: 'POST', body: JSON.stringify({ project_id, platform, commit_hash, commit_message }) }),
    list: async (limit = 20, offset = 0) => {
        const data = await apiFetch(`/builds?limit=${limit}&offset=${offset}&t=${Date.now()}`);
        store.set('builds', data.builds);
        return data;
    },
    get: (id) => apiFetch(`/builds/${id}`),
    getLog: (id) => apiFetch(`/builds/${id}/log`),
    log: (id) => apiFetch(`/builds/${id}/log`),
    stats: () => apiFetch('/builds/stats'),
};

// Credits
export const credits = {
    balance: async () => {
        const data = await apiFetch('/credits');
        store.set('creditBalance', data.balance);
        return data;
    },
    purchase: (amount) => apiFetch('/credits/purchase', {
        method: 'POST',
        body: JSON.stringify({
            amount,
            success_url: `${window.location.origin}/#/billing?success=true`,
            cancel_url: `${window.location.origin}/#/billing?canceled=true`
        })
    }),
    history: async (limit = 50, offset = 0) => {
        const data = await apiFetch(`/credits/history?limit=${limit}&offset=${offset}`);
        store.set('creditHistory', data.transactions);
        return data;
    },
};

// Dashboard
export const dashboard = {
    get: async () => {
        const data = await apiFetch(`/dashboard?t=${Date.now()}`);
        store.update({
            dashboardStats: data.stats,
            projects: data.projects,
            builds: data.recent_builds,
            creditBalance: data.user.credit_balance,
        });
        return data;
    },
};

// Credentials
export const credentials = {
    apple: {
        get: () => apiFetch('/credentials/apple'),
        save: (data) => apiFetch('/credentials/apple', { method: 'POST', body: JSON.stringify(data) }),
        delete: () => apiFetch('/credentials/apple', { method: 'DELETE' }),
        test: () => apiFetch('/credentials/apple/test', { method: 'POST' }),
    },
    github: {
        save: (token) => apiFetch('/credentials/github', { method: 'POST', body: JSON.stringify({ token }) }),
    }
};

// Webhooks
export const webhooks = {
    list: () => apiFetch('/webhooks'),
    add: (url) => apiFetch('/webhooks', { method: 'POST', body: JSON.stringify({ url }) }),
    delete: (id) => apiFetch(`/webhooks/${id}`, { method: 'DELETE' }),
};

// Secrets
export const secrets = {
    list: (projectId) => apiFetch(`/projects/${projectId}/secrets`),
    add: (projectId, key_name, value) => apiFetch(`/projects/${projectId}/secrets`, { method: 'POST', body: JSON.stringify({ key_name, value }) }),
    delete: (projectId, secretId) => apiFetch(`/projects/${projectId}/secrets/${secretId}`, { method: 'DELETE' }),
};

// Organizations
export const orgs = {
    list: async () => apiFetch('/orgs'),
    create: async (name) => apiFetch('/orgs', { method: 'POST', body: JSON.stringify({ name }) }),
    get: async (id) => apiFetch(`/orgs/${id}`),
    update: async (id, name) => apiFetch(`/orgs/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    delete: async (id) => apiFetch(`/orgs/${id}`, { method: 'DELETE' }),
    members: async (id) => apiFetch(`/orgs/${id}/members`),
    invite: async (id, email, role) => apiFetch(`/orgs/${id}/members`, { method: 'POST', body: JSON.stringify({ email, role }) }),
    updateRole: async (orgId, userId, role) => apiFetch(`/orgs/${orgId}/members/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
    removeMember: async (orgId, userId) => apiFetch(`/orgs/${orgId}/members/${userId}`, { method: 'DELETE' }),
};

// Support/Bugs
export const support = {
    submit: async (title, description) => apiFetch('/support', { method: 'POST', body: JSON.stringify({ title, description }) }),
    listAll: async () => apiFetch('/support/all'),
    resolve: async (id) => apiFetch(`/support/${id}/resolve`, { method: 'PUT' }),
};

// WebSocket for build logs
export function connectBuildLogs(buildId, onLog) {
    const token = store.get('token');
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        if (token) ws.send(JSON.stringify({ type: 'auth', token }));
        ws.send(JSON.stringify({ type: 'subscribe', buildId }));
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'log') onLog(msg.line);
    };

    return ws;
}

// Initialize auth on page load — try to use existing cookie
export async function initAuth() {
    try {
        await auth.me();
        return true;
    } catch {
        return false;
    }
}
