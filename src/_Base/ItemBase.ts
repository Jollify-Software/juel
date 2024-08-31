import { PropertyValueMap } from "lit";
import { JuelComponent } from "./JuelComponent";
import { ListBase } from "./ListBase";

export class ItemBase extends JuelComponent {
    
    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if ('addItem' in this.parentElement) {
            let list = this.parentElement as ListBase;
            list.addItem(this);
        }
    }

}