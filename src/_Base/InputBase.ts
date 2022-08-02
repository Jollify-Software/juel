import { createPopper, Instance } from "@popperjs/core";
import { property } from "lit/decorators";
import { RippleInitialiser } from "../_Utils/RippleModule";
import { JuelComponent } from "./JuelComponent";
import { createRef } from 'lit/directives/ref' 
import { PropertyValueMap } from "lit";

export class InputBase extends JuelComponent {
    @property({ attribute: "prepend" }) addBefore: string;
    @property() addon: string;
    @property({ type: Boolean }) addonActive: boolean;
    @property() label: string;
    @property({ type: Boolean }) active: boolean;

    input = createRef<HTMLInputElement>();

    dropdownShown: boolean = false;
    dropdown: Instance;

    isRipple: string;
    r: RippleInitialiser;

    firstUpdated() {
        if (this.input.value) {
            this.input.value.focus();
        }
    }

    focus(options?: FocusOptions): void {
        if (this.input.value) {
            this.input.value.focus();
        }
        super.focus(options)
    }

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