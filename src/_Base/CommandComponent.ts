import { JuelComponent } from "./JuelComponent";

export class CommandComponent extends JuelComponent {

    getParentComponent(): JuelComponent {
        if (this.parentElement) {
            if ((<any>'getParentComponent') in this.parentElement) {
                return this.parentElement['getParentComponent']();
            } else {
                return this.parentElement as JuelComponent;
            }
        }
    }
    
    protected createRenderRoot(): HTMLElement | DocumentFragment {
        return this;
    }
}