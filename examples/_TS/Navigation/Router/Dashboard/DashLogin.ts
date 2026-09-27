import { esc } from '../../../_Utils/esc';
import { DashView } from './DashView';
import { signIn } from './auth';
import { routerOf } from './data';

export class DashLogin extends DashView {
    protected render() {
        this.crumbs([{ label: 'Sign in' }]);
        // requireSignIn redirected here with ?next=<where you were going>.
        const next = this.query().get('next') || '/overview';
        this.innerHTML = `
            <div class="signin">
                <h1>Sign in</h1>
                <p>Any name will do — this is a mock. You were heading for
                    <code>${esc(next)}</code>, and that's where signing in takes you.</p>
                <form class="settings-form">
                    <label>Name <input name="name" value="Ada Lovelace" /></label>
                    <div class="form-actions">
                        <juel-button type="primary" id="go">Sign in</juel-button>
                    </div>
                </form>
            </div>`;

        const submit = () => {
            const name = (this.querySelector('input[name=name]') as HTMLInputElement).value.trim();
            signIn(name || 'Ada Lovelace');
            // replace: the login page shouldn't sit in the back history.
            routerOf(this).navigate(next, { replace: true });
        };
        this.querySelector('#go').addEventListener('click', submit);
        this.querySelector('form').addEventListener('submit', e => { e.preventDefault(); submit(); });
    }
}

customElements.define('dash-login', DashLogin);
