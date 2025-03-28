import { PropertyValueMap } from "lit";
import { JuelComponent } from "../_Base/JuelComponent";
import { RippleEffect } from "../_Utils/RippleEffect";

export class NavigationBase extends JuelComponent {
    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties);
        RippleEffect.init(this.shadowRoot);
    }   
}