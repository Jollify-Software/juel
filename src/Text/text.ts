import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { createPopper, Instance } from '@popperjs/core';
import Styles from 'bundle-text:./text.less';
import { RippleInitialiser } from "../_Utils/RippleModule";
import { InputBase } from "../_Base/InputBase";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { Dispatch } from "../_Core/DispatchFunction";
import { EventNames } from "../_Core/Events/EventNames";

@customElement("juel-text")
export class JuelText extends InputBase {
    static styles = unsafeCSS(Styles);

    @property() value: string;

    isRipple: string;
    dropdownShown: boolean = false;
    dropdown: Instance;

    constructor() {
        super();
        this.value = "";
    }

    disconnectedCallback() {
        if (this.isRipple) {
            let btn = this.shadowRoot.firstElementChild as HTMLElement;
            this.r.removeRipples(btn);
        }
    }

    onChange(e: Event) {
        let el = e.target as HTMLInputElement;
        this.value = el.value;
        let args: ChangedEventArgs = {
            value: this.value
        };
        Dispatch(this, EventNames.Changed, args);
    }

    render() {
        return InputGroupTemplate(this, InputTypes.Text);
    }
}
