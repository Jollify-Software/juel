import { esc } from '../../_Utils/esc';
import { RouteView } from './RouteView';
import { href, users } from './routerData';

export class DemoUserList extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Users</h3><ul>${Object.entries(users)
            .map(([id, u]) => `<li><a href="${href(this, `/users/${id}`)}">${esc(u.name)}</a></li>`).join('')}</ul>`;
    }
}

customElements.define('demo-user-list', DemoUserList);
