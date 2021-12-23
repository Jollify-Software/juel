import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { createPopper, Instance } from '@popperjs/core';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from 'bundle-text:./Menu.less';
import { IsMobile } from "../_Utils/IsMobile";

@customElement('juel-menu')
export class JuelMenu extends LitElement {
    
    static styles = unsafeCSS(Styles);

    @property({ type: Boolean }) push = false;
    @property() trigger = 'over';
    
    menu: Instance;
    menuShown = false;

    constructor() {
        super();
        this.push = IsMobile();
    }

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
        let items = this.shadowRoot.getElementById('items');
        let trigger = $(this.shadowRoot.getElementById('trigger'));
        
        if (this.trigger == 'over') {
            this.trigger = 'mouseover touchstart';
        }
        trigger.on(this.trigger, (e) => {
            trigger.toggleClass("open");
            if (this.menuShown == false) {
                items.style.display = "inline-block";
                if (this.push == false) {
                this.menu = createPopper(
                    trigger[0],
                    items,
                    {
                        placement: $(this).parent('juel-menu').length > 0 ? "right-end" : "bottom"
                    });
                }
                this.menuShown = true;
            }
        });
        $([items, trigger[0]]).off("mousemove").on("mousemove", () => {
            console.log("Show menu");
            this.menuShown = true;
        }).off("mouseleave").on("mouseleave", (e) => {
            this.menuShown = false;
            setTimeout(() => {
                if (this.menuShown == false) {
                    console.log("Hide menu");
                    items.style.display = "none"
                    this.menu = null
                }
            }, 1000);
        })
    });
    }


    render() {
        return html`<div id="container">
            <div id="trigger">
                <slot name="trigger">
                    <button>${this.title}</button>
                </slot>
                <div id="down-arrow"></div>
            </div>
            <div id="items">
            ${ChildrenMap(this, (el, index) => {
                    let id = el.id ? el.id :  `item-${index}`;
                    el.setAttribute('slot', id);

                    return html`
                        <div class="item" data-index="${index}">
                        <slot name="${id}"></slot>
                        </div>`;
            }, '[slot="trigger"]')}
            </div>
        </div>`;
    }
}