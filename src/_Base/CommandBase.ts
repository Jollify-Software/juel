import { LitElement } from "lit";
import { JuelComponent } from "./JuelComponent";

export class CommandBase extends LitElement {

    getParentComponent(): JuelComponent {
        if (this.parentElement) {
            if ('getParentComponent' in this.parentElement) {
                return this.parentElement['getParentComponent']();
            } else {
                return this.parentElement as JuelComponent;
            }
        }
    }

    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }
}