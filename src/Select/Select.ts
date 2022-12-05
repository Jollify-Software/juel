import { LitElement, html, unsafeCSS, nothing, PropertyValueMap } from "lit";
import { property, customElement } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { createPopper, Instance } from '@popperjs/core';
import style from 'bundle-text:./Select.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { JuelComponent } from "../_Base/JuelComponent";
import { ListBase } from "../_Base/ListBase";
import { when } from "lit/directives/when";
import { until } from "lit/directives/until";
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

    //items: HTMLElement;
    trigger: HTMLElement;

    constructor() {
        super();
        this.menuShown = false;
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties);
        this.titleSlotSelector = '[slot="title"], h1, h2, h3, h4, h5, h6';
        this.itemsContainer.style.display = "none";
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
        this.itemsContainer.style.display = "none";
        this.itemsContainer.style.opacity = "0";
        this.menu = null;
        this.menuShown = false;
        if (this.input) {
            let el = this.shadowRoot.querySelector("input");
            if (el) {
                el.value = this.getPlaceholder();
            }
        }
    }

    show() {
        this.itemsContainer.style.display = "inline-block";
        this.itemsContainer.style.opacity = "1";
        this.menu = createPopper(
            this.trigger,
            this.itemsContainer
        );
        this.menuShown = true;
    }

    onInput(e: Event): void {
        this.show();
        super.onInput(e);
    }

    onItemSelected(index: number, el: HTMLElement): void {
        if (this.placeholderIndex == null || (this.placeholderIndex != index && this.multiselect == false)) {
            this.placeholderIndex = index;
            
        }
        if (this.input) {
            let el = this.shadowRoot.querySelector("input");
            if (el && (!el.value)) {
                el.value = this.getPlaceholder();
            }
        }
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
        console.log(this.multiselect == true && this.selectedIndexes && this.selectedIndexes.length > 1);
        return html`<div id="select">
            ${when(this.input,
                () => html`<div id="trigger"><input type="text" @input="${e => this.onInput(e)}">
                ${when(this.multiselect == true && this.selectedIndexes && this.selectedIndexes.length > 1,
                    () => html`<juel-badge .label=${this.selectedIndexes.length - 1}></juel-label>`,
                    () => nothing)}
                <button id="dropdown-toggle" @click="${this.toggle}"></div></div>`,
                () => html`<div id="trigger" @click="${this.toggle}">
                <div id="selected-placeholder">
                    ${this.placeholderIndex != null ? unsafeHTML(
                        this.getPlaceholder()) : nothing}
                </div>
                <button id="dropdown-toggle"></button>
                ${when(this.multiselect == true && this.selectedIndexes && this.selectedIndexes.length > 1,
                    () => html`<juel-badge .label=${this.selectedIndexes.length - 1}></juel-label>`,
                    () => nothing)}
            </div>`)}
            <ul class="items">
            ${until(ListItemsTemplate(this), html`<slot @slotchange="${(e) => this.itemsForSlot(e)}"><slot>`)}
            </ul>
            
        </div>`;
    }
    // ${ListItemsTemplate(this)}

}
