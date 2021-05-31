import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import { createPopper, Instance } from '@popperjs/core';
import Styles from 'bundle-text:./Button.less';

@customElement("juel-button")
export class JuelButton extends LitElement {
    static styles = unsafeCSS(Styles);

    @property() addon: string;
    @property() text: string;

    dropdownShown: boolean = false;
    dropdown: Instance;

    buttonClick(e: Event) {
        var event = new CustomEvent("ButtonClick", {
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
                    ${hasText ? html`<button part="button" @click="${this.buttonClick}">${this.text}</button>` : html`<button><slot name="content"></slot></button>`}
                    ${
                        this.addon == "dropdown" ? html`<button id="dropdown-toggle" @click="${this.toggleDropdown}">
                            </button>` : ``
                    }
                </div>
                <div id="dropdown-items" style="display:none"><slot name="dropdown"></slot></div>` :
                hasText ? html`<button part="button" @click="${this.buttonClick}">${this.text}</button>` : html`<button><slot name="content"></slot></button>`
            }
        `;
    }
}
