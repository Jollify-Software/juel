import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";

@customElement("juel-layout")
export class JuelLayout extends JuelComponent {

    @property({ attribute: "label-position" }) labelPosition: string;

    render() {
        return html`<slot></slot>`;
    }
}