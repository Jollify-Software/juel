import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import styles from 'bundle-text:./FileInput.less';
import bind from "bind-decorator";
import { SelectedEventArgs } from "../_Core/Events/SelectedEventargs";

@customElement("juel-file-input")
export class JuelFileInput extends LitElement {

    static FilesSelected: string = "files-selected";
    static UploadComplete: string = "upload-complete";
    static UploadError: string = "upload-error";

    static styles = unsafeCSS(styles);
    files: File[];
    
    @property({ type: Boolean }) multiple: boolean;
    @property({ type: String}) label: string;
    @property({ type: String}) name: string;
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

        if(!this.name) this.name = "files";
        if (!this.label) this.label = "Upload";
    }
    
    upload() {
        console.log(this.url);
        if (this.url) {
            let fd = new FormData();
            for (let file of this.files) {
                fd.append(this.name, file);
            }
            fetch(this.url, {
                method: 'POST',
                body: fd
            }).then(response => {
                let event = new CustomEvent(JuelFileInput.UploadComplete, {
                    detail: response
                });
                this.dispatchEvent(event);
            }).catch(err => {
                let e = new CustomEvent(JuelFileInput.UploadError, {
                    detail: err
                });
                this.dispatchEvent(e);
            });
        }
    }

    change(e: Event) {
        const input = e.target as HTMLInputElement;

        if (!input.files?.length) {
            return;
        }
    
        this.files = Array.from(input.files);
        let evt = new CustomEvent<SelectedEventArgs>(JuelFileInput.FilesSelected, {
            detail: {
                value: this.files
            }
        });
        this.dispatchEvent(evt);

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
        let evt = new CustomEvent<SelectedEventArgs>(JuelFileInput.FilesSelected, {
            detail: {
                value: this.files
            }
        });
        this.dispatchEvent(evt);
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
