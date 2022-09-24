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
    let appendClass = "append right-rounded";
    let isAfterBtn: boolean; // Is the addon a button
    let hasPrepend: boolean; // Does this input have an addon before
    let prependClass = "prepend left-rounded";
    let isBeforeBtn: boolean; // Is the addon after a button?
    let hasDropdown: boolean = false; // Does the input have a dropdown?
    let klass: string = '' // The main class for the input

    let addons = el.querySelectorAll('[slot="append"]');
    if (addons.length > 0) {
        hasAppend = true;
    } else {
        klass += " right-rounded";
    }
    let dropdown = el.querySelector('[slot="dropdown"]');
    if (dropdown) {
        hasAppend = true;
        hasDropdown = true;
        // The dropdown is an addon so remove the right-rounded class
        klass = klass.replace("right-rounded", '');
    }
    addons = el.querySelectorAll('[slot="prepend"]');
    if (addons.length > 0) {
        hasPrepend = true;
    } else {
        klass += " left-rounded";
    }

    let inputTemplate: (el: InputBase, klass:string) => TemplateResult;
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
                    ${hasPrepend ? html`<div class="${prependClass}"><slot name="prepend"></slot></div>` : ``}
                    ${inputTemplate(el, klass)}
                    ${hasDropdown ?
            html`<button id="dropdown-toggle" class="${appendClass}" @click="${el.toggleDropdown}"></button>` :
            html`<div class="${appendClass}"><slot name="append"></slot></div>`
        }
                    ${el.active == true && el.addon && el.addonActive == true ?
            html`<div class="${appendClass}"><slot name="append-active"></slot></div>`
            : ``}
                </div>`, () => inputTemplate(el, klass))}
                ${hasDropdown ?
            html`<div id="dropdown-items" style="display:none"><slot name="dropdown"></slot></div>` :
            html``}`;
}