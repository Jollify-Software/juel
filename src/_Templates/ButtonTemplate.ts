import { html } from "lit-element/lit-element";
import { InputBase } from "../_Base/InputBase";

export function ButtonTemplate(el: InputBase, hasText: boolean) {
    return hasText ?
    html`<button class="btn" part="button" @click="${el.onClick}">${el.text}</button>` :
    html`<button class="btn" part="button" @click="${el.onClick}"><slot name="content"></slot></button>`;
}