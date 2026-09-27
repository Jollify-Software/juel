import { esc } from '../../_Utils/esc';
import { RouteView } from './RouteView';
import { fakeFetchUser, href } from './routerData';

export class DemoUserDetail extends RouteView {
    protected async render() {
        const id = this.params.id;
        this.innerHTML = `<h3>User ${esc(id)}</h3><p>Loading…</p>`;
        const user = await fakeFetchUser(id);
        // The route may have changed while loading — this element is then
        // detached, so don't bother rendering.
        if (!this.isConnected) return;
        const back = `<p><a href="${href(this, '/users')}">&larr; All users</a></p>`;
        this.innerHTML = user
            ? `<h3>${esc(user.name)}</h3><p>${esc(user.role)} · <code>params.id = ${esc(JSON.stringify(id))}</code></p>${back}`
            : `<h3>No user ${esc(id)}</h3>${back}`;
    }
}

customElements.define('demo-user-detail', DemoUserDetail);
