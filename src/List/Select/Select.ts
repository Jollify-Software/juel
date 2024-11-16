import { customElement } from "lit/decorators";
import { ListBase } from "../../_Base/ListBase";
import Styles from "bundle-text:./Select.less";
import { CSSResultGroup, html, PropertyValueMap, unsafeCSS } from "lit";
import { map } from "lit/directives/map";
import { ItemBase } from "../../_Base/ItemBase";
import { when } from "lit/directives/when";
import { WindowModule } from "../../_Modules/WindowModule";
import { Guid } from "../../_Utils/GuidFunction";

@customElement("juel-select")
export class JuelSelect extends ListBase {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    isOpen: boolean = false;

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (!this.id) {
            this.id = `${this.nodeName}-${Guid()}`;
        }
        WindowModule.appendDocumentClick(this.id, (e) => {
            if ((!this.contains(e.target as HTMLElement)) && this.isOpen) {
                this.toggleOpen();
            }
        });
    }

    onItemSelected(index: number, el: HTMLElement): void {
        this.selectedIndex = index;
    }

    toggleOpen() {
        let list = this.shadowRoot.querySelector(".items");
        if (list.classList.contains("open")) {
            list.classList.remove("open");
            this.isOpen = false;
        } else {
            list.classList.add("open");
            this.isOpen = true;
        }
    }

    protected render(): unknown {
        let selectedItem: ItemBase = null;
        if (this.selectedIndex) {
            selectedItem = this.items[this.selectedIndex];
        }        

        return html`<div @click="${this.toggleOpen}" class="select-selected"><span>${when(selectedItem, () => html`${selectedItem.innerHTML}`)}</span><button id="dropdown-toggle"></button></div>
        <div class="items"><slot></slot></div>`;
    }
}