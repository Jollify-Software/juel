import { LitElement, html, unsafeCSS, nothing } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./List.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { JuelComponent } from "../_Base/JuelComponent";
import { when } from "lit/directives/when";
import { FillTemplate } from "../_Utils/FillTemplate";
import { data } from "../_Directives/DataDirective";
import { ListBase } from "../_Base/ListBase";
import { ifDefined } from "lit/directives/if-defined";
import { ItemTemplate } from "../_Templates/ItemTemplate";
import { ChildrenItemsTemplate } from "../_Templates/ChildrenItemsTempate";
import { ListItemsTemplate } from "../_Templates/ListItemsTemplate";

@customElement("juel-list")
export class JuelList extends ListBase {

    static styles = unsafeCSS(style);

    constructor() {
        super();
    }

    render() {
        let template = this.querySelector("template");
        let hasTemplate = template != null;

        let index = -1;
        return html`<div id="list">
            ${when(this.input, () => html`<input type="text" @input="${e => this.inputChange(e)}">`, () => html`<div id="selected-placeholder">`)}
            </div>
            <ul id="items">
            ${ListItemsTemplate(this)}
            </ul>
        </div>`;
    }

}