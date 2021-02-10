import { customElement, html, LitElement, property, TemplateResult, unsafeCSS } from "lit-element";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Nav.less";
import { GetChildren } from "../_Utils/GetChildren";

@customElement("juel-nav")
export class JuelNav extends LitElement {

    static styles = unsafeCSS(Styles)

    @property({ type: Number })
    selected: number;

    itemsHtml: TemplateResult[];

    firstUpdated() {
        setTimeout(() => this.requestUpdate(), 100);
    }

    toggle(e: Event) {
        (<HTMLElement>e.target).classList.toggle("open");
    }

    render() {
        return html`
            <nav>
            ${GetChildren(this).some(e => e.matches('[slot="title"]')) ?
                html`<div part="title" class="title"><slot name="title"></slot></div>` :
                html``
            }
            <div class="toggle" @click="${this.toggle}">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div id="items">
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