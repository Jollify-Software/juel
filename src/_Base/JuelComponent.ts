import { CSSResult, CSSResultGroup, LitElement, PropertyValueMap } from "lit";
import { property } from "lit/decorators";
import { FindParent } from "../_Utils/FindParent";

export class JuelComponent extends LitElement {

    @property() juelParent: JuelComponent;
    loaded: boolean = false;

    readyPromise: Promise<any>;
    hasUpdated: boolean;

    template: string;

    childrenLoaded() {

    }

    protected updated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.readyPromise) {
            this.readyPromise.then(() => {
                this.childrenLoaded();
                let juelParent = FindParent(this, (node) => node.nodeName.startsWith("JUEL"));
                if (juelParent && 'childrenUpdated' in juelParent) {
                    (juelParent as unknown as JuelComponent).childrenLoaded();
                }
            });
        }
    }

    get(property) {
        if (property in this) {
            return this[property];
        }
        return null;
    }

    set(property: string, value: any) {
        if (property in this) {
            this[property] = value;
        }
    }
}