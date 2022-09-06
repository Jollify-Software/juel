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
    let hasAfter: boolean = false; // Does the input have an addon
    let isAfterBtn: boolean; // Is the addon a button
    let hasBefore: boolean; // Does this input have an addon before
    let isBeforeBtn: boolean; // Is the addon after a button?
    let hasDropdown: boolean = false; // Does the input have a dropdown?

    let addon = el.querySelector('[slot="after"]');
    if (addon) {
        hasAfter = true;
    }
    let dropdown = el.querySelector('[slot="dropdown"]');
    if (dropdown) {
        hasAfter = true;
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
    return html`${when(hasAfter, () => html`<div part="input-group" class="input-group">
                    ${hasBefore ? html`<div class="addon"><slot name="addon-before"></slot></div>` : ``}
                    ${inputTemplate(el)}
                    ${hasDropdown ?
                        html`<button id="dropdown-toggle" @click="${el.toggleDropdown}"></button>` : 
                        html`<div class="addon"><slot name="after"></slot></div>`
                    }
                    ${el.active == true && el.addon && el.addonActive == true ?
                        html`<div class="addon"><slot name="addon-active"></slot></div>`
                    : `` }
                </div>`, () => inputTemplate(el))}
                ${hasDropdown ?
                html`<div id="dropdown-items" style="display:none"><slot name="dropdown"></slot></div>` :
                html`` }`;
}