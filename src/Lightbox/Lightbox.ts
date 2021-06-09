import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';
import { JuelScrollPane } from "../ScrollPane/ScrollPane";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Lightbox.less";

@customElement("juel-lightbox")
export class JuelLightbox extends LitElement {

    static styles = unsafeCSS(Styles);

    @property() type; string = "image"
    @property({ type: Boolean }) icon: boolean = false;
    @property() preview: string;

    open: boolean = false;
    content: HTMLElement[] = [];
    sp: JuelScrollPane;
    @property() position: number = 0;

    firstUpdated() {
        setTimeout(() => {
            if ((!this.preview) && 'src' in this.firstElementChild) {
                this.preview = (this.firstElementChild as HTMLImageElement).src;
            }

            this.content = (Array.prototype.slice.call(this.children) as HTMLElement[])
                .filter(el => !el.matches("[slot]"));

            this.requestUpdate();
        });
    }

    updated() {
        this.sp = this.shadowRoot.querySelector("juel-scroll-pane");
        $(this.sp).off("scroll").on("scroll", (e: CustomEvent) => {
            console.log(e.detail)
            this.position = e.detail.index
        });
    }

    toggle() {
        let lightboxContainer = this.shadowRoot.querySelector("#lightbox-container") as HTMLElement;
        if (this.open) {
            lightboxContainer.style.display = "none";
        } else {
            lightboxContainer.style.display = "flex";
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
                <div id="lightbox-nav">
                    <span>${this.position + 1} / ${this.content.length}</span>
                    <button></button>
                    <button></button>
                </div>
                <juel-scroll-pane id="lightbox-context" controls="true">
                    ${
                        this.content.map((el, index) => {
                            return html`${unsafeHTML(el.outerHTML)}`
                        })
                    }
                </juel-scroll-pane>
            </div>
        `;
    }
}