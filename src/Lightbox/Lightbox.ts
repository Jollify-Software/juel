import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';
import { JuelScrollPane } from "../ScrollPane/ScrollPane";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Lightbox.less";

@customElement("juel-lightbox")
export class JuelLightbox extends LitElement {

    static YouTubeRegExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    static YouTubeTemplate = (id) => {
        return html`<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" title="YouTube video player" frameborder="0" allowfullscreen></iframe>`
    }

    static styles = unsafeCSS(Styles);

    @property() type; string = "image"
    @property({ type: Boolean }) icon: boolean = false;
    @property() preview: string;

    open: boolean = false;
    sources: string[] = [];
    content: HTMLElement[] = [];
    sp: JuelScrollPane;
    @property() position: number = 0;

    firstUpdated() {
        setTimeout(() => {
            var elements = (Array.prototype.slice.call(document.querySelectorAll('[data-lightbox], [data-lightbox-src')) as HTMLElement[]);
            for (var el of elements) {
                el.addEventListener('click', (e) => {
                    this.toggle(e);
                })
                if (el.hasAttribute('data-lightbox-src')) {
                    this.sources.push(el.dataset.lightboxSrc);
                } else if (el.hasAttribute('src')) {
                    this.sources.push(el.getAttribute('src'));
                }
            }
            
            /*
            this.content = (Array.prototype.slice.call(this.children) as HTMLElement[])
                .filter(el => !el.matches("[slot]"));
            */
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

    toggle(e: Event) {
        e.stopPropagation();
        let lightboxContainer = this.shadowRoot.querySelector("#lightbox-container") as HTMLElement;
        if (this.open == true) {
            lightboxContainer.style.display = "none";
            this.open = false;
        } else {
            lightboxContainer.style.display = "flex";
            this.open = true;
        }
    }

    render() { // TODO Add full screen btn
        return html`
            <div id="preview-container" @click="${this.toggle}">
                ${this.icon == true ?
                    html`<div id="icon-container">
                            <a><slot name="icon"><slot></a>
                        </div>`
                : ``}
                <img src="${this.preview}" />
            </div>
            <div id="lightbox-container" @click="${this.toggle}"> 
                <div id="lightbox-nav">
                    <span>${this.position + 1} / ${this.sources.length}</span>
                    <div id="close" @click="${this.toggle}"></div>
                </div>
                <juel-scroll-pane id="lightbox-context" controls="true">
                    ${
                        this.sources.map((src, index) => {
                            if (src.includes('youtu.be')) {
                                var match = src.match(JuelLightbox.YouTubeRegExp);
                                if (match && match[2].length == 11) {
                                    return JuelLightbox.YouTubeTemplate(match[2]);
                                }
                                return ``;
                            } else {
                                return html`<img src="${src}">`;
                            }
                        })
                    }
                </juel-scroll-pane>
            </div>
        `;
    }
}