import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { ref } from "lit/directives/ref";
import { JuelRange } from "../Range/Range";
import { JuelTickbox } from "../Tickbox/Tickbox";

export function TickboxTemplate(el: JuelTickbox) {
    return html`<label name="${ifDefined(el.name)}" for="input"><slot name="content">${el.label}</slot></label><input ${ref(el.input)} type="checkbox" .checked="${el.value}" id="input" @change="${el.onChange}">`;
}