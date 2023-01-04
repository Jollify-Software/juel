import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { JuelScrollPane } from "../ScrollPane/ScrollPane";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Lightbox.less";
import { ExternalMediaModule } from "../_Modules/ExternalMediaModule";
import { JuelComponent } from "../_Base/JuelComponent";

@customElement("juel-lightbox")
export class JuelLightbox extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property() type: string;
    @property({ type: Boolean }) icon;
    @property() preview: string;

    open: boolean;
    sources: string[];
    content: HTMLElement[];
    sp: JuelScrollPane;
    @property({ type: Number }) position;

    constructor() {
        super();
        this.type = "image";
        this.icon = false;
        this.open = false;
        this.sources = [];
        this.content = [];
        this.position = 0;
    }

    firstLoad() {
        this.sp = this.shadowRoot.querySelector("juel-scroll-pane");
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
            this.sp.requestUpdate();
    }

    load() {
        $(this.sp).off("scroll").on("scroll", (e: CustomEvent) => {
            this.position = e.detail.index
            this.requestUpdate()
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
                                var match = src.match(ExternalMediaModule.youtube.regexp);
                                if (match && match[2].length == 11) {
                                    return ExternalMediaModule.youtube.template({ id: match[2] });
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