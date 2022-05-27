import { html, TemplateResult } from "lit";
import { when } from 'lit/directives/when'
import { InputBase } from "../_Base/InputBase";
import { ButtonTemplate } from "./ButtonTemplate";
import { InputTypes } from "./InputTypes";
import { RangeTemplate } from "./RangeTemplate";
import { TextTemplate } from "./TextTemplate";
import { TickboxTemplate } from "./TickboxTemplate";


export function InputGroupTemplate(el: InputBase, type: InputTypes) {
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
        default:
            break;
    }
    return html`${when(el.addon, () => html`<div part="input-group" class="input-group">
                    ${inputTemplate(el)}
                    ${el.addon && el.addon == "dropdown" ?
                        html`<button id="dropdown-toggle" @click="${el.toggleDropdown}"></button>` : 
                        html`<div class="addon"><slot name="addon"></slot></div>`
                    }
                    ${el.active == true && el.addon && el.addonActive == true ?
                        html`<div class="addon"><slot name="addon-active"></slot></div>`
                    : `` }
                </div>`, () => inputTemplate(el))}
                ${el.addon && el.addon == "dropdown" ?
                html`<div id="dropdown-items" style="display:none"><slot name="dropdown"></slot></div>` :
                html`` }`;
}