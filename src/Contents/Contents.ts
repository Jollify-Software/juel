import bind from "bind-decorator";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { NextUntil } from "../_Utils/NextUntil";
import { ContentsItem } from "./ContentsItem";
import { IconsModule } from '../_Modules/IconsModule';

@customElement("juel-contents")
export class JuelContents extends LitElement {

    @property() link: string;

    constructor() {
        super();
        this.link = "true";
    }
    contents: ContentsItem[];

    populateContents() {
        this.contents = [];
        var h1s = document.querySelectorAll("h1");
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
            
            let h2s = NextUntil(h1, `h1`, `h2`);
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
        let childHeadings = NextUntil(heading, `h${level}`, `h${level+1}`);
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
        if (this.link == "true") {
            let div = document.createElement("div");
            div.className = "hidden";
            div.append(IconsModule.get("link"));
            this.prepend(div);
        }
        setTimeout(() => {
         this.populateContents();
         this.requestUpdate();   
        });
    }

    @bind
    renderContentsItem(item: ContentsItem) {
        return html`<li>
            <a href="#${item.id}">${item.title}</a>
            ${item.children ?
                html`<ul>
                    ${item.children.map(this.renderContentsItem)}
                </ul>`
                : ''}
        </li>`
    }

    render() {
        return html`
            <ul id="toc">
                ${this.contents ? this.contents.map(this.renderContentsItem) : ''}
            </ul>
        `;
    }

}