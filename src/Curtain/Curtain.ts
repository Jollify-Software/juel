import { html, LitElement } from "lit";
import { customElement } from "lit/decorators";

// https://www.w3schools.com/howto/howto_js_curtain_menu.asp
@customElement("juel-curtain")
export class JuelCurtain extends LitElement {



    render() {
        return html`<div id="overlay">
        <div id="content"><slot></slot></div>
        </div>`;
    }
}