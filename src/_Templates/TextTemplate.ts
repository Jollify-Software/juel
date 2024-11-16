import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { ref } from "lit/directives/ref";
import { JuelText } from "../Input/Text/Text";

export function TextTemplate(el: JuelText, klass: string) {
    return html`<input part="input" .value="${el.value}" .placeholder="${el.placeholder}" class="text" @change="${el.onChange}">`;
}