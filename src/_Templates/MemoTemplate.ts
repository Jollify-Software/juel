import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { JuelMemo } from "../Memo/Memo";

export function MemoTemplate(el: JuelMemo) {
    return html`<label part="label" for="text"><slot name="content">${el.label}</slot></label><textarea .value=${ifDefined(el.value)}></textarea>`;
}