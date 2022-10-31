import { html, nothing, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { JuelDataComponent } from "../_Base/JuelDataComponent";
import { ListBase } from "../_Base/ListBase";
import { PositionedTemplateResult } from "../_Core/PositionedTemplateResult";
import { data } from "../_Directives/DataDirective";
import { FillTemplate, FillTemplateUnsafe } from "../_Utils/FillTemplate";

export function ItemTemplate(component: JuelDataComponent, item: any, index: number, position: number): PositionedTemplateResult {
    let el: HTMLElement = null;
    let list: ListBase = null;
    let template: TemplateResult = null;
    let isHeading = false;

    if ('selectItem' in component) {
        list = component as ListBase;
    }
    if ('nodeName' in item) {
        el = item
    }

    if (list && ((el && el.tagName.startsWith("H")) || ('heading' in item && item.heading))) {
        isHeading = true;
    } else {
        position++;
        if (el) {
            el.classList.add("juel-item");
            $(el).find(".juel-appear").hide();
        }
    }
    let id = el && el.id ? el.id : `item-${index}`;
    if (el) {
        el.setAttribute('slot', id);
    }
    let klass = isHeading ? "heading" : "item";
    if (list && list.selectedIndexes && list.selectedIndexes.some(i => i == position)) {
        klass += " selected"
    }
    let ind = position;
    if (list) {
        if (el) {
            if (isHeading) {
                template = html`<li class="${klass}")}>
                <slot name="${id}"></slot>
                </li>`;
            } else {
                template = html`<li @click="${() => list.selectItem(ind)}" class="${klass}" data-index="${position}">
                <slot name="${id}"></slot>
                </li>`;
            }
        } else {
            if (isHeading) {
                template = html`<li @click="${() => list.selectItem(ind)}" class="${klass}" ${data("data", item)}>
            ${FillTemplate(component.template, item)}
            </li>`;
            } else {
                template = html`<li @click="${() => list.selectItem(ind)}" class="${klass}" ${data("data", item)} data-index="${index}">
            ${list.searchResult ? component.template ? FillTemplateUnsafe(component.template, item) : unsafeHTML(item[list.textField]) : FillTemplate(component.template, item)}
            </li>`;
            }
        }
    } else {
        if (el) {
            template = html`<div class="${klass}" data-index="${position}">
                <slot name="${id}"></slot>
                </div>`;
        } else {
            template = html`<div class="${klass}" ${data("data", item)} data-index="${index}">
            ${FillTemplate(component.template, item)}
            </div>`;
        }
    }

    return {
        position: position,
        template: template
    };
}