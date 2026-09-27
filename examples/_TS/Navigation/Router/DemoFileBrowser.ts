import { esc } from '../../_Utils/esc';
import { RouteView } from './RouteView';

export class DemoFileBrowser extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Files</h3><p><code>rest = ${esc(JSON.stringify(this.rest))}</code></p>`;
    }
}

customElements.define('demo-file-browser', DemoFileBrowser);
