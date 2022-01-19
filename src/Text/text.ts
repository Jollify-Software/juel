import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { createPopper, Instance } from '@popperjs/core';
import Styles from 'bundle-text:./text.less';
import { RippleInitialiser } from "../_Utils/RippleModule";
import { InputBase } from "../_Base/InputBase";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";

@customElement("juel-text")
export class JuelText extends InputBase {
    static styles = unsafeCSS(Styles);

    isRipple: string;
    dropdownShown: boolean = false;
    dropdown: Instance;

    r: RippleInitialiser;

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

    onChange(e: Event) {
        var event = new CustomEvent("changed", {
            detail: e
        });
        this.dispatchEvent(event);
    }

    render() {
        return InputGroupTemplate(this, InputTypes.Text);
    }
}
