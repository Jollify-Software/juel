import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import styles from 'bundle-text:./FileInput.less';
import bind from "bind-decorator";

@customElement("juel-file-input")
export class JuelFileInput extends LitElement {

    static UploadComplete: string = "upload-complete";

    static styles = unsafeCSS(styles);
    files;
    
    @property({ type: Boolean }) multiple: boolean;
    @property({ type: String}) label: string;
    @property({ type: String}) url: string;
    @property({ type: Boolean}) auto: boolean;
    @property() placeholder: string = "Choose a file";
    @property() accept: string[] = [
        "image/png", "image/jpeg"
    ];
    
    constructor() {
        super();
        this.addEventListener("dragenter", this.dragenter, false);
        this.addEventListener("dragleave", this.dragleave, false);
        this.addEventListener("dragover", this.dragover, false);
        this.addEventListener("drop", this.drop, false);
    }
    
    upload() {
        if (this.url) {
            fetch(this.url, {
                method: 'POST',
                body: this.files
            }).then(response => {
                let event = new CustomEvent(JuelFileInput.UploadComplete, {
                    detail: response
                });
                this.dispatchEvent(event);
            });
        }
    }

    change(e: Event) {
        const input = e.target as HTMLInputElement;

        if (!input.files?.length) {
            return;
        }
    
        this.files = input.files;
        if (this.auto == true) {
            this.upload();
        }
    }

    browse() {
        let file = this.shadowRoot.getElementById("file");
        file.click();
    }

    dragenter(e) {
        e.stopPropagation();
        e.preventDefault();
        this.shadowRoot.firstElementChild.classList.add("dragged");
      }
      dragleave(e) {
        e.stopPropagation();
        e.preventDefault();
        this.shadowRoot.firstElementChild.classList.remove("dragged");
      }
    dragover(e) {
        e.stopPropagation();
        e.preventDefault();
      }
      @bind
    drop(e) {
        e.stopPropagation();
        e.preventDefault();
        this.shadowRoot.firstElementChild.classList.remove("dragged");
        const dt = e.dataTransfer;
        this.files = [...dt.files];
        if (this.auto == true) {
            this.upload();
        }
      }

    render() {
        return html`<div id="container">
            <input type="file" class="file" id="file" ?multiple="${this.multiple}" @change="${this.change}">
            <div id="browse"  @click="${this.browse}"><slot>
                <button>${this.label}</button>
            </slot></div></div>`;
    }

}
