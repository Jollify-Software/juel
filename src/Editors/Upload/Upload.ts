import { html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import styles from 'bundle-text:./Upload.less';
import bind from "bind-decorator";
import { JuelHttpComponent } from "../../_Base/JuelHttpComponent";
import { Dispatch } from "../../_Core/DispatchFunction";
import { UploadEvents } from "./UploadEvents";

@customElement("juel-upload")
export class JuelUpload extends JuelHttpComponent {

    static styles = unsafeCSS(styles);
    files: File[] = [];

    @property({ type: Boolean }) multiple: boolean;
    @property({ type: String }) label: string;
    @property({ type: String }) name: string;
    @property({ type: String }) trigger: string;
    @property({ type: Boolean }) auto: boolean;
    @property() accept: string;

    constructor() {
        super();
        this.addEventListener("dragenter", this.dragenter, false);
        this.addEventListener("dragleave", this.dragleave, false);
        this.addEventListener("dragover", this.dragover, false);
        this.addEventListener("drop", this.drop, false);

        this.name = "files";
        this.label = "Upload";
    }

    firstLoad() {
        if (this.trigger) {
            let el = document.querySelector(this.trigger);
            if (el) {
                el.addEventListener("click", this.browse);
            }
        }
    }

    /** Forget the chosen files, so the browse button shows again. */
    clear() {
        this.files = [];
        const input = this.shadowRoot?.getElementById("file") as HTMLInputElement | null;
        if (input) input.value = '';
        this.requestUpdate();
    }

    uploadFiles() {
        if (!this.url || !this.upload || !this.files.length) {
            return;
        }
        let fd = new FormData();
        for (let file of this.files) {
            fd.append(this.name, file);
        }
        fetch(`${this.url}/${this.upload}`, {
            method: 'POST',
            body: fd
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Upload failed with status ${response.status}`);
            }
            return response.json();
        }).then(data => {
            Dispatch(this, UploadEvents.UploadComplete, data);
        }).catch(err => {
            Dispatch(this, UploadEvents.UploadError, err);
        });
    }

    change(e: Event) {
        const input = e.target as HTMLInputElement;

        if (!input.files?.length) {
            return;
        }

        this.files = Array.from(input.files);
        this.requestUpdate();
        Dispatch(this, UploadEvents.FilesSelected, this.files);

        if (this.auto == true) {
            this.uploadFiles();
        }
    }

    @bind
    browse() {
        let file = this.shadowRoot.getElementById("file") as HTMLInputElement;
        file.click();
    }

    dragenter(e: DragEvent) {
        e.stopPropagation();
        e.preventDefault();
        this.shadowRoot.firstElementChild.classList.add("dragged");
    }
    dragleave(e: DragEvent) {
        e.stopPropagation();
        e.preventDefault();
        this.shadowRoot.firstElementChild.classList.remove("dragged");
    }
    dragover(e: DragEvent) {
        e.stopPropagation();
        e.preventDefault();
    }
    @bind
    drop(e: DragEvent) {
        e.stopPropagation();
        e.preventDefault();
        this.shadowRoot.firstElementChild.classList.remove("dragged");
        const dt = e.dataTransfer;
        this.files = [...dt.files];
        this.requestUpdate();
        Dispatch(this, UploadEvents.FilesSelected, this.files);
        if (this.auto == true) {
            this.uploadFiles();
        }
    }

    render() {
        return html`<div id="container">
        <input type="file" class="file" id="file" ?multiple="${this.multiple}" accept="${this.accept ?? ''}" @change="${this.change}">
        ${this.files && this.files.length > 0 && this.querySelector(':scope > [slot="confirm"]')
                ? html`<slot name="confirm"></slot>`
                : this.trigger
                    ? html`<slot></slot>`
                    : html`<div id="browse" @click="${this.browse}"><slot>
            <button type="button">${this.label}</button>
        </slot></div>`}</div>`;
    }

}
