// Simple hash-based router

export class Router {
    constructor(routes, app) {
        this.routes = routes;
        this.app = app;
        this.currentRoute = null;

        window.addEventListener('hashchange', () => this.resolve());

        // Call resolve immediately since window.load might have already fired during async auth
        this.resolve();
    }

    resolve() {
        const fullHash = window.location.hash.slice(1) || '/';
        const hashPath = fullHash.split('?')[0]; // Strip query params for routing
        const route = this.routes[hashPath] || this.routes['/'];

        if (this.currentRoute !== fullHash) {
            this.currentRoute = fullHash;
            this.app.innerHTML = '';

            // Add page transition
            this.app.style.opacity = '0';
            this.app.style.transform = 'translateY(8px)';

            route(this.app);

            requestAnimationFrame(() => {
                this.app.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                this.app.style.opacity = '1';
                this.app.style.transform = 'translateY(0)';
            });
        }
    }

    navigate(path) {
        window.location.hash = path;
    }
}
