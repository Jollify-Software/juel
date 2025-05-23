import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { ref } from "lit/directives/ref";
import { JuelButton } from "../Buttons/Button/Button";
import { attr } from "../_Directives/AttrDirective";

export function ButtonTemplate(el: JuelButton, klass: string) {
    return html`<button type="${el.submit ? "submit" : "button"}" part="button" class="${klass}"
        part="button" @click="${el.onClick}"><slot>${el.label}</slot></button>`;
}