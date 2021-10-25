import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
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

        this.multiple = false;
    }

    setData(data: any) {
        this.data = data;
        this.init();
    }

    setValue(value: any) {
        this.value = value
    }

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
        });
    }

    updated() {
        setTimeout(() => {
            this.init();   
        });
    }

    private init() {
        this.service.init(this);
        let items = this.shadowRoot.getElementById('items');
        items.style.display = "none";
        let trigger = this.shadowRoot.getElementById('trigger');
        $(trigger).on('click', (e) => {
            this.shadowRoot.getElementById('select').classList.toggle('open');
            if (this.menuShown == false) {
                items.style.display = "inline-block";
                items.style.opacity = "1";
                this.menu = createPopper(
                    trigger,
                    items
                );
                this.menuShown = true;
            } else {
                items.style.display = "none";
                items.style.opacity = "0";
                this.menu = null;
                this.menuShown = false;
            }
        });
    }

    GetPlaceholder() {
        let el = (Array.prototype.slice.call(this.children) as HTMLElement[])
                            .find(el => el.classList.contains("juel-item") && parseInt(el.dataset.index) == this.placeholderIndex);
        if (el) {
            return el.innerHTML;
        } else {
            return '';
        }
    }

    render() {
        let index = -1;
        return html`<div id="select">
            <div id="trigger">
                <div id="selected-placeholder">
                    ${this.placeholderIndex != null ? unsafeHTML(
                        this.GetPlaceholder()) : ``}
                </div>
                <div id="arrow"></div>
                ${ this.multiple == true && this.value.length > 1 ? html`<div id="badge">${this.value.length - 1}</div>` : `` }
            </div>
            <div id="items">
            ${ChildrenMap(this, (ele, i) => {
                let isHeading = false;
                if (ele.tagName.startsWith("H")) {
                    isHeading = true;
                } else {
                    index++;
                    ele.classList.add("juel-item");
                    ele.dataset.index = index as any;
                }
                    let id = ele.id ? ele.id :  `item-${i}`;
                    ele.setAttribute('slot', id);
                    
                    let klass = isHeading ? 'heading' : 'item';
                    if (this.data && this.data.length > 0 && this.data[index]) {
                        let value = this.data[index];
                        if (this.value.some(x => x == value)) {
                            klass += " selected";
                        }
                    }

                    return html`
                        <div class="${klass}" data-index="${index}"}>
                        <slot name="${id}"></slot>
                        </div>`;
                })}
            </div>
        </div>`;
    }

}