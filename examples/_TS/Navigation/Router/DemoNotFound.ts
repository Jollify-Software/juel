import { esc } from '../../_Utils/esc';
import { RouteView } from './RouteView';
import { href } from './routerData';

export class DemoNotFound extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Not found</h3><p>Nothing lives at <code>${esc(this.rest)}</code>. <a href="${href(this, '/')}">Go home</a>.</p>`;
    }
}

customElements.define('demo-not-found', DemoNotFound);
