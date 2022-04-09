import { html } from "lit";
import { JuelText } from "../Text/text";

export function TextTemplate(el: JuelText, hasText: boolean) {
    return hasText ?
    html`<label for="text">${el.text}</label><input part="text" id="text" @change="${el.onChange}">` :
    html`<label for="text"><slot name="content"></slot></label><input part="text" class="text" @change="${el.onChange}">`;
}