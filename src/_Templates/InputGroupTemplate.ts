import { html, TemplateResult } from "lit-element/lit-element";
import { InputBase } from "../_Base/InputBase";
import { ButtonTemplate } from "./ButtonTemplate";
import { InputTypes } from "./InputTypes";


export function InputGroupTemplate(el: InputBase, type: InputTypes) {
    let hasText = el.text != undefined;
    let inputTemplate: (el: InputBase, hasText: boolean) => TemplateResult;
    switch (type) {
        case InputTypes.Button:
            inputTemplate = ButtonTemplate;
            break;
        default:
            break;
    }
    return html`
            ${el.addon ?
            html`<div class="input-group">
                        ${inputTemplate(el, hasText)}
                        ${el.active == true && el.addonActive == true ?
                    html`<slot name="addon-active"></slot>`
                    :
                    el.addon == "dropdown" ?
                        html`<button id="dropdown-toggle" @click="${el.toggleDropdown}">
                                    </button>` : html`<slot name="addon"></slot>`
                }
                </div>
                <div id="dropdown-items" style="display:none"><slot name="dropdown"></slot></div>` :
            inputTemplate(el, hasText)
        }
        `;
}