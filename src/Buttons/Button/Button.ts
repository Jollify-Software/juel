import { html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import Styles from 'bundle-text:./Button.less';
import { RippleEffect } from "../../_Utils/RippleEffect";
import { InputBase } from "../../_Base/InputBase";
import { InputGroupTemplate } from "../../_Templates/InputGroupTemplate";
import { InputTypes } from "../../_Templates/InputTypes";
import { ButtonEvents } from "./ButtonEvents";
import { when } from "lit/directives/when";
import { styleMap } from "lit/directives/style-map";
import { ref } from "lit/directives/ref";
import { ifDefined } from "lit/directives/if-defined";
import { lucideIcon } from "../../_Modules/Icons/Lucide";

@customElement("juel-button")
export class JuelButton extends InputBase {
    static styles = unsafeCSS(Styles);

    @property({ type: Boolean }) submit: boolean;
    @property({ type: Boolean, reflect: true }) disabled: boolean = false;
    // The accessible name of the inner <button>, for a button whose content
    // is only an icon or a symbol. Separate from `label`, which is shown.
    @property({ attribute: 'button-label' }) buttonLabel: string;
    // A pressed (on) state, for a tool button such as Bold. With `toggle` the
    // inner <button> always says whether it's pressed (aria-pressed true or
    // false); without it, only when pressed.
    @property({ type: Boolean, reflect: true }) pressed: boolean = false;
    @property({ type: Boolean }) toggle: boolean = false;
    // A small down chevron after the content, for a button that opens a
    // menu (a juel-menu trigger). Shown with slotted content too.
    @property({ type: Boolean }) caret: boolean = false;

    constructor() {
        super();
        this.submit = false;
        this.hideLabel = true;
    }

    disconnectedCallback() {
        if (this.isRipple) {
            let btn = this.shadowRoot.firstElementChild as HTMLElement;
        }
    }

    onClick(e: Event) {
        if (this.disabled) return;
        super.onClick(e);
        this.fire(ButtonEvents.ButtonClicked, e);
        if (this.submit == true) {
            let frm = this.closest("form") as HTMLFormElement;
            if (frm) {
                if ("requestSubmit" in frm) {
                    frm.requestSubmit();
                } else {
                    (frm as HTMLFormElement).submit();
                }
            }
        }
    }

    protected renderInput(): unknown {
        let iconStyle = this.getIconStyle();
        let klass = this.getInputClass();
        return html`<button ${ref(this.input)} type="${this.submit ? "submit" : "button"}" part="button" class="${klass}"
                ?disabled=${this.disabled} aria-label=${ifDefined(this.buttonLabel || undefined)}
                aria-pressed=${ifDefined(this.toggle || this.pressed ? String(!!this.pressed) : undefined)} @click="${this.onClick}"><slot>${when(this.glyph, () => html`<div class="icon sm ${this.label ? 'labelled' : ''}" style="${styleMap(iconStyle)}"></div>`)}${this.label}</slot>${when(this.caret, () => html`<div class="icon caret" part="caret" aria-hidden="true"
                    style="${styleMap({ 'mask-image': `url("${lucideIcon('lucide-chevron-down')}")`, 'mask-repeat': 'no-repeat', 'mask-position': 'center' })}"></div>`)}</button>`;
    }
}
