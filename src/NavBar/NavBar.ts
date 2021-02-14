import { customElement, html, LitElement, property, TemplateResult, unsafeCSS } from "lit-element";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Nav.less";
import { GetChildren } from "../_Utils/GetChildren";

@customElement("juel-nav")
export class JuelNav extends LitElement {

    static styles = unsafeCSS(Styles)

    @property({ type: Boolean })
    toggle: boolean = false;
    @property({ type: String })
    side: string = "right";
    @property({ type: String })
    push: string;
    @property({ type: Number })
    selected: number;

    itemsHtml: TemplateResult[];
    itemsWidth: string;

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate()

            /*
            this.itemsWidth = this.style.getPropertyValue("--items-width");
            if (!this.itemsWidth) {
                let w: number = 0;
                $(this.shadowRoot).find('.item').each((index, el) => {
                    w += $(el).outerWidth();
                })
                this.itemsWidth = `${w}px`;
                this.style.setProperty("--items-width", this.itemsWidth);
            }
            this.shadowRoot.getElementById("items").style.width = '0';
            this.shadowRoot.getElementById("items").style.visibility = 'visible';
            */
        });
    }

    toggleClick(e: Event) {
        e.stopImmediatePropagation();
        let el = this.shadowRoot.getElementById("toggle");
        el.classList.toggle("open");
        if (el.classList.contains("open")) {
            if (this.push) {
                let css = {};
           //     css[`margin-${this.side}`] = this.itemsWidth;
                css["transition"] = "margin 2s";
                $(this.push).css(css);
            }
        } else {
            if (this.push) {
                let css = {};
         //       css[`margin-${this.side}`] = "0";
                $(this.push).css(css);
            }
        }
    }

    render() {
        return html`
            <nav>
            ${GetChildren(this).some(e => e.matches('[slot="title"]')) ?
                html`<div part="title" class="title"><slot name="title"></slot></div>` :
                html``
            }
            <div id="toggle" class="${this.toggle == true ? "toggle shown" : "toggle"}" @click="${this.toggleClick}">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div id="items" class="${this.side ? `side ${this.side}` : ""}">
            ${ChildrenMap(this, (el, index) => {
                if (el.getAttribute("slot") != "title") {
                let id = el.id ? el.id :  `item-${index}`;
                el.setAttribute('slot', id);

                let klass = 'item';
                if(this.selected && this.selected == index) {
                    klass += " selected";
                }

                return html`
                    <div class="${klass}" data-index="${index}">
                    <slot name="${id}"></slot>
                    </div>`;
            } else {
                return html``;
            }
            })}
            </div>
            </nav>
        `;
    }

}