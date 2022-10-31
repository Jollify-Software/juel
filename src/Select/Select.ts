import { LitElement, html, unsafeCSS, nothing } from "lit";
import { property, customElement } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { createPopper, Instance } from '@popperjs/core';
import style from 'bundle-text:./Select.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { JuelComponent } from "../_Base/JuelComponent";
import { ListBase } from "../_Base/ListBase";
import { when } from "lit/directives/when";
import { ListItemsTemplate } from "../_Templates/ListItemsTemplate";

/**
 * ## Universal CSS Properties
 * * --background-colour-primary;
 * * --background-colour-secondary;
 */
@customElement("juel-select")
export class Select extends ListBase {

    static styles = unsafeCSS(style);

    menu: Instance;
    menuShown: boolean = false;

    items: HTMLElement;
    trigger: HTMLElement;

    constructor() {
        super();
        this.menuShown = false;
    }

    firstLoad() {
        this.items = this.shadowRoot.getElementById('items');
        this.items.style.display = "none";
    }

    toggle() {
        this.shadowRoot.getElementById('select').classList.toggle('open');
        if (this.menuShown == false) {
            this.show();
        } else {
            this.hide();
        }
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

    onInput(e: Event): void {
        this.show();
        super.onInput(e);
    }

    onItemSelected(index: number, el: HTMLElement): void {
        console.log("Item selected")
        if (this.placeholderIndex == null || (this.placeholderIndex != index && this.multiselect == false)) {
            this.placeholderIndex = index;
            
        }
        console.log(this.placeholderIndex)
        if (!this.multiselect) {
            this.hide();
        }
    }

    onItemDeselected(index: number, el: HTMLElement): void {
        console.log("Item deselected")
        if (this.selectedIndexes.length > 0 && this.selectedIndexes.some(i => i == index) == false) {
            this.placeholderIndex = this.selectedIndexes[0];
        } else if (this.selectedIndexes.length == 0) {
            this.placeholderIndex = null;
        }
        if (!this.multiselect) {
            this.hide();
        }
    }

    render() {
        let index = -1;
        return html`<div id="select">
            ${when(this.input,
                () => html`<div id="trigger"><input type="text" @input="${e => this.onInput(e)}"><button id="dropdown-toggle" @click="${this.toggle}"></div></div>`,
                () => html`<div id="trigger" @click="${this.toggle}">
                <div id="selected-placeholder">
                    ${this.placeholderIndex != null ? unsafeHTML(
                        this.getPlaceholder()) : nothing}
                </div>
                <button id="dropdown-toggle"></button>
                ${ this.multiselect == true && this.selectedIndexes && this.selectedIndexes.length > 1 ? html`<div id="badge">${this.selectedIndexes.length - 1}</div>` : `` }
            </div>`)}
            <div id="items">
            ${ListItemsTemplate(this)}
            </div>
        </div>`;
    }

}