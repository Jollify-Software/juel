import { html } from "lit";
import { InputBase } from "../_Base/InputBase";

export function ButtonTemplate(el: InputBase) {
    return html`<button part="button" class="btn" part="button" @click="${el.onClick}"><slot name="content">${el.label}</slot></button>`;
}