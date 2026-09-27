import { RouteView } from './RouteView';
import { routerOf } from './routerData';

export class DemoLogin extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Sign in</h3><p>The admin guard redirected you here.</p><juel-button type="primary">Sign in and continue</juel-button>`;
        this.querySelector('juel-button').addEventListener('click', () => {
            // The "Signed in" checkbox lives on the router example page.
            (document.getElementById('signed-in') as HTMLInputElement).checked = true;
            routerOf(this).navigate('/admin', { replace: true });
        });
    }
}

customElements.define('demo-login', DemoLogin);
