import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';
import { JuelScrollPane } from "../ScrollPane/ScrollPane";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Lightbox.less";

@customElement("juel-lightbox")
export class JuelLightbox extends LitElement {

    static styles = unsafeCSS(Styles);

    @property() type; string = "image"
    @property() icon: boolean = false;
    @property() preview: string;

    open: boolean = false;
    content: HTMLElement[] = [];

    firstUpdated() {
        setTimeout(() => {
            console.log((this.firstElementChild as HTMLImageElement).src)
            if ((!this.preview) && 'src' in this.firstElementChild) {
                this.preview = (this.firstElementChild as HTMLImageElement).src;
            }

            this.content = (Array.prototype.slice.call(this.children) as HTMLElement[])
                .filter(el => !el.matches("[slot]"));

            this.requestUpdate();
        });
    }

    toggle() {
        let lightboxContainer = this.shadowRoot.querySelector("#lightbox-container") as HTMLElement;
        if (this.open) {
            lightboxContainer.style.display = "none";
        } else {
            lightboxContainer.style.display = "block";
        }
    }

    render() {
        return html`
            <div id="preview-container" @click="${this.toggle}">
                ${this.icon == true ?
                    html`<div id="icon-container">
                            <a><slot name="icon"><slot></a>
                        </div>`
                : ``}
                <img src="${this.preview}" />
            </div>
            <div id="lightbox-container"> 
                <div id="lightbox-nav"></div>
                <juel-scroll-pane id="lightbox-context">
                    ${
                        this.content.map((el, index) => {
                            console.log(el.outerHTML);
                            return html`${unsafeHTML(el.outerHTML)}`
                        })
                    }
                </juel-scroll-pane>
            </div>
        `;
    }
}