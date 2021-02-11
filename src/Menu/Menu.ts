import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import { createPopper, Instance } from '@popperjs/core';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from 'bundle-text:./Menu.less';

@customElement('juel-menu')
export class JuelMenu extends LitElement {
    
    static styles = unsafeCSS(Styles);
    
    menu: Instance;
    menuShown = false;

    firstUpdated() {
        let items = this.shadowRoot.getElementById('items');
        let trigger = $(this.shadowRoot.getElementById('trigger'));
        
        trigger.on('click', (e) => {
            if (this.menuShown == false) {
                items.style.display = "inline-block";
                this.menu = createPopper(
                    trigger[0],
                    items,
                    {
                        placement: $(this).parent('juel-menu').length > 0 ? "right-end" : "bottom"
                    });
                this.menuShown = true;
            } else {
                items.style.display = "none"
                this.menu = null
                this.menuShown = false;
            }
        });
            setTimeout(() => this.requestUpdate(), 100);
    }


    render() {
        return html`<div id="container">
            <div id="trigger">
                <slot name="trigger"></slot>
                <div id="down-arrow"></div>
            </div>
            <div id="items">
            ${ChildrenMap(this, (el, index) => {
                if (el.getAttribute("slot") != "trigger") {
                    let id = el.id ? el.id :  `item-${index}`;
                    el.setAttribute('slot', id);

                    return html`
                        <div class="item" data-index="${index}">
                        <slot name="${id}"></slot>
                        </div>`;
                } else {
                    return html``;
                }
            })}
            </div>
        </div>`;
    }
}