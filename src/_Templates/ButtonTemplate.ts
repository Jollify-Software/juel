import { html } from "lit";
import { ref } from "lit/directives/ref";
import { JuelButton } from "../Button/Button";

export function ButtonTemplate(el: JuelButton) {
    return html`<button ${ref(el.input)} type="${el.submit ? "submit" : "button"}" part="button" class="btn" part="button" @click="${el.onClick}"><slot name="content">${el.label}</slot></button>`;
}