import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import styles from 'bundle-text:./FileInput.css';

@customElement("juel-file-input")
export class FileInput extends LitElement {

    static styles = unsafeCSS(styles);

    @property({ type: String}) label: string = "Browse";
    @property() placeholder: string = "Choose a file";
    @property() accept: string[] = [
        "image/png", "image/jpeg"
    ];
    
    constructor() {
        super();
    }

    firstUpdated() {
        (this.shadowRoot.firstElementChild as HTMLElement)
            .style.setProperty('--content', `'${this.label}'`);
    }

    render() {
        return html`
        <div class="custom-file">
            <input type="file" class="custom-file-input" id="customFile">
            <div class="custom-file-label">
            <label for="customFile">${this.placeholder}</label>
            <button class="btn btn-outline-secondary" type="button">${this.label}</button>
          </div>
        </div>`;
    }

}