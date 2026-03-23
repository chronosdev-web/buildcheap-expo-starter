// BuildCheap — API Helper (with HttpOnly cookie support)
import { store, initAuthFromResponse, clearAuthState } from './store.js';

const API_BASE = '/api';

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

    const data = await res.json();

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
};

// Builds
export const builds = {
    trigger: (project_id, platform, commit_hash, commit_message) =>
        apiFetch('/builds', { method: 'POST', body: JSON.stringify({ project_id, platform, commit_hash, commit_message }) }),
    list: async (limit = 20, offset = 0) => {
        const data = await apiFetch(`/builds?limit=${limit}&offset=${offset}`);
        store.set('builds', data.builds);
        return data;
    },
    get: (id) => apiFetch(`/builds/${id}`),
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
    purchase: (amount) => apiFetch('/credits/purchase', { method: 'POST', body: JSON.stringify({ amount }) }),
    history: async (limit = 50, offset = 0) => {
        const data = await apiFetch(`/credits/history?limit=${limit}&offset=${offset}`);
        store.set('creditHistory', data.transactions);
        return data;
    },
};

// Dashboard
export const dashboard = {
    get: async () => {
        const data = await apiFetch('/dashboard');
        store.update({
            dashboardStats: data.stats,
            projects: data.projects,
            builds: data.recent_builds,
            creditBalance: data.user.credit_balance,
        });
        return data;
    },
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
