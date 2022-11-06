import { PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators";
import { CommandComponent } from "../_Base/CommandComponent";
import { JuelToolbar } from "./Toolbar";

export interface ToolbarItem {
    id?: string,
    name?: string,
    label?: string;
    icon?: string,
    template?: string,
    data?: any,
    items?: ToolbarItem[]
}

@customElement("juel-toolbar-item")
export class JuelToolbarItem extends CommandComponent {

    @property() name: string;
    @property() label: string;
    @property() icon: string;

    item: ToolbarItem;

    constructor() {
        super();
        this.item = {};
    }

    load(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.item.id = this.id;
        this.item.name = this.name;
        this.item.label = this.label;
        let template = this.querySelector("template");
        if (template) {
            this.item.template = template.innerHTML;
        }

        if (this.parentElement.nodeName.toUpperCase() == "JUEL-TOOLBAR") {
            let parent = this.parentElement as JuelToolbar;
            if (!parent.items.some(i => i == this.item)) {
                parent.items.push(this.item);
                parent.requestUpdate();
            }
        } else if (this.parentElement.nodeName.toUpperCase() == "JUEL-TOOLBARITEM") {
            let parent = this.parentElement as JuelToolbarItem;
            if ((!parent.item.items) && parent.item.items.length > 0) {
                parent.item.items = [];
            }
            if (!parent.item.items.some(i => i == this.item)) {
                parent.item.items.push(this.item);
                let com = this.getParentComponent()
                com.requestUpdate();
            }
        }        
    }
}