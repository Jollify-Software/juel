import bind from "bind-decorator";
import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import { NextUntil } from "../../_Utils/NextUntil";
import { ContentsItem } from "./ContentsItem";
import { IconsModule } from '../../_Modules/Icons/IconsModule';
import { FindNextUntil, FindUntil } from "../../_Utils/FindUntil";
import { when } from "lit/directives/when";
import Style from 'bundle-text:./Contents.less';
import { findAll, findAllUntil } from "../../_Utils/dom/findAllUntil";
import { generateIdFromText } from "../../_Utils/String/generateIdFromText";
import { DomReady } from "../../_Utils/DomReady";

@customElement("juel-contents")
export class JuelContents extends LitElement {

    @property() link: string;
    @property({ type: Number }) level: number = 6;
    /**
     * Where page numbers come from. "data" (default): a heading's
     * `section[data-page]`, set by a paginator before the contents are built.
     * "css": the contents are built BEFORE pagination, so every entry gets the
     * dotted leader and the number is left to print CSS, e.g.
     * `juel-contents a[part="link"]::after { content: target-counter(attr(href), page) }`
     * (Paged.js / Logbook).
     */
    @property({ attribute: "page-numbers" }) pageNumbers: "data" | "css" = "data";
    /**
     * The `frozen` attribute: keep the list already built and never rebuild
     * it. A paginator that copies the element into pages (Paged.js clones
     * nodes) sets it first: each copy is a new instance, and without it would
     * build and render a second list beside the copied one.
     *
     * Deliberately NOT a reactive property: setting it on the original would
     * re-render that element with nothing and erase its list. Only a copy,
     * which starts life with the attribute, reads it (on its first render).
     */
    get frozen(): boolean {
        return this.hasAttribute("frozen");
    }

    /** Resolves once the list is built and rendered (immediately if frozen). */
    contentsReady: Promise<void>;
    private resolveContentsReady: () => void;

    constructor() {
        super();
        this.link = "false";
        this.contentsReady = new Promise(resolve => this.resolveContentsReady = resolve);
    }

    @state()
    contents: ContentsItem[];

    /**
     * Override the render root to use the light DOM instead of shadow DOM.
     * This is necessary because the component generates anchor links to headings
     * in the main document, and shadow DOM isolation would prevent correct navigation.
     */
    protected createRenderRoot(): HTMLElement | DocumentFragment {
        return this;
    }

    populateContents() {
        this.contents = [];

        findAll("h1", this, (h1) => {
            let id = h1.id;
            if (!h1.hasAttribute("id")) {
                id = generateIdFromText(h1.textContent);
                h1.setAttribute("id", id);
            }
            if (this.link == "true") {
                let a = document.createElement("a");
                a.className = "heading-link";
                a.href = `#${id}`;
                let svg = IconsModule.use("link");
                a.append(svg);
                h1.prepend(a);
            }

            let item: ContentsItem = {
                id: id,
                title: h1.textContent
            };
            let section = h1.closest("section");
            if (section) {
                if (section.hasAttribute("data-page")) {
                    item.page = parseFloat(section.dataset.page);
                }
            }

            if (this.level > 1) {
                findAllUntil(`h2`, h1, `h1`, (h2) => this.populateChildren(h2, 2, item));
            }

            this.contents.push(item);
        });
    }

    populateChildren(heading: HTMLElement, level: number, item: ContentsItem) {
        if (level > this.level) return;

        let id = heading.id;
        if (!heading.hasAttribute("id")) {
            id = generateIdFromText(heading.textContent);
            heading.setAttribute("id", id);
        }
        if (this.link == "true") {
            let a = document.createElement("a");
            a.className = "heading-link";
            a.href = `#${id}`;
            let svg = IconsModule.use("link");
            a.append(svg);
            heading.prepend(a);
        }
        let child: ContentsItem = {
            id: heading.id,
            title: heading.textContent
        };
        let section = heading.closest("section");
        if (section) {
            if (section.hasAttribute("data-page")) {
                child.page = parseFloat(section.dataset.page);
            }
        }

        if (this.level > level) {
            findAllUntil(`h${level + 1}`, heading, `h${level}`, (h) => this.populateChildren(h, level + 1, child));
        }

        if (!item.children) {
            item.children = [ child ];
        } else {
            item.children.push(child);
        }
    }

    firstUpdated() {
        if (this.frozen) {
            this.resolveContentsReady();
            return;
        }
        // In "css" mode the contents must exist before pagination, so don't wait for a paginator.
        let promise = (this.pageNumbers != "css" && 'reportReady' in window) ? window['reportReady'] : DomReady();
        Promise.resolve(promise).then(async () => {
            if (this.link == "true") {
                let div = document.createElement("div");
                div.className = "hidden";
                div.append(IconsModule.get("link"));
                this.prepend(div);
            }
            this.populateContents();
            await this.updateComplete;
            this.resolveContentsReady();
            this.dispatchEvent(new CustomEvent("contents-ready", { bubbles: true, composed: true }));
        });
    }

    @bind
    renderContentsItem(item: ContentsItem) {
        return html`<li part="list-item">
            <a part="link" href="#${item.id}">${
                when(this.pageNumbers == "css",
                    () => html`<span>${item.title}</span><hr/>`,
                    () => when(!item.page, () => item.title, () => html`<span>${item.title}</span><hr/><span>${item.page}</span>`))
            }</a>
            ${item.children ?
                html`<ul>
                    ${item.children.map(this.renderContentsItem)}
                </ul>`
                : ''}
        </li>`
    }

    render() {
        // A frozen copy already holds its list (light DOM); render nothing beside it.
        if (this.frozen) return nothing;
        return html`
            <style>${Style}</style>
            <ul id="toc">
                ${this.contents ? this.contents.map(this.renderContentsItem) : ''}
            </ul>
        `;
    }

}