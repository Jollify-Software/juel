import { html, TemplateResult } from "lit";
import { when } from 'lit/directives/when'
import { InputBase } from "../_Base/InputBase";
import { ButtonTemplate } from "./ButtonTemplate";
import { InputTypes } from "./InputTypes";
import { MemoTemplate } from "./MemoTemplate";
import { RangeTemplate } from "./RangeTemplate";
import { TextTemplate } from "./TextTemplate";
import { TickboxTemplate } from "./TickboxTemplate";


export function InputGroupTemplate(el: InputBase, type: InputTypes) {
    let hasAppend: boolean = false; // Does the input have an addon
    let appendClass = "append";
    let isAfterBtn: boolean; // Is the addon a button
    let hasBefore: boolean; // Does this input have an addon before
    let isBeforeBtn: boolean; // Is the addon after a button?
    let hasDropdown: boolean = false; // Does the input have a dropdown?

    let addon = el.querySelectorAll('[slot="append"]');
    if (addon.length > 0) {
        hasAppend = true;
        let last = addon.item(addon.length - 1);
        // Should the append end with rounded corners
        if (last.nodeName.toLowerCase() == "juel-button") {
            appendClass += " end-rounded"
        }
    }
    let dropdown = el.querySelector('[slot="dropdown"]');
    if (dropdown) {
        hasAppend = true;
        hasDropdown = true;
    }

    let inputTemplate: (el: InputBase) => TemplateResult;
    switch (type) {
        case InputTypes.Button:
            inputTemplate = ButtonTemplate;
            break;
        case InputTypes.Text:
            inputTemplate = TextTemplate;
            break;
        case InputTypes.Range:
            inputTemplate = RangeTemplate
            break;
        case InputTypes.Tickbox:
            inputTemplate = TickboxTemplate
            break;
        case InputTypes.Memo:
            inputTemplate = MemoTemplate;
        default:
            break;
    }
    return html`${when(hasAppend, () => html`<div part="input-group" class="input-group">
                    ${hasBefore ? html`<div class="addon"><slot name="prepend"></slot></div>` : ``}
                    ${inputTemplate(el)}
                    ${hasDropdown ?
            html`<button id="dropdown-toggle" @click="${el.toggleDropdown}"></button>` :
            html`<div class="${appendClass}"><slot name="append"></slot></div>`
        }
                    ${el.active == true && el.addon && el.addonActive == true ?
            html`<div class="${appendClass}"><slot name="append-active"></slot></div>`
            : ``}
                </div>`, () => inputTemplate(el))}
                ${hasDropdown ?
            html`<div id="dropdown-items" style="display:none"><slot name="dropdown"></slot></div>` :
            html``}`;
}