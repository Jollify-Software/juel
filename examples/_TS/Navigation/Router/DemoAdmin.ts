import { RouteView } from './RouteView';

export class DemoAdmin extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Admin</h3><p>Only reachable while signed in — the route's <code>beforeEnter</code> guard checks.</p>`;
    }
}

customElements.define('demo-admin', DemoAdmin);
