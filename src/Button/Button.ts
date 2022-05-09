import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { createPopper, Instance } from '@popperjs/core';
import Styles from 'bundle-text:./Button.less';
import { RippleInitialiser } from "../_Utils/RippleModule";
import { InputBase } from "../_Base/InputBase";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";
import { ButtonEvents } from "./ButtonEvents";

@customElement("juel-button")
export class JuelButton extends InputBase {
    static styles = unsafeCSS(Styles);

    updated() {
        setTimeout(() => {
            this.isRipple = getComputedStyle(this).getPropertyValue('--ripple');
            console.log(this.isRipple)
            if (this.isRipple) {
                let btn = this.shadowRoot.firstElementChild as HTMLElement;
                this.r = new RippleInitialiser(btn);
            }
        });
    }

    disconnectedCallback() {
        if (this.isRipple) {
            let btn = this.shadowRoot.firstElementChild as HTMLElement;
            this.r.removeRipples(btn);
        }
    }

    onClick(e: Event) {
        var event = new CustomEvent(ButtonEvents.ButtonClicked, {
            detail: e
        });
        this.dispatchEvent(event);
    }

    render() {
        return InputGroupTemplate(this, InputTypes.Button);
    }
}
