import bind from "bind-decorator";
import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import { NextUntil } from "../../_Utils/NextUntil";
import { ContentsItem } from "./ContentsItem";
import { IconsModule } from '../../_Modules/IconsModule';
import { FindNextUntil, FindUntil } from "../../_Utils/FindUntil";
import { when } from "lit/directives/when";
import Style from 'bundle-text:./Contents.less';

@customElement("juel-contents")
export class JuelContents extends LitElement {

    @property() link: string;

    constructor() {
        super();
        this.link = "false";
    }
    @state()
    contents: ContentsItem[];

    protected createRenderRoot(): HTMLElement | DocumentFragment {
        return this;
    }

    populateContents() {
        this.contents = [];
        var h1s: HTMLElement[] = [];
        let parent = $(this).parents("section").last();
        let element: HTMLElement;
        if (parent.length > 0 && (element = parent[0].nextElementSibling as HTMLElement)) {
            do {
                h1s = h1s.concat(
                    $(element).find("h1").toArray()
                )
            } while ((element = element.nextElementSibling as HTMLElement));
        } else {
            h1s = Array.from(document.querySelectorAll("h1"));
        }
        for (let h1 of h1s) {
            let id = h1.id;
            if (!h1.hasAttribute("id")) {
                id = h1.textContent.replace(/\s+/g, '-').toLowerCase();
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
            
            let h2s = FindNextUntil(h1, `h2`, `h1`);
            for (let h2 of h2s) {
                this.populateChildren(h2 as HTMLElement, 2, item);
            }
            this.contents.push(item);
        }
    }

    populateChildren(heading: HTMLElement, level: number, item: ContentsItem) {
        let id = heading.id;
            if (!heading.hasAttribute("id")) {
                id = heading.textContent.replace(/\s+/g, '-').toLowerCase();
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
        
        let childHeadings = FindNextUntil(heading, `h${level + 1}`, `h${level}`);
        for (let h of childHeadings) {
            this.populateChildren(h as HTMLElement, level+1, child);
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