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
            <div id="selected-placeholder">
            </div>
            <ul id="items">
            ${when(hasTemplate && this.data && this.data.length,
                () => html`${this.data.map(value => {
                    index++;
                    let klass = "item";
                    if (this.selectedIndexes && this.selectedIndexes.some(i => i == index)) {
                        klass += " selected"
                    }
                    let i = index;
                    return html`<li @click="${() => this.selectItem(i)}" class="${klass}" ${data("data", value)} data-index="${index}">
                    ${FillTemplate(template.innerHTML, value)}
                    </li>`;
                })}`,
                () => html`${ChildrenMap(this, (ele, i) => {
                    let isHeading = false;
                    if (ele.tagName.startsWith("H")) {
                        isHeading = true;
                    } else {
                        index++;
                        ele.classList.add("juel-item");
                        $(ele).find(".juel-appear").hide();
                    }
                    let id = ele.id ? ele.id :  `item-${i}`;
                    ele.setAttribute('slot', id);
                    let klass = isHeading ? "heading" : "item";
                    if (this.selectedIndexes && this.selectedIndexes.some(i => i == index)) {
                        klass += " selected"
                    }
                    let ind = index;
                    return html`${when(isHeading,
                        () => html`<li class="${klass}")}>
                        <slot name="${id}"></slot>
                        </li>`,
                        () => html`<li @click="${() => this.selectItem(ind)}" class="${klass}" data-index="${index}">
                        <slot name="${id}"></slot>
                        </li>`)}`;
                })}`)}
            </ul>
        </div>`;
    }

}