import { html, LitElement, nothing } from "lit";
import { property, customElement } from "lit/decorators";
import { FillTemplate } from "../_Utils/FillTemplate";

@customElement("juel-template")
export class JuelTemplate extends LitElement {
    @property() context: any

    render() {
        return html`${this.context ? FillTemplate(this.innerHTML, this.context) : nothing }`;
    }
}