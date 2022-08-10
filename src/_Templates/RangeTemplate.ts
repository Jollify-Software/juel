import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { ref } from "lit/directives/ref";
import { JuelRange } from "../Range/Range";

export function RangeTemplate(el: JuelRange) {
    return html`<label name="${ifDefined(el.name)}" for="input"><slot name="content">${el.label}</slot></label><input ${ref(el.input)} id="input" type="range" .value=${ifDefined(el.value)} min="${ifDefined(el.min)}" max="${ifDefined(el.max)}" step="${ifDefined(el.step)}" @change="${el.onChange}">`;
}