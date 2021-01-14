import { customElement, html, LitElement, unsafeCSS } from "lit-element";
import { unsafeHTML } from "lit-html/directives/unsafe-html";
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
        let trigger = this.shadowRoot.getElementById('trigger');
        $(trigger).on('click', (e) => {
            if (this.menuShown == false) {
                items.style.display = "inline-block";
                items.style.opacity = "1";
                this.menu = createPopper(
                    trigger,
                    items
                    );
                this.menuShown = true;
            } else {
                items.style.display = "none"
                items.style.opacity = "0";
                this.menu = null
                this.menuShown = false;
            }
        });
    }


    render() {
        return html`<div id="container">
            <div id="trigger">
                <slot name="trigger"></slot>
                <div id="down-arrow"></div>
            </div>
            <div id="items">
            ${ChildrenMap(this, (el, index) => {
                if (!el.hasAttribute('slot')) {
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