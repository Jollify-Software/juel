import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { createPopper, Instance } from '@popperjs/core';
import Styles from 'bundle-text:./Button.less';
import { RippleEffect } from "../_Utils/RippleEffect";
import { InputBase } from "../_Base/InputBase";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";
import { ButtonEvents } from "./ButtonEvents";
import { AlertTypes } from "../_Core/AlertTypes";
import { RenderStyles } from "../_Core/RenderStyles";

@customElement("juel-button")
export class JuelButton extends InputBase {
    static styles = unsafeCSS(Styles);

    @property({ type: Boolean }) submit: boolean;

    constructor() {
        super();
        this.submit = false;
    }

    updated() {
        setTimeout(() => {
            this.isRipple = getComputedStyle(this).getPropertyValue('--ripple');
            if (this.isRipple) {
                let btn = this.shadowRoot.firstElementChild as HTMLElement;
            }
        });
    }

    disconnectedCallback() {
        if (this.isRipple) {
            let btn = this.shadowRoot.firstElementChild as HTMLElement;
        }
    }

    onClick(e: Event) {
        var event = new CustomEvent(ButtonEvents.ButtonClicked, {
            detail: e
        });
        this.dispatchEvent(event);
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

    render() {
        return InputGroupTemplate(this, InputTypes.Button);
    }
}
