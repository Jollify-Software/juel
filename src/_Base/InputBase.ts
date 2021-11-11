import { createPopper, Instance } from "@popperjs/core";
import { LitElement } from "lit-element/lit-element";
import { property } from "lit/decorators";

export class InputBase extends LitElement {
    @property() addon: string;
    @property({ type: Boolean }) addonActive: boolean;
    @property() text: string;
    @property({ type: Boolean }) active: boolean;

    dropdownShown: boolean = false;
    dropdown: Instance;

    onClick(e: Event) {
    }

    toggleDropdown() {
        var items = this.shadowRoot.querySelector('#dropdown-items') as HTMLElement;
        if (this.dropdownShown == false) {
            this.dropdown = createPopper(
                this.shadowRoot.querySelector('#dropdown-toggle'),
                items
            );
            items.style.display = "initial";
            this.dropdownShown = true;
        } else {
            this.dropdown.destroy();
            items.style.display = "none";
            this.dropdownShown = false;
        }
    }
}