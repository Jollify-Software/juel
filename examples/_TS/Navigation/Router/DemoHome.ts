import { RouteView } from './RouteView';
import { href } from './routerData';

export class DemoHome extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Home</h3><p>Follow a link, or <a href="${href(this, '/users')}">browse the users</a>.</p>`;
    }
}

customElements.define('demo-home', DemoHome);
