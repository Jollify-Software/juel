import { PropertyValueMap } from "lit";
import { JuelComponent } from "../_Base/JuelComponent";
import { JuelMap } from "./Map";

export class JuelMapObject extends JuelComponent {

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if ('getMap' in this.parentElement) {
            let parent = this.parentElement as JuelMap;
            parent.isReady.then(() => {
                this.ready(parent.getMap());
            });
        }
    }

    ready(map: L.Map) {

    }

    bindPopup(obj: any) {
        setTimeout(() => {
            if (this.firstElementChild) {
                obj.bindPopup(this.firstElementChild as any)
            }
        });
    }

}