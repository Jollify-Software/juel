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

@customElement("juel-button")
export class JuelButton extends InputBase {
    static styles = unsafeCSS(Styles);

    @property({ type: Boolean }) submit: boolean;

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
        iconStyle["margin-right"] = "0.5rem";
        let klass = this.getInputClass();
        return html`<button type="${this.submit ? "submit" : "button"}" part="button" class="${klass}"
                part="button" @click="${this.onClick}"><slot>${when(this.glyph, () => html`<div class="icon sm" style="${styleMap(iconStyle)}"></div>`)}${this.label}</slot></button>`;
    }
}
