import { RouteView } from './RouteView';

export class DemoSettings extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Settings</h3><p>Tick "Lock settings" and try to get here again — the guard blocks it and you stay put.</p>`;
    }
}

customElements.define('demo-settings', DemoSettings);
