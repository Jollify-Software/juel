import bind from "bind-decorator";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import { NextUntil } from "../../_Utils/NextUntil";
import { ContentsItem } from "./ContentsItem";
import { IconsModule } from '../../_Modules/Icons/IconsModule';
import { FindNextUntil, FindUntil } from "../../_Utils/FindUntil";
import { when } from "lit/directives/when";
import Style from 'bundle-text:./Contents.less';
import { findAll, findAllUntil } from "../../_Utils/dom/findAllUntil";
import { generateIdFromText } from "../../_Utils/String/generateIdFromText";

@customElement("juel-contents")
export class JuelContents extends LitElement {

    @property() link: string;
    @property({ type: Number }) level: number = 6;

    constructor() {
        super();
        this.link = "false";
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
        let promise = ('reportReady' in window) ? window['reportReady'] : $.ready;
        $.when(promise).then(() => {
            console.log("Contents ready", 'reportReady' in window);
            if (this.link == "true") {
                let div = document.createElement("div");
                div.className = "hidden";
                div.append(IconsModule.get("link"));
                this.prepend(div);
            }
             this.populateContents();
        });
    }

    @bind
    renderContentsItem(item: ContentsItem) {
        return html`<li part="list-item">
            <a part="link" href="#${item.id}">${
                when(!item.page, () => item.title, () => html`<span>${item.title}</span><hr/><span>${item.page}</span>`)
            }</a>
            ${item.children ?
                html`<ul>
                    ${item.children.map(this.renderContentsItem)}
                </ul>`
                : ''}
        </li>`
    }

    render() {
        return html`
            <style>${Style}</style>
            <ul id="toc">
                ${this.contents ? this.contents.map(this.renderContentsItem) : ''}
            </ul>
        `;
    }

}