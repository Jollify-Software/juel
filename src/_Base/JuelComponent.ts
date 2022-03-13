import { LitElement, PropertyValueMap } from "lit";

export class JuelComponent extends LitElement {
    loaded: boolean = false;

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        setTimeout(() => {
            this.requestUpdate();
        });
        super.firstUpdated(_changedProperties);
    }

    protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.loaded == false) {
            setTimeout(() => {
                this.load();
            });
            this.loaded = true;
        }
        super.updated(_changedProperties);
    }

    load() {

    }
}