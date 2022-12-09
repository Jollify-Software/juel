import { html, nothing, TemplateResult } from "lit";
import { JuelDataComponent } from "../_Base/JuelDataComponent";
import { ListBase } from "../_Base/ListBase";
import { ChildrenItemsTemplate } from "./ChildrenItemsTempate";
import { ItemTemplate } from "./ItemTemplate";
import { TableTemplate } from "./TableTemplate";

export async function ListItemsTemplate(list: ListBase): Promise<TemplateResult> {
    await list.templatePromise
    if (list.fields && list.fields.length > 0) {
        return TableTemplate(list);
    } else {
        let position = -1;
        return html`${list.searchResult ? html`${list.searchResult.data.map((value, index) => {
            let res = ItemTemplate(list, value, index, position, 0, null, null);
            position = res.position;
            return res.template;
        })}` : (list.data && list.data.length > 0) ? html`${list.data.map((value, index) => {
            let res = ItemTemplate(list, value, index, position, 0, null, null);
            position = res.position;
            return res.template;
        })}` : nothing}`;
    }
}