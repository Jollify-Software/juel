import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./ImagePicker.less';
import { ChangedEventArgs } from '../_Core/Events/ChangedEventArgs';

@customElement("juel-image-picker")
export class JuelImagePicker extends LitElement {

    static styles = unsafeCSS(style);

    static Changed: string = "changed";
    
    @property() src: string;
    @property({ type: String}) url: string;
    srcResolver: (obj: any) => string;

    srcInput(e: InputEvent) {
        this.src = (<any>e.target).value;

        let args: ChangedEventArgs = {
            value: this.src
        };
        let evt = new CustomEvent(JuelImagePicker.Changed, {
            detail: args
        });
        this.dispatchEvent(evt);
    }

    uploadComplete(e: CustomEvent<Response>) {
        if (this.srcResolver) {
            e.detail.json().then(obj => {
                console.log(obj)
                this.src = this.srcResolver(obj);
                let args: ChangedEventArgs = {
                    value: this.src
                };
                let evt = new CustomEvent(JuelImagePicker.Changed, {
                    detail: args
                });
                this.dispatchEvent(evt);
            });
        }
    }

    uploadError(err) {

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
                <juel-file-input auto="true" url="${this.url}" @upload-complete="${this.uploadComplete}" @upload-error="${this.uploadError}"></juel-file--input>
            </div>
        </juel-dialog-manager></div>`;
    }

}