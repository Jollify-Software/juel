import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import { DOMStringMapConverter } from "../../_Converters/DOMStringMapConvertor";
import { ThemeModule } from "../../_Modules/Theme/ThemeModule";

// An open-ended list of named themes as a <select> — themes="light: Light;
// dark: Dark; solarized: Solarized" (same key: value; ... syntax used
// elsewhere, e.g. juel-shape's args). For a plain two-way choice, see
// <juel-theme-toggle>; for a fully custom UI (swatches, radio buttons,
// whatever), call window.juel.theme.set(name) directly.
@customElement("juel-theme-select")
export class JuelThemeSelect extends LitElement {

    static styles = css`
        :host {
            display: inline-block;
        }
        select {
            font: inherit;
        }
    `;

    @property({ converter: DOMStringMapConverter })
    themes: { [key: string]: string } = { light: "Light", dark: "Dark" };

    @state() private _value: string = "";

    connectedCallback(): void {
        super.connectedCallback();
        this._value = ThemeModule.get() || Object.keys(this.themes)[0] || "";
        document.addEventListener(ThemeModule.changedEvent, this._onThemeChanged);
    }

    disconnectedCallback(): void {
        document.removeEventListener(ThemeModule.changedEvent, this._onThemeChanged);
        super.disconnectedCallback();
    }

    private _onThemeChanged = (e: CustomEvent<{ theme: string }>) => {
        this._value = e.detail.theme;
    };

    private _handleChange(e: Event) {
        ThemeModule.set((e.target as HTMLSelectElement).value);
    }

    render() {
        return html`<select @change=${this._handleChange}>
            ${Object.entries(this.themes).map(([value, label]) => html`
                <option value=${value} ?selected=${value === this._value}>${label}</option>
            `)}
        </select>`;
    }
}
