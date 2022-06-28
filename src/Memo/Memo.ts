import { customElement, property } from "lit/decorators";
import { InputBase } from "../_Base/InputBase";
import { Dispatch } from "../_Core/DispatchFunction";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { EventNames } from "../_Core/Events/EventNames";
import { InputGroupTemplate } from "../_Templates/InputGroupTemplate";
import { InputTypes } from "../_Templates/InputTypes";
import Styles from "bundle-text:./Memo.less";
import { unsafeCSS } from "lit";

@customElement("juel-memo")
export class JuelMemo extends InputBase {

    static styles = unsafeCSS(Styles);

    @property() value: string;
    
    onChange(e: Event) {
        let el = e.target as HTMLInputElement;
        this.value = el.value;
        let args: ChangedEventArgs = {
            value: this.value
        };
        Dispatch(this, EventNames.Changed, args);
    }

    render() {
        return InputGroupTemplate(this, InputTypes.Memo);
    }
}