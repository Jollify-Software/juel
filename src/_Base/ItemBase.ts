import { PropertyValueMap } from "lit";
import { JuelComponent } from "./JuelComponent";
import { ListBase } from "./ListBase";
import { property } from "lit/decorators";

export class ItemBase extends JuelComponent {

    @property() value: any;
    
    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
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