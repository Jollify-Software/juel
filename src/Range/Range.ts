import { customElement, property } from "lit/decorators";
import { InputBase } from "../_Base/InputBase";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";
import Styles from 'bundle-text:./Range.less';
import { unsafeCSS } from "lit";
import { RippleInitialiser } from "../_Utils/RippleModule";
import { EventNames } from "../_Core/Events/EventNames";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { Dispatch } from "../_Core/DispatchFunction";

@customElement("juel-range")
export class JuelRange extends InputBase {
    static styles = unsafeCSS(Styles);

    @property({ type: Number }) value: number;
    @property() min;
    @property() max;
    @property() step;

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
        let args : ChangedEventArgs = {
            value: this.value
        };
        Dispatch(this, EventNames.Changed, args);
    }

    render() {
        return InputGroupTemplate(this, InputTypes.Range);
    }
}