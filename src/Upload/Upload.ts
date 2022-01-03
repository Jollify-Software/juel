import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import styles from 'bundle-text:./Upload.less';
import bind from "bind-decorator";
import { SelectedEventArgs } from "../_Core/Events/SelectedEventargs";
import { data } from "jquery";
import { unsafeHTML } from "lit/directives/unsafe-html";

@customElement("juel-upload")
export class JuelUpload extends LitElement {

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
    @property() get: string;
    @property() accept: string;
    itemTemplate: (obj: any) => Promise<string>;
    retrieved: any[] = [];
    retrievedHTML: string[] = [];
    
    constructor() {
        super();
        this.addEventListener("dragenter", this.dragenter, false);
        this.addEventListener("dragleave", this.dragleave, false);
        this.addEventListener("dragover", this.dragover, false);
        this.addEventListener("drop", this.drop, false);

        if(!this.name) this.name = "files";
        if (!this.label) this.label = "Upload";
    }

    firstUpdated() {
        if (this.get) {
            let url = this.get;
            if (this.accept) {
                url = url + `?accept=${this.accept}`;
            }
            fetch(this.get).then(response => {
                response.json().then((data: any[]) => {
                    this.retrieved = data;
                    for (let obj of this.retrieved) {
                        this.itemTemplate(obj).then(str => {
                            this.retrievedHTML.push(str);
                        })
                    }
                })
            })
        }
    }
    
    upload() {
        if (this.url) {
            let fd = new FormData();
            for (let file of this.files) {
                fd.append(this.name, file);
            }
            fetch(this.url, {
                method: 'POST',
                body: fd
            }).then(response => {
                if (this.get && this.itemTemplate) {
                    response.json().then(data => {
                        if (Array.isArray(data)) {
                                this.retrieved = this.retrieved.concat(data);
                        } else {
                                this.retrieved.push(data);
                        }
                        for (let obj of this.retrieved) {
                            this.itemTemplate(obj).then(str => {
                                this.retrievedHTML.push(str);
                            })
                        }
                    });
                }
                let event = new CustomEvent(JuelUpload.UploadComplete, {
                    detail: response
                });
                this.dispatchEvent(event);
            }).catch(err => {
                let e = new CustomEvent(JuelUpload.UploadError, {
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
        let evt = new CustomEvent<SelectedEventArgs>(JuelUpload.FilesSelected, {
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
        let evt = new CustomEvent<SelectedEventArgs>(JuelUpload.FilesSelected, {
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
        ${this.get && this.itemTemplate ? html`<juel-grid><div slot="new" id="browse"  @click="${this.browse}"><slot>
            <button>${this.label}</button>
        </slot></div>${this.retrievedHTML.map(str => {
            return unsafeHTML(str)
        })}</juel-grid>`
            : html`
        <div id="browse"  @click="${this.browse}"><slot>
            <button>${this.label}</button>
        </slot></div>`}</div>`;
    }

}
