import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { ref } from "lit/directives/ref";
import { JuelButton } from "../Button/Button";
import { attr } from "../_Directives/AttrDirective";

export function ButtonTemplate(el: JuelButton) {
    return html`<button name="${ifDefined(el.name)}" ${ref(el.input)} type="${el.submit ? "submit" : "button"}" part="button" class="btn" part="button" @click="${el.onClick}"><slot name="content">${el.label}</slot></button>`;
}