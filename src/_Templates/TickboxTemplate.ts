import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { JuelRange } from "../Range/Range";
import { JuelTickbox } from "../Tickbox/Tickbox";

export function TickboxTemplate(el: JuelTickbox, hasText: boolean) {
    return html`<label for="input"><slot name="content">${el.text}</slot></label><input type="checkbox" .checked="${el.value}" id="input" @change="${el.onChange}">`;
}