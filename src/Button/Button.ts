import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { createPopper, Instance } from '@popperjs/core';
import Styles from 'bundle-text:./Button.less';
import { RippleInitialiser } from "../_Utils/RippleModule";

@customElement("juel-button")
export class JuelButton extends LitElement {
    static styles = unsafeCSS(Styles);

    @property() addon: string;
    @property({ type: Boolean }) addonActive: boolean;
    @property() text: string;
    @property({ type: Boolean }) active: boolean;

    isRipple: string;
    dropdownShown: boolean = false;
    dropdown: Instance;

    r: RippleInitialiser;

    updated() {
        setTimeout(() => {
            this.isRipple = getComputedStyle(this).getPropertyValue('--ripple');
            console.log(this.isRipple)
            if (this.isRipple) {
                let btn = this.shadowRoot.firstElementChild as HTMLElement;
                this.r = new RippleInitialiser(btn);
            }
        });
    }

    disconnectedCallback() {
        if (this.isRipple) {
            let btn = this.shadowRoot.firstElementChild as HTMLElement;
            this.r.removeRipples(btn);
        }
    }

    buttonClick(e: Event) {
        console.log("button-click");
        var event = new CustomEvent("button-click", {
            detail: e
        });
        this.dispatchEvent(event);
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

    render() {
        let hasText = this.text != undefined;
        return html`
            ${this.addon ? 
                html`<div class="btn-group">
                        ${hasText ?
                            html`<button class="btn" part="button" @click="${this.buttonClick}">${this.text}</button>` :
                            html`<button class="btn" part="button" @click="${this.buttonClick}"><slot name="content"></slot></button>`}
                        ${
                            this.active == true && this.addonActive == true ?
                                html`<slot name="addon-active"></slot>`
                            :
                            this.addon == "dropdown" ?
                                html`<button id="dropdown-toggle" @click="${this.toggleDropdown}">
                                    </button>` : html`<slot name="addon"></slot>`
                        }
                </div>
                <div id="dropdown-items" style="display:none"><slot name="dropdown"></slot></div>` :
                hasText ?
                    html`<button class="btn" part="button" @click="${this.buttonClick}">${this.text}</button>` :
                    html`<button class="btn" part="button" @click="${this.buttonClick}"><slot name="content"></slot></button>`
            }
        `;
    }
}
