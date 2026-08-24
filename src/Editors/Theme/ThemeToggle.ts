import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ThemeModule } from "../../_Modules/Theme/ThemeModule";

// A binary light/dark theme switch, built on juel-toggle. For anything
// other than a two-way choice, see <juel-theme-select>; for a fully custom
// UI, call window.juel.theme.set(name) directly — that's the actual
// abstraction, this is just one convenient front-end for it.
@customElement("juel-theme-toggle")
export class JuelThemeToggle extends LitElement {

    static styles = css`
        :host {
            display: inline-block;
        }
    `;

    @property({ attribute: "light-theme" }) lightTheme: string = "light";
    @property({ attribute: "dark-theme" }) darkTheme: string = "dark";

    @state() private _checked: boolean = false;

    connectedCallback(): void {
        super.connectedCallback();
        this._checked = ThemeModule.get() === this.darkTheme;
        document.addEventListener(ThemeModule.changedEvent, this._onThemeChanged);
    }

    disconnectedCallback(): void {
        document.removeEventListener(ThemeModule.changedEvent, this._onThemeChanged);
        super.disconnectedCallback();
    }

    private _onThemeChanged = (e: CustomEvent<{ theme: string }>) => {
        this._checked = e.detail.theme === this.darkTheme;
    };

    private _handleToggled(e: CustomEvent<{ value: boolean }>) {
        ThemeModule.set(e.detail.value ? this.darkTheme : this.lightTheme);
    }

    render() {
        return html`<juel-toggle
            .checked=${this._checked}
            @toggled=${this._handleToggled}
        ></juel-toggle>`;
    }
}
