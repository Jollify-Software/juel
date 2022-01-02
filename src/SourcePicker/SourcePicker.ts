import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./SourcePicker.less';
import { ChangedEventArgs } from '../_Core/Events/ChangedEventArgs';

@customElement("juel-source-picker")
export class JuelSourcePicker extends LitElement {

    static styles = unsafeCSS(style);

    static Changed: string = "changed";
    
    @property() src: string;
    @property() url: string;
    @property() type: string;
    srcResolver: (obj: any) => Promise<string>;

    constructor() {
        super();
    }

    updated(_changedProperties: Map<string | number | symbol, unknown>): void {
        if (!this.title) this.title = "Image Picker";
    }

    setSrc(src: string) {
        this.src = src;
    }

    srcInput(e: InputEvent) {
        this.src = (<any>e.target).value;

        let args: ChangedEventArgs = {
            value: this.src
        };
        let evt = new CustomEvent(JuelSourcePicker.Changed, {
            detail: args
        });
        this.dispatchEvent(evt);

        if (this.type == "audio" || this.type == "video") {
            let player = this.shadowRoot.getElementById("player") as HTMLAudioElement;
            if (player) {
                player.load();
            }
        }
    }

    uploadComplete(e: CustomEvent<Response>) {
        if (this.srcResolver) {
            e.detail.json().then(obj => {
                console.log(obj)
                this.srcResolver(obj).then((str) => {
                    this.src = str;
                    let args: ChangedEventArgs = {
                        value: this.src
                    };
                    let evt = new CustomEvent(JuelSourcePicker.Changed, {
                        detail: args
                    });
                    this.dispatchEvent(evt);

                    if (this.type == "audio" || this.type == "video") {
                        let player = this.shadowRoot.getElementById("player") as HTMLAudioElement;
                        if (player) {
                            player.load();
                        }
                    }
                });
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
        <div id="trigger">
        ${this.type == "audio" ? html`<button>Change</button><audio id="player" controls>
            <source src="${this.src}">
        Your browser does not support the audio tag.
      </audio>` :
            this.type == "video" ? html`<button>Change</button><video id="player" width="320" height="240" controls>
            <source src="${this.src}">
            Your browser does not support the video tag.
          </video>` :
            html`<img src="${this.src}" />`
        }</div>
        <juel-dialog-manager>
            <div id="dialog-1" data-title="${this.title}" data-trigger="#trigger">
                <input @input=${this.srcInput} value="${this.src}" />
                <juel-upload auto="true" url="${this.url}" @upload-complete="${this.uploadComplete}" @upload-error="${this.uploadError}"></juel-upload>
            </div>
        </juel-dialog-manager></div>`;
    }

}