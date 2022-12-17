import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { createPopper, Instance } from '@popperjs/core';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from 'bundle-text:./Menu.less';
import { IsMobile } from "../_Utils/IsMobile";
import { JuelComponent } from "../_Base/JuelComponent";

@customElement('juel-menu')
export class JuelMenu extends JuelComponent {
    
    static styles = unsafeCSS(Styles);

    @property({ type: Boolean }) push: boolean;
    @property() trigger;
    
    menu: Instance;
    menuShown: boolean;
    triggered: boolean;

    constructor() {
        super();
        this.push = IsMobile();
        this.trigger = 'over';
        this.menuShown = false;
        this.triggered = false;
    }

    load() {
        let items = this.shadowRoot.getElementById('items');
        let trigger = $(this.shadowRoot.getElementById('title'));
        
        if ((!this.trigger) || this.trigger == 'over') {
            this.trigger = 'mouseover touchstart';
        }
        trigger.off(this.trigger).on(this.trigger, (e) => {
            if (this.menuShown == false) {
                this.triggered = true;
                trigger.toggleClass("open");
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
            if (this.triggered==true) {
                this.menuShown = true;
            }
        }).off("mouseleave").on("mouseleave", (e) => {
            this.menuShown = false;
            setTimeout(() => {
                if (this.menuShown == false) {
                    items.style.display = "none"
                    this.menu = null
                    this.triggered = false;
                }
            }, 1000);
        })
    }


    render() {
        return html`<div id="container">
            <div id="title">
                <slot name="title">
                    <span>${this.title}</span>
                </slot>
            </div>
            <div id="items">
            ${ChildrenMap(this, (el, index) => {
                    let id = el.id ? el.id :  `item-${index}`;
                    el.setAttribute('slot', id);

                    return html`
                        <div class="item" data-index="${index}">
                        <slot name="${id}"></slot>
                        </div>`;
            }, '[slot="title"]')}
            </div>
        </div>`;
    }
}