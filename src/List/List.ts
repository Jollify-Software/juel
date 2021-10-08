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
        this.service.init(this);
    }

    render() {
        return html`<div id="list">
            <div id="selected-placeholder">
            </div>
            <ul id="items-container">
            ${ChildrenMap(this, (ele, index) => {
                    let id = ele.id ? ele.id :  `item-${index}`;
                    ele.setAttribute('slot', id);

                    return html`
                        <li class="item" data-index="${index}">
                        <slot name="${id}"></slot>
                        </li>`;
                })}
            </ul>
        </div>`;
    }

}