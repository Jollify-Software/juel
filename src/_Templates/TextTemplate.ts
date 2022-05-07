import { html } from "lit";
import { JuelText } from "../Text/text";

export function TextTemplate(el: JuelText) {
    return html`<label for="text"><slot name="content">${el.label}</slot></label><input part="text" .value="${el.value}" class="text" @change="${el.onChange}">`;
}