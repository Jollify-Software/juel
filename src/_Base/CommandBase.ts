import { LitElement } from "lit";
import { JuelComponent } from "./JuelComponent";

export class CommandBase extends LitElement {

    getParentComponent(): JuelComponent {
        if (this.parentElement) {
            if ('getParentComponent' in this.parentElement) {
                return (<any>this.parentElement)['getParentComponent']() as JuelComponent;
            } else {
                return this.parentElement as JuelComponent;
            }
        }
    }

    protected createRenderRoot(): HTMLElement | DocumentFragment {
        return this;
    }
}