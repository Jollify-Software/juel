import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { JuelRange } from "../Range/Range";

export function RangeTemplate(el: JuelRange, hasText: boolean) {
    return hasText ?
    html`<label for="input">${el.text}</label><input id="input" type="range" min="${ifDefined(el.min)}" max="${ifDefined(el.max)}" step="${ifDefined(el.step)}" @change="${el.onChange}">` :
    html`<label for="input"><slot name="content"></slot></label><input id="input" type="range" min="${ifDefined(el.min)}" max="${ifDefined(el.max)}" step="${ifDefined(el.step)}" @change="${el.onChange}">`;
}