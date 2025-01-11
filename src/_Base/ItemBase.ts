import { PropertyValueMap } from "lit";
import { JuelComponent } from "./JuelComponent";
import { ListBase } from "./ListBase";
import { property } from "lit/decorators";
import { RippleEffect } from "../_Utils/RippleEffect";

export class ItemBase extends JuelComponent {

    @property() value: any;

    items: ItemBase[] = [];

    addItem(item: ItemBase) {
        if (this.items.includes(item) == false) {
            this.items.push(item);
            /*
            let index = this.items.indexOf(item);
            if (!item.id) {
                item.id = `${this.IdPrefix}-${index}`;
            }
            item.setAttribute("data-index", index.toString());
            if (this.itemsClickEvent) {
                let elForRipple: HTMLElement;
                if (item.title) {
                    let title = item.shadowRoot.querySelector(".title") as HTMLElement;
                    elForRipple = title;
                    if (title) title.onclick = (e: MouseEvent) => {
                        this.handleClick(e);
                        this.selectItem(index);
                    }
                } else {
                    item.onclick = (e: MouseEvent) => {
                        this.handleClick(e);
                        this.selectItem(index);
                    }
                    elForRipple = item;
                }
            }
                */
        }
            
    }
    
    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties);
        RippleEffect.init(this.shadowRoot)
        if ('addItem' in this.parentElement) {
            let list = this.parentElement as ListBase;
            list.addItem(this);
        }
    }

    clickListener(e: MouseEvent) {
        if ('onItemDeselected' in this.parentElement &&
            this.classList.contains(ListBase.selectedClass)
        ) {
            let list = this.parentElement as ListBase;
            list.onItemDeselected(null, this);
        } else if ('onItemSelected' in this.parentElement &&
            this.classList.contains(ListBase.selectedClass)
        ) {
            let list = this.parentElement as ListBase;
            list.onItemSelected(null, this);
        }
    }

}