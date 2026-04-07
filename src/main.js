// Main entry point — with auth check via HttpOnly cookie
import { Router } from './router.js';
import { isAuthenticated, initAuth } from './api.js';
import { store } from './store.js';
import { renderLanding } from './pages/landing.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderProjects } from './pages/projects.js';
import { renderBuilds } from './pages/builds.js';
import { renderCredentials } from './pages/credentials.js';
import { renderBilling } from './pages/billing.js';
import { renderSettings } from './pages/settings.js';
import { renderCli } from './pages/cli.js';
import { renderSupport } from './pages/support.js';

const app = document.getElementById('app');

// Auth guard — check auth via cookie on protected routes
function requireAuth(renderFn) {
    return async (container) => {
        // If not already authenticated, try checking the cookie
        if (!isAuthenticated()) {
            const authed = await initAuth();
            if (!authed) {
                window.location.hash = '#/login';
                return;
            }
        }
        renderFn(container);
    };
}

const routes = {
    '/': (container) => renderLanding(container),
    '/login': (container) => renderLogin(container),
    '/dashboard': requireAuth((container) => renderDashboard(container)),
    '/projects': requireAuth((container) => renderProjects(container)),
    '/builds': requireAuth((container) => renderBuilds(container)),
    '/credentials': requireAuth((container) => renderCredentials(container)),
    '/billing': requireAuth((container) => renderBilling(container)),
    '/settings': requireAuth((container) => renderSettings(container)),
    '/cli': requireAuth((container) => renderCli(container)),
    '/support': requireAuth((container) => renderSupport(container)),
};

// Try to restore auth session from cookie on load
initAuth().then(() => {
    new Router(routes, app);
});
