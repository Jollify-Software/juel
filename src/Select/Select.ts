import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import style from 'bundle-text:./Select.less';
import { SelectService } from "./SelectService";
import { ChildrenMap } from "../_Utils/ChildrenMap";

@customElement("juel-select")
export class Select extends LitElement {

    static styles = unsafeCSS(style);

    service: SelectService;

    @property()
    data: any[];
    @property()
    multiple: boolean;

    value: any;

    constructor() {
        super();
        this.service = new SelectService();
    }

    firstUpdated() {
        this.service.init(this);
    }

    render() {
        return html`<div id="select">
            <div id="selected-placeholder">
            </div>
            <div id="items-container">
            ${ChildrenMap(this, (ele, index) => {
                    let id = ele.id ? ele.id :  `item-${index}`;
                    ele.setAttribute('slot', id);

                    return html`
                        <div class="item" data-index="${index}">
                        <slot name="${id}"></slot>
                        </div>`;
                })}
            </div>
        </div>`;
    }

}