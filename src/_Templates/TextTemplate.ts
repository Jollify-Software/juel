import { html } from "lit";
import { JuelText } from "../Text/text";

export function TextTemplate(el: JuelText, hasText: boolean) {
    return html`<label for="text"><slot name="content">${el.text}</slot></label><input part="text" .value="${el.value}" class="text" @change="${el.onChange}">`;
}