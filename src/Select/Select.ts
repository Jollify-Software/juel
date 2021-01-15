import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import { unsafeHTML } from "lit-html/directives/unsafe-html";
import { createPopper, Instance } from '@popperjs/core';
import style from 'bundle-text:./Select.less';
import { SelectService } from "./SelectService";
import { ChildrenMap } from "../_Utils/ChildrenMap";

/**
 * ## Universal CSS Properties
 * * --background-colour-primary;
 * * --background-colour-secondary;
 */
@customElement("juel-select")
export class Select extends LitElement {

    static styles = unsafeCSS(style);

    service: SelectService;

    @property()
    data: any[];
    @property({ type: Boolean })
    multiple: boolean;

    menu: Instance;
    menuShown: boolean = false;
    placeholderIndex: number = null;

    @property()
    value: any[] = [];

    constructor() {
        super();
        this.service = new SelectService();
    }

    firstUpdated() {
        this.service.init(this);
        let items = this.shadowRoot.getElementById('items');
        items.style.display = "none";
        let trigger = this.shadowRoot.getElementById('trigger');
        $(trigger).on('click', (e) => {
            if (this.menuShown == false) {
                items.style.display = "inline-block";
                items.style.opacity = "1";
                this.menu = createPopper(
                    trigger,
                    items
                    );
                this.menuShown = true;
            } else {
                items.style.display = "none"
                items.style.opacity = "0";
                this.menu = null
                this.menuShown = false;
            }
        });
    }

    render() {
        return html`<div id="select">
            <div id="trigger">
                <div id="selected-placeholder">
                    ${this.placeholderIndex != null ? unsafeHTML(
                        (this.children.item(this.placeholderIndex) as HTMLElement).innerHTML
                        ) : ``}
                </div>
                <div id="down-arrow"></div>
                ${ this.multiple == true && this.value.length > 1 ? html`<div id="badge">${this.value.length - 1}</div>` : `` }
            </div>
            <div id="items">
            ${ChildrenMap(this, (ele, index) => {
                    let id = ele.id ? ele.id :  `item-${index}`;
                    ele.setAttribute('slot', id);

                    let klass = 'item';
                    if (this.data && this.data.length > 0 && this.data[index]) {
                        let value = this.data[index];
                        if (this.value.some(x => x == value)) {
                            klass += " selected";
                        }
                    }

                    return html`
                        <div class="${klass}" data-index="${index}">
                        <slot name="${id}"></slot>
                        </div>`;
                })}
            </div>
        </div>`;
    }

}