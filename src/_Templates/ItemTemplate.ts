import { html, nothing, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { when } from "lit/directives/when";
import { JuelComponent } from "../_Base/JuelComponent";
import { JuelContainerComponent } from "../_Base/JuelContainerComponent";
import { JuelDataComponent } from "../_Base/JuelDataComponent";
import { ListBase } from "../_Base/ListBase";
import { Dispatch } from "../_Core/DispatchFunction";
import { EventNames } from "../_Core/Events/EventNames";
import { PositionedTemplateResult } from "../_Core/PositionedTemplateResult";
import { data } from "../_Directives/DataDirective";
import { FillTemplate, FillTemplateUnsafe } from "../_Utils/FillTemplate";

export function ItemTemplate(component: JuelContainerComponent, item: any, index: number, position: number, level: number = 0, idStr: string, posStr: string): PositionedTemplateResult {
    let el: HTMLElement = null;
    let list: ListBase = null;
    let template: TemplateResult = null;
    let isHeading = false;

    if ('multiselect' in component) {
        list = component as ListBase;
    }
    // If the item is an element
    if (typeof item == "object" && 'nodeName' in item) {
        el = item
    }

    let i = position;
    let id = idStr ? `${idStr}-${position}` : `item-${position}`;
    let nposStr = posStr ? `${posStr}-${position}` : `${position}`;
    let klass = "item";
    let hasTitle = el && el.hasAttribute(`data-${component.titleAttrName}`);
    let containerIsList = component.itemsContainer.nodeName == "UL";
    let titleElId = `${id}-${component.titleAttrName}`;
    let titleEl = !el ? null : component.titleIsNext ?
        el.nextElementSibling :
        el.previousElementSibling as HTMLElement;

    if (list && ((el && el.tagName.startsWith("H")) || (typeof item == "object" && item.heading))) {
        isHeading = true;
    }

    if (titleEl && titleEl.matches(`${component.titleSlotSelector}, h1, h2, h3, h4, h5, h6`)) {
        hasTitle = true;
        titleEl.setAttribute('slot', titleElId);
    }

    // Item and title events
    let itemClick: (e: Event) => void;
    let titleClick: (e: Event) => void;
    // Only use titleClick if have title
    if (hasTitle) {
        titleClick = (e: Event) => {
            Dispatch(component, EventNames.TitleClick, null);
            component.selectItem(i);
        };
        itemClick = (e: Event) => {
            Dispatch(component, EventNames.ItemClick, null);
        };
    } else {
        itemClick = (e: Event) => {
            Dispatch(component, EventNames.ItemClick, null);
            component.selectItem(i);
        };
    }

    if (el) {
        el.setAttribute('slot', id);
        el.classList.add("item");
        if (component.itemsDraggable == false) {
            el.setAttribute('draggable', 'false');
            el.setAttribute('ondragstart', "event.preventDefault();")
        }
    }
    // If element is nested then flatten the DOM tree by removing and adding to 'this' element
    if (level > 0) {
        el.remove();
        this.append(el);
        if (component.titlesContainer) {
            component.titlesContainer.classList.add("group");
        }
    }

    let itemTitle: TemplateResult = html``
    if (containerIsList) {
        if (el) {
            if (isHeading) {
                template = html`<li class="${klass}" part="item">
                <slot name="${id}"></slot>
                </li>`;
            } else {
                template = html`<li @click="${() => list.selectItem(i)}" class="${klass}" data-index="${position}" part="item">
                <slot name="${id}"></slot>
                </li>`;
            }
        } else {
            if (list.fields && list.fields.length > 0) {
                template = html`<tr class="${klass}"><tr>`;
            } else {
                template = html`<li @click="${() => list.selectItem(i)}" class="${klass}" ${data(ListBase.ValueKey, item)} data-index="${index}" part="item">
            ${list.searchResult ? component.template ? FillTemplateUnsafe(component.template, item) : unsafeHTML(item[list.textField]) : FillTemplate(component.template, item)}
            </li>`;
            }
        }
    } else {
        if (hasTitle) {
            if (component.titlesContainer) {
                let itemTitle = document.createElement("div");
                itemTitle.className = component.titleAttrName;
                let titleSlot = document.createElement("slot");
                titleSlot.name = titleElId;
                itemTitle.append(titleSlot);
                itemTitle.setAttribute("data-index", nposStr);
                itemTitle.onclick = titleClick;
                //itemClick = () => void
                component.titlesContainer.append(itemTitle);
            } else {
            itemTitle = html`<div class="${component.titleAttrName}" @click=${titleClick}>
                ${when(el.dataset[component.titleAttrName],
                    () => html`${el.dataset[component.titleAttrName]}`,
                    () => html`<slot name="${titleElId}"></slot>`
                )}
            </div>`;
            }
            // If items container is an unordered list then a
            if (component.itemsContainer.nodeName == "UL") {
                template = html`${itemTitle}`;
            } 
        }
        if (el) {
            template = html`${when(containerIsList, () => itemTitle)}
            <div @click="${itemClick}" class="${klass}" data-index="${nposStr}" part="item">
                ${when(containerIsList == false && (!component.titlesContainer), () => itemTitle)}
                <div class="item-content"><slot name="${id}"></slot></div>
                </div>`;
        } else {
            template = html`<div class="${klass}" ${data("data", item)} data-index="${index}" part="item">
            ${FillTemplate(component.template, item)}
            </div>`;
        }
    }

    return {
        position: position,
        template: template
    };
}