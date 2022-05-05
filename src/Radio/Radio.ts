import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { InputBase } from "../_Base/InputBase";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";
import { RippleInitialiser } from "../_Utils/RippleModule";
import Styles from 'bundle-text:./Tickbox.less';
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";

@customElement("juel-radio")
export class JuelRadio extends InputBase {
    static styles = unsafeCSS(Styles);

    @property({ type: Boolean }) value: boolean;

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
        let target = e.target as HTMLInputElement;
        this.value = target.checked;
        var event = new CustomEvent<ChangedEventArgs>("changed", {
            detail: {
                value: this.value
            }
        });
        this.dispatchEvent(event);
    }
    
    render() {
        return InputGroupTemplate(this, InputTypes.Radio);
    }
}