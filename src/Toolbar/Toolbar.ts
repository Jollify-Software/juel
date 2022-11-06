import { html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { map } from "lit/directives/map";
import { JuelComponent } from "../_Base/JuelComponent";
import { ToolbarItem } from "./ToolbarItem";
import Styles from 'bundle-text:./Toolbar.less';
import { ItemSelectedEventArgs } from "../_Core/Events/ItemSelectedEventArgs";
import { Dispatch } from "../_Core/DispatchFunction";
import { EventNames } from "../_Core/Events/EventNames";
import { FillTemplate } from "../_Utils/FillTemplate";

@customElement("juel-toolbar")
export class JuelToolbar extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property() items: ToolbarItem[];
    @property({ type: Boolean }) vertical: boolean;

    constructor() {
        super();
        this.items = [];
    }

    itemClicked(index: number, item: ToolbarItem) {
        let args: ItemSelectedEventArgs<ToolbarItem> = {
            index: index,
            item: item
        };
        Dispatch(this, EventNames.ItemSelected, args);
    }

    protected render(): unknown {
        let klass: string = "";
        if (this.vertical) {
            klass += " vertical";
        }
        return html`<div id="items" class="${klass}">
        ${this.items.map((item, index) => {
            let i = index;
            let itm = item;
            if (item.template) {
                return html`<div id="item-${i}" @click="${() => this.itemClicked(i, itm)}">${FillTemplate(itm.template, itm)}</div>`;
            } else {
                return html`<juel-button id="item-${i}" label="${ifDefined(item.label)}" @button-clicked=${() => this.itemClicked(i, itm)}><juel-button>`
            }
        })}
        </div>`;
    }
}