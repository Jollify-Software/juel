import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./List.less';
import { ListService } from "./ListService";
import { ChildrenMap } from "../_Utils/ChildrenMap";

@customElement("juel-list")
export class JuelList extends LitElement {

    static styles = unsafeCSS(style);

    service: ListService;

    @property()
    data: any[];
    @property({ type: Boolean })
    multi: boolean;

    selected: any[];

    constructor() {
        super();
        this.service = new ListService();
    }
    

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
        });
    }

    updated() {
        setTimeout(() => {
            this.service.init(this);
        });
    }

    render() {
        let index = -1;
        return html`<div id="list">
            <div id="selected-placeholder">
            </div>
            <ul id="items-container">
            ${ChildrenMap(this, (ele, i) => {
                    let isHeading = false;
                    if (ele.tagName.startsWith("H")) {
                        isHeading = true;
                    } else {
                        index++;
                        ele.classList.add("juel-item");
                    }
                    let id = ele.id ? ele.id :  `item-${i}`;
                    ele.setAttribute('slot', id);
                    return html`
                        <li class="${isHeading == true ? `heading` : `item`}" data-index="${index}">
                        <slot name="${id}"></slot>
                        </li>`;
                })}
            </ul>
        </div>`;
    }

}