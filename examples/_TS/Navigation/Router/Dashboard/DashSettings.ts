import { esc } from '../../../_Utils/esc';
import { DashView } from './DashView';
import { signedInAs } from './auth';

const KEY = 'juel-dashboard-settings';

interface Settings {
    displayName: string;
    currency: string;
    emailDigest: boolean;
}

function load(): Settings {
    try {
        return { displayName: signedInAs() ?? '', currency: 'GBP', emailDigest: true, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') };
    } catch {
        return { displayName: signedInAs() ?? '', currency: 'GBP', emailDigest: true };
    }
}

export class DashSettings extends DashView {
    // The form has edits that haven't been saved.
    private dirty = false;

    // juel-router asks before replacing this view; false stays.
    beforeLeave() {
        return !this.dirty || confirm('You have unsaved changes. Leave anyway?');
    }

    protected render() {
        this.crumbs([{ label: 'Settings' }]);
        const settings = load();
        this.innerHTML = `
            <h1>Settings</h1>
            <div class="panel">
                <form class="settings-form">
                    <label>Display name
                        <input name="displayName" value="${esc(settings.displayName)}" />
                    </label>
                    <label>Currency
                        <select name="currency">
                            ${['GBP', 'EUR', 'USD'].map(c =>
                                `<option value="${c}"${c === settings.currency ? ' selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" name="emailDigest"${settings.emailDigest ? ' checked' : ''} />
                        Email me a weekly digest
                    </label>
                    <div class="form-actions">
                        <juel-button type="primary" id="save">Save</juel-button>
                        <span class="saved" hidden>Saved.</span>
                    </div>
                </form>
            </div>
            <p class="hint">
                Change something and leave without saving: the view's <code>beforeLeave</code> asks
                first. <code>juel-router</code> calls a mounted view's <code>beforeLeave(context)</code>
                (and a route's) before replacing it; <code>false</code> stays. Back/forward can't be
                cancelled, only undone, so the URL is put back.
            </p>`;

        const form = this.querySelector('form') as HTMLFormElement;
        form.addEventListener('input', () => { this.dirty = true; });
        form.addEventListener('change', () => { this.dirty = true; });
        this.querySelector('#save').addEventListener('click', () => {
            const data = new FormData(form);
            try {
                sessionStorage.setItem(KEY, JSON.stringify({
                    displayName: String(data.get('displayName') ?? ''),
                    currency: String(data.get('currency') ?? 'GBP'),
                    emailDigest: data.get('emailDigest') != null,
                }));
            } catch { /* ignore */ }
            this.dirty = false;
            const saved = this.querySelector('.saved') as HTMLElement;
            saved.hidden = false;
            setTimeout(() => { saved.hidden = true; }, 1500);
        });
    }
}

customElements.define('dash-settings', DashSettings);
