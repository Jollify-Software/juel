import { customElement, html, LitElement, property } from "lit-element";
import { unsafeHTML } from "lit-html/directives/unsafe-html";
import { FillTemplate } from "../_Utils/FillTemplate";

@customElement("juel-template")
export class JuelTemplate extends LitElement {
    @property() context: any

    render() {
        return html`${this.context ? unsafeHTML(FillTemplate(this.innerHTML, this.context)) : '' }`;
    }
}