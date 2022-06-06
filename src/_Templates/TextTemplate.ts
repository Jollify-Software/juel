import { html } from "lit";
import { ref } from "lit/directives/ref";
import { JuelText } from "../Text/text";

export function TextTemplate(el: JuelText) {
    return html`<label part="label" for="text"><slot name="content">${el.label}</slot></label><input ${ref(el.input)} part="input" .value="${el.value}" class="text" @change="${el.onChange}">`;
}