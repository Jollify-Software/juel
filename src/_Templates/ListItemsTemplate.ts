import { html, TemplateResult } from "lit";
import { JuelDataComponent } from "../_Base/JuelDataComponent";
import { ListBase } from "../_Base/ListBase";
import { ChildrenItemsTemplate } from "./ChildrenItemsTempate";
import { ItemTemplate } from "./ItemTemplate";

export function ListItemsTemplate(list: JuelDataComponent): TemplateResult {
    if (list.searchResult) {
        let position = -1;
        return html`${list.searchResult.data.map((value, index) => {
            let res = ItemTemplate(list, value, index, position);
            position = res.position;
            return res.template;
        })}`;
    } else if (list.data && list.data.length > 0) {
        let position = -1;
        return html`${list.data.map((value, index) => {
            let res = ItemTemplate(list, value, index, position);
            position = res.position;
            return res.template;
        })}`;
    } else {
        return ChildrenItemsTemplate(list);
    }
}