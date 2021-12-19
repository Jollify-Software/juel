import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import styles from 'bundle-text:./FileInput.less';
import bind from "bind-decorator";

@customElement("juel-file-input")
export class FileInput extends LitElement {

    static styles = unsafeCSS(styles);

    @property({ type: Boolean }) multiple: boolean;
    @property({ type: String}) label: string;
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

    change(e: Event) {
        const input = e.target as HTMLInputElement;

        if (!input.files?.length) {
            return;
        }
    
        const file = input.files[0];
        console.log(file);
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
        const files = [...dt.files];
        console.log(files);
      }

    render() {
        return html`<div id="container">
            <input type="file" class="file" id="file" ?multiple="${this.multiple}" @change="${this.change}">
            <div id="browse"  @click="${this.browse}"><slot>
                <button>${this.label}</button>
            </slot></div></div>`;
    }

}