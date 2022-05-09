import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { JuelRange } from "../Range/Range";

export function RangeTemplate(el: JuelRange) {
    return html`<label for="input"><slot name="content">${el.label}</slot></label><input id="input" type="range" .value=${ifDefined(el.value)} min="${ifDefined(el.min)}" max="${ifDefined(el.max)}" step="${ifDefined(el.step)}" @change="${el.onChange}">`;
}