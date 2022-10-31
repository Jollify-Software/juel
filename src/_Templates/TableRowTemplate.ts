import { html, TemplateResult } from "lit";
import { map } from "lit/directives/map";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { JuelDataComponent } from "../_Base/JuelDataComponent";
import { ListBase } from "../_Base/ListBase";
import { PositionedTemplateResult } from "../_Core/PositionedTemplateResult";
import { data } from "../_Directives/DataDirective";

export function TableRowTemplate(component: ListBase, item: any, index: number, position: number): PositionedTemplateResult {
    let template: TemplateResult = null;
    position++;
    // TODO: Group row
    let klass = "item";
    if (component.selectedIndexes && component.selectedIndexes.some(i => i == position)) {
        klass += " selected"
    }
    let i = position;
    template = html`<tr ${data(ListBase.ValueKey, item)} @click="${e => component.selectItem(i)}" data-index="${position}">
    ${map(component.fields, field => {
        if (field.name in item) {
            return html`<td>${field.htmlFormatted || (component.searchResult && component.searchResult.fields && component.searchResult.fields.includes(field.name)) ? unsafeHTML(item[field.name]) : item[field.name]}<td>`;
        }
    })}
    </tr>`;

    return {
        position: position,
        template: template
    };
}