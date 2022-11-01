import { html } from "lit";
import { map } from "lit/directives/map";
import { ListBase } from "../_Base/ListBase";
import { TableRowTemplate } from "./TableRowTemplate";

export function TableTemplate(list: ListBase) {
    let position: number = -1;
    return html`<table id="items">
    <colgroup>
    ${map(list.fields.filter(x => x.visible), (field, index) => {
        return html`<col class="col-${field.name}">`;
    })}
    <colgroup>
    <thead><tr>
    ${map(list.fields.filter(x => x.visible), field => {
        return html`<th>${field.text}</th>`;
    })}
    </tr></thead>
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