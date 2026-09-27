import { esc } from '../../_Utils/esc';
import { RouteView } from './RouteView';

export class DemoCatchAll extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Catch-all</h3><p>No earlier route matched <code>${esc(this.rest)}</code>.</p>`;
    }
}

customElements.define('demo-catch-all', DemoCatchAll);
