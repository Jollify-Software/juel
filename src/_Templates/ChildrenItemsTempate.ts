import { html } from "lit";
import { map } from "lit/directives/map";
import { JuelComponent } from "../_Base/JuelComponent";
import { JuelContainerComponent } from "../_Base/JuelContainerComponent";
import { ListBase } from "../_Base/ListBase";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { ItemTemplate } from "./ItemTemplate";

function isItem(el: HTMLElement, level: number) {
    if ((el.hasAttribute(`data-${this.titleAttrName}`) || el.classList.contains("item") ||
        (el.hasAttribute("slot") == false && level == 0)) &&
        ([ 'TEMPLATE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].every(h => h != el.nodeName))) {
        return true;
    } else {
        let titleEl = this.titleIsNext ?
            el.nextElementSibling :
            el.previousElementSibling as HTMLElement;
        if (titleEl && titleEl.matches(this.titleSlotSelector)) {
            return true;
        }
    }
    return false;
}

export async function ChildrenItemsTemplate(component: JuelContainerComponent, children: HTMLElement[],
    level: number = 0, idStr: string, posStr: string, ...exclude: string[]) {
    await component.readyPromise;
    if (exclude && exclude.length > 0) {
        for (let sel of exclude) {
            children = children.filter(el => !el.matches(sel));
        }
    }
    children = children.filter(el => isItem(el, level));
    component.itemsCount = children.length;
    component.style.setProperty("--items-count", children.length.toString());
    setTimeout(() => {
        component.itemsCreated();   
    });
    let position = -1;
    return html`${map(children, (ele, i) => {
        position++;
        let res = ItemTemplate(component, ele, i, position, 0, null, null);
        position = res.position;
        return res.template;
    })}`
}