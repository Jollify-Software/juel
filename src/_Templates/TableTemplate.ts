import { html } from "lit";
import { map } from "lit/directives/map";
import { ListBase } from "../_Base/ListBase";
import { TableRowTemplate } from "./TableRowTemplate";

export function TableTemplate(list: ListBase) {
    let position: number = -1;
    return html`<table id="items">
    <tr>
    ${map(list.fields, field => {
        return html`<th>${field.text}</th>`;
    })}
    </tr>
    ${list.searchResult ?
        map(list.searchResult.data, (item, index) => {
            let res = TableRowTemplate(list, item, index, position);
            position = res.position;
            return res.template;
        }) :
        map(list.data, (item, index) => {
            let res = TableRowTemplate(list, item, index, position);
            position = res.position;
            return res.template;
    })}
    <table>`;
}