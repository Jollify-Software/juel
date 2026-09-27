import { esc } from '../../../_Utils/esc';
import { DashView } from './DashView';
import { href } from './data';

export class DashNotFound extends DashView {
    protected render() {
        this.crumbs([{ label: 'Not found' }]);
        this.innerHTML = `
            <h1>Page not found</h1>
            <p>Nothing lives at <code>${esc(this.rest)}</code>.</p>
            <p><a href="${href('/overview')}">&larr; Back to the overview</a></p>`;
    }
}

customElements.define('dash-not-found', DashNotFound);
