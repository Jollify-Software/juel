import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./ImagePicker.less';
import { ChangedEventArgs } from '../_Core/Events/ChangedEventArgs';

@customElement("juel-image-picker")
export class JuelImagePicker extends LitElement {

    static styles = unsafeCSS(style);

    static Event_Changed: string = "changed";
    
    @property() src: string;

    srcInput(e: InputEvent) {
        this.src = (<any>e.target).value;

        let args: ChangedEventArgs = {
            value: this.src
        };
        let evt = new CustomEvent(JuelImagePicker.Event_Changed, {
            detail: args
        });
    }

    render() {
        let selector: string = null;
        if (this.id) {
            selector = `#${this.id}`;
        }

        return html`<div>
        <img src="${this.src}" />
        <juel-dialog-manager>
            <div id="dialog-1" data-title="Image Picker" data-trigger="img">
                <input @input=${this.srcInput} value="${this.src}" />
            </div>
        </juel-dialog-manager></div>`;
    }

}