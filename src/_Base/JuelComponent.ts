import { CSSResult, CSSResultGroup, LitElement, PropertyValueMap } from "lit";
import { property } from "lit/decorators";
import { FindParent } from "../_Utils/FindParent";

export class JuelComponent extends LitElement {

    @property() juelParent: JuelComponent;
    loaded: boolean = false;

    readyPromise: Promise<any>;
    readyResolve: (value: any) => void;
    hasUpdated: boolean;

    template: string;

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.parentElement && 'childFirstUpdated' in this.parentElement) {
            (<JuelComponent>this.parentElement).childFirstUpdated(this);
        }
        $.when($.ready).then(() => {
            this.ready();
        });
        super.firstUpdated(_changedProperties);
    }

    updateChildren() {
        for (let child of this.children) {
            if ('requestUpdate' in child) {
                (<LitElement>child).requestUpdate();
            }
        }
    }

    childFirstUpdated(element: JuelComponent) {

    }

    childUpdated(element: JuelComponent) {

    }

    ready() {

    }

    childrenLoaded() {

    }

    protected updated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.parentElement && 'childUpdated' in this.parentElement) {
            (<JuelComponent>this.parentElement).childUpdated(this);
        }
        $.when($.ready).then(() => {
            this.load(_changedProperties);
        });
        this.loaded = true;
        super.updated(_changedProperties);
    }

    load(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
        this.childrenLoaded();
        let juelParent = FindParent(this, (node) => node.nodeName.startsWith("JUEL"));
        if (juelParent && 'childrenUpdated' in juelParent) {
            (juelParent as unknown as JuelComponent).childrenLoaded();
        }
    }

    getChildren() {
        return Array.from(this.children) as HTMLElement[];
    }

    /**
     * All event names begin with 'on', so this function lists all the Object.Keys that start with 'on'
     */
    listEventNames() {
        let names = Object.keys(this)
            .filter(key => key.startsWith("on") && typeof this[key] == 'function');
        return names;
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

    fire(name: string, args: any) {
        let evt = new CustomEvent(name, {
            detail: args
        });
        this.dispatchEvent(evt);
    }
}