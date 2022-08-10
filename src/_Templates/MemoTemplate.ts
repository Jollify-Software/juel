import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { ref } from "lit/directives/ref";
import { JuelMemo } from "../Memo/Memo";

export function MemoTemplate(el: JuelMemo) {
    return html`<label name="${ifDefined(el.name)}" part="label" for="text"><slot name="content">${el.label}</slot></label><textarea ${ref(el.input)} .value=${ifDefined(el.value)}></textarea>`;
}