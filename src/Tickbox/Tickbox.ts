import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { InputBase } from "../_Base/InputBase";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";
import { RippleInitialiser } from "../_Utils/RippleModule";
import Styles from 'bundle-text:./Tickbox.less';
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { Dispatch } from "../_Core/DispatchFunction";
import { EventNames } from "../_Core/Events/EventNames";

@customElement("juel-tickbox")
export class JuelTickbox extends InputBase {
    static styles = unsafeCSS(Styles);

    @property({ type: Boolean }) value: boolean;

    constructor() {
        super();
        this.value = false;
    }

    disconnectedCallback() {
        if (this.isRipple) {
            let btn = this.shadowRoot.firstElementChild as HTMLElement;
            this.r.removeRipples(btn);
        }
    }

    setValue(value: boolean) {
        this.value = value;
    }

    onChange(e: Event) {
        let el = e.target as HTMLInputElement;
        this.value = el.checked;
        let args: ChangedEventArgs = {
            value: this.value
        };
        Dispatch(this, EventNames.Changed, args);
    }
    
    render() {
        return InputGroupTemplate(this, InputTypes.Tickbox);;
    }
}