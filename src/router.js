/**
 * Hash-based Single Page Application (SPA) Router for Study GT.
 */

import { auth } from './auth.js';

class Router {
  constructor(routes = {}) {
    this.routes = routes;
    this.currentCleanUp = null;
    this.appEl = null;

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init(appElementId = 'app') {
    this.appEl = document.getElementById(appElementId);
    this.handleRoute();
  }

  navigate(hashPath) {
    window.location.hash = hashPath.startsWith('#') ? hashPath : `#${hashPath}`;
  }

  parseHash() {
    const rawHash = window.location.hash.slice(1) || '/dashboard';
    const [pathPart, queryPart] = rawHash.split('?');
    const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
    const params = new URLSearchParams(queryPart || '');
    return { path, params };
  }

  matchRoute(currentPath) {
    for (const routePattern in this.routes) {
      // Check exact match
      if (routePattern === currentPath) {
        return { handler: this.routes[routePattern], routeParams: {} };
      }

      // Check parameterized routes like /exam/:id or /results/:id
      const patternParts = routePattern.split('/');
      const pathParts = currentPath.split('/');

      if (patternParts.length === pathParts.length) {
        let match = true;
        const routeParams = {};

        for (let i = 0; i < patternParts.length; i++) {
          if (patternParts[i].startsWith(':')) {
            const paramName = patternParts[i].slice(1);
            routeParams[paramName] = decodeURIComponent(pathParts[i]);
          } else if (patternParts[i] !== pathParts[i]) {
            match = false;
            break;
          }
        }

        if (match) {
          return { handler: this.routes[routePattern], routeParams };
        }
      }
    }

    return null;
  }

  async handleRoute() {
    const { path, params } = this.parseHash();
    const isAuth = auth.isAuthenticated();

    // Route guard: if not authenticated and trying to access protected route
    if (!isAuth && path !== '/login') {
      this.navigate('/login');
      return;
    }

    // Route guard: if already authenticated and trying to go to login
    if (isAuth && path === '/login') {
      this.navigate('/dashboard');
      return;
    }

    // Run clean up of previous page
    if (typeof this.currentCleanUp === 'function') {
      try {
        this.currentCleanUp();
      } catch (err) {
        console.error('Error during route cleanup:', err);
      }
      this.currentCleanUp = null;
    }

    const matched = this.matchRoute(path);
    if (!matched) {
      console.warn(`No route matched for ${path}, redirecting to /dashboard`);
      this.navigate('/dashboard');
      return;
    }

    // Render new route
    try {
      this.currentCleanUp = await matched.handler(this.appEl, {
        params: matched.routeParams,
        query: params,
        navigate: this.navigate.bind(this),
      });
    } catch (err) {
      console.error(`Route handler failed for ${path}:`, err);
      this.appEl.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-6">
          <div class="bg-surface-container-lowest p-8 rounded-xl border border-error/30 max-w-lg w-full text-center">
            <span class="material-symbols-outlined text-error text-5xl mb-3">error</span>
            <h2 class="text-xl font-bold text-on-surface">Page Load Error</h2>
            <p class="text-sm text-on-surface-variant mt-2 mb-6">${err.message || 'An unexpected error occurred.'}</p>
            <a href="#/dashboard" class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-medium text-sm">
              Return to Dashboard
            </a>
          </div>
        </div>
      `;
    }
  }
}

export const router = new Router();

