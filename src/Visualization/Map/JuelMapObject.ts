import { PropertyValueMap } from "lit";
import { JuelComponent } from "../../_Base/JuelComponent";
import { JuelMap } from "./Map";
import { property } from "lit/decorators";
import { DOMStringMapConverter } from "../../_Converters/DOMStringMapConvertor";

export class JuelMapObject extends JuelComponent {

    @property({ converter: DOMStringMapConverter }) styles: object;

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

    extendStyles(options: any) {
        $.extend(options, this.styles);
    }

    bindPopup(obj: any) {
        setTimeout(() => {
            if (this.firstElementChild) {
                obj.bindPopup(this.firstElementChild as any)
            }
        });
    }

}