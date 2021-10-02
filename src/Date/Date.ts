import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

// Luxon // https://moment.github.io/luxon/
@customElement("juel-date")
export class JuelDate extends LitElement {

    @property({ type: String }) value = "";
    @property({ type: Boolean }) picker: boolean = true;

    render() {
        return html`
            <input value="${this.value} />
        `;
    }

}