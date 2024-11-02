import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { ref } from "lit/directives/ref";
import { JuelText } from "../Input/Text/Text";

export function TextTemplate(el: JuelText, klass: string) {
    return html`<label name="${ifDefined(el.name)}" part="label" for="text"><slot name="content">${el.label}</slot></label>
        <input ${ref(el.input)} part="input" .value="${ifDefined(el.value)}" .placeholder="${ifDefined(el.placeholder)}" class="text" @change="${el.onChange}">`;
}