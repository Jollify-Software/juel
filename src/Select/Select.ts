import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { createPopper, Instance } from '@popperjs/core';
import style from 'bundle-text:./Select.less';
import { SelectService } from "./SelectService";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { JuelComponent } from "../_Base/JuelComponent";

/**
 * ## Universal CSS Properties
 * * --background-colour-primary;
 * * --background-colour-secondary;
 */
@customElement("juel-select")
export class Select extends JuelComponent {

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
    items: HTMLElement;
    trigger: HTMLElement;

    constructor() {
        super();
        // TODO: I am not sure abouut using a service for the list or select components.
        // I think we could use the Data directive and set each element's data in the render method.
        this.service = new SelectService();

        this.multiple = false;
    }

    setData(data: any) {
        this.data = data;
        this.requestUpdate();
    }

    setValue(value: any) {
        this.value = value
        this.requestUpdate();
    }

    firstLoad() {
        this.service.init(this);
        this.menuShown = false;
        this.items = this.shadowRoot.getElementById('items');
        this.items.style.display = "none";
        this.trigger = this.shadowRoot.getElementById('trigger');
        $(this.trigger).off("click").on('click', (e) => {
            console.log("Menu is shown " + this.menuShown)
            this.shadowRoot.getElementById('select').classList.toggle('open');
            if (this.menuShown == false) {
                this.show();
            } else {
                this.hide();
            }
        });
    }

    hide() {
        this.items.style.display = "none";
        this.items.style.opacity = "0";
        this.menu = null;
        this.menuShown = false;
    }

    show() {
        this.items.style.display = "inline-block";
        this.items.style.opacity = "1";
        this.menu = createPopper(
            this.trigger,
            this.items
        );
        this.menuShown = true;
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
                ${ this.multiple == true && this.value && this.value.length > 1 ? html`<div id="badge">${this.value.length - 1}</div>` : `` }
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
                        if (this.value && 'some' in this.value && this.value.some(x => x == value)) {
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