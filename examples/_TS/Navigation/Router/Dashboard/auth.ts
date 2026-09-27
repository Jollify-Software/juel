import type { RouteContext, RouteGuardResult } from '../../../../../src/Navigation/Router/Router';

const KEY = 'juel-dashboard-user';

export function signedInAs(): string | null {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        // Private mode / blocked storage — treat as signed out.
        return null;
    }
}

export function signIn(name: string) {
    try {
        sessionStorage.setItem(KEY, name);
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('dash-auth-changed'));
}

export function signOut() {
    try {
        sessionStorage.removeItem(KEY);
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('dash-auth-changed'));
}

// One guard shared by every route except /login — the router has no
// router-wide beforeEach, and the TODO's question was whether sharing a single
// function across ~8 routes is tolerable. It is: `dashboard.html` assigns it in
// a loop over the <juel-route> elements.
export function requireSignIn(context: RouteContext): RouteGuardResult {
    if (signedInAs()) return true;
    return '/login?next=' + encodeURIComponent(context.path);
}
