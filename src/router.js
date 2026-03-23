// Simple hash-based router

export class Router {
    constructor(routes, app) {
        this.routes = routes;
        this.app = app;
        this.currentRoute = null;

        window.addEventListener('hashchange', () => this.resolve());
        window.addEventListener('load', () => this.resolve());
    }

    resolve() {
        const hash = window.location.hash.slice(1) || '/';
        const route = this.routes[hash] || this.routes['/'];

        if (this.currentRoute !== hash) {
            this.currentRoute = hash;
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
