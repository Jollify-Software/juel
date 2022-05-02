import { LitElement, PropertyValueMap } from "lit";

export class JuelComponent extends LitElement {
    loaded: boolean = false;

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        setTimeout(() => {
            this.requestUpdate();
            setTimeout(() => {
                this.firstLoad();
            });
        });
        super.firstUpdated(_changedProperties);
    }

    firstLoad() {

    }

    protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        setTimeout(() => {
            setTimeout(() => {
                this.load(_changedProperties);
            });
        });
        this.loaded = true;
        super.updated(_changedProperties);
    }

    load(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {

    }
}