// BuildCheap — Reactive Store (Fix #4: Frontend State Management)
// A lightweight reactive store that replaces ad-hoc state management
// Supports subscriptions, computed values, and persistence

class Store {
    constructor(initialState = {}) {
        this._state = { ...initialState };
        this._listeners = new Map(); // key -> Set<callback>
        this._globalListeners = new Set();
    }

    // Get a value
    get(key) {
        return this._state[key];
    }

    // Get entire state snapshot
    getState() {
        return { ...this._state };
    }

    // Set a value and notify listeners
    set(key, value) {
        const oldValue = this._state[key];
        if (oldValue === value) return; // No change

        this._state[key] = value;

        // Notify key-specific listeners
        const keyListeners = this._listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(cb => cb(value, oldValue, key));
        }

        // Notify global listeners
        this._globalListeners.forEach(cb => cb(key, value, oldValue));
    }

    // Batch update multiple values, notifying once per key
    update(updates) {
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value);
        }
    }

    // Subscribe to changes on a specific key
    // Returns an unsubscribe function
    on(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this._listeners.get(key);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) this._listeners.delete(key);
            }
        };
    }

    // Subscribe to ALL changes
    onAny(callback) {
        this._globalListeners.add(callback);
        return () => this._globalListeners.delete(callback);
    }

    // Reset state
    reset(newState = {}) {
        const oldState = this._state;
        this._state = { ...newState };

        // Notify for each changed key
        const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);
        for (const key of allKeys) {
            if (oldState[key] !== newState[key]) {
                const keyListeners = this._listeners.get(key);
                if (keyListeners) {
                    keyListeners.forEach(cb => cb(newState[key], oldState[key], key));
                }
            }
        }
    }
}

// ----- Application Store -----
export const store = new Store({
    // Auth state
    user: null,
    token: null,
    isAuthenticated: false,

    // UI state
    currentPage: '/',
    sidebarOpen: false,
    loading: false,

    // Data cache
    projects: [],
    builds: [],
    creditBalance: 0,
    creditHistory: [],
    dashboardStats: null,
});

// ----- Persistence: Sync auth state with cookies -----
// We still store the token in memory for WebSocket auth,
// but the primary auth mechanism is now the HttpOnly cookie
export function initAuthFromResponse(userData, token) {
    store.update({
        user: userData,
        token: token, // Kept in memory only for WebSocket auth
        isAuthenticated: true,
    });
}

export function clearAuthState() {
    store.update({
        user: null,
        token: null,
        isAuthenticated: false,
        projects: [],
        builds: [],
        creditBalance: 0,
        dashboardStats: null,
    });
}

// Check if user is authenticated by calling /api/auth/me
// (relies on HttpOnly cookie being sent automatically)
export async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            store.update({
                user: data.user,
                isAuthenticated: true,
            });
            return true;
        }
    } catch {
        // Not authenticated
    }
    clearAuthState();
    return false;
}

// ----- Reactive DOM Binding Helpers -----

// Bind a store key to a DOM element's text content
export function bindText(element, key, formatter = (v) => v) {
    const update = (value) => {
        if (element) element.textContent = formatter(value);
    };
    update(store.get(key)); // Initial
    return store.on(key, update); // Subscribe
}

// Bind a store key to a DOM element's innerHTML
export function bindHTML(element, key, formatter = (v) => v) {
    const update = (value) => {
        if (element) element.innerHTML = formatter(value);
    };
    update(store.get(key));
    return store.on(key, update);
}

// Bind visibility to a condition
export function bindVisible(element, key, condition = (v) => !!v) {
    const update = (value) => {
        if (element) element.style.display = condition(value) ? '' : 'none';
    };
    update(store.get(key));
    return store.on(key, update);
}

export default store;
