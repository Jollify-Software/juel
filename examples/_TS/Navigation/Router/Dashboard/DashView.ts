import type { RoutedElement } from '../../../../../src/Navigation/Router/Router';
import type { RouteParams } from '../../../../../src/Navigation/Router/RouteMatcher';
import { routerOf } from './data';

// Base for every dash-* view. Same shape as RouteView in the router example,
// plus the bits this app needs in more than one view: the breadcrumb the shell
// shows, and reading the query string off the router's path.
export abstract class DashView extends HTMLElement implements RoutedElement {
    params?: RouteParams;
    rest?: string;

    connectedCallback() {
        this.className = 'view';
        this.render();
    }

    protected abstract render(): void | Promise<void>;

    // The router's path carries "?search" (in hash mode it's all after the
    // "#"), but the router deliberately doesn't remount or re-fire
    // route-changed for a query-only change — so a view that filters by query
    // reads it here and watches for itself. See DashOrderList.
    protected query(): URLSearchParams {
        const path = routerOf(this)?.path ?? '';
        const q = path.indexOf('?');
        return new URLSearchParams(q === -1 ? '' : path.slice(q + 1));
    }

    // The shell renders the breadcrumb; a view says what it should read once
    // it knows (e.g. after loading a customer's name).
    protected crumbs(trail: { label: string; path?: string }[]) {
        this.dispatchEvent(new CustomEvent('dash-crumbs', { detail: trail, bubbles: true, composed: true }));
    }

    protected loading(label: string): string {
        return `<p class="dash-loading">Loading ${label}…</p>`;
    }
}
