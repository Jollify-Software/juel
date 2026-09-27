import type { RoutedElement } from '../../../../src/Navigation/Router/Router';
import type { RouteParams } from '../../../../src/Navigation/Router/RouteMatcher';

// Route views are ordinary custom elements. The router sets `params` (and
// `rest`, for wildcard and not-found views) before connecting them, so
// connectedCallback is the natural place to load data.
export abstract class RouteView extends HTMLElement implements RoutedElement {
    params?: RouteParams;
    rest?: string;

    connectedCallback() {
        this.className = 'view';
        this.render();
    }

    protected abstract render(): void | Promise<void>;
}
