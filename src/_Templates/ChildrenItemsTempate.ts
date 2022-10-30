import { html } from "lit";
import { ListBase } from "../_Base/ListBase";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { ItemTemplate } from "./ItemTemplate";

export function ChildrenItemsTemplate(list: ListBase, exclude: string = null) {
    let position = -1;
    return html`${ChildrenMap(list, (ele, i) => {
        let res = ItemTemplate(list, ele, i, position);
        position = res.position;
        return res.template;
    }, exclude)}`
}