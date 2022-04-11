import { html, LitElement, unsafeCSS } from "lit";
import { customElement } from "lit/decorators";
import { InputBase } from "../_Base/InputBase";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";
import { RippleInitialiser } from "../_Utils/RippleModule";
import Styles from 'bundle-text:./Tickbox.less';

@customElement("juel-tickbox")
export class JuelTickbox extends InputBase {
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

    onChange(e: Event) {
        var event = new CustomEvent("changed", {
            detail: e
        });
        this.dispatchEvent(event);
    }
    
    render() {
        return InputGroupTemplate(this, InputTypes.Tickbox);;
    }
}