import { html, nothing, TemplateResult } from "lit";
import { JuelDataComponent } from "../_Base/JuelDataComponent";
import { ListBase } from "../_Base/ListBase";
import { ChildrenItemsTemplate } from "./ChildrenItemsTempate";
import { ItemTemplate } from "./ItemTemplate";
import { TableTemplate } from "./TableTemplate";

export function ListItemsTemplate(list: ListBase): TemplateResult {
    if (list.fields && list.fields.length > 0) {
        return TableTemplate(list);
    } else {
        let position = -1;
        return html`<ul id="items">${list.searchResult ? html`${list.searchResult.data.map((value, index) => {
            let res = ItemTemplate(list, value, index, position);
            position = res.position;
            return res.template;
        })}` : (list.data && list.data.length > 0) ? html`${list.data.map((value, index) => {
            let res = ItemTemplate(list, value, index, position);
            position = res.position;
            return res.template;
        })}` : ChildrenItemsTemplate(list as ListBase)
            }</ul>`;
    }
}