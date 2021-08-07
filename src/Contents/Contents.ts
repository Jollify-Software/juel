import bind from "bind-decorator";
import { customElement, html, LitElement } from "lit-element";
import { NextUntil } from "../_Utils/NextUntil";
import { ContentsItem } from "./ContentsItem";

@customElement("juel-contents")
export class JuelContents extends LitElement {

    contents: ContentsItem[];

    populateContents() {
        this.contents = [];
        var h1s = document.querySelectorAll("h1");
        for (let h1 of h1s) {
            let item: ContentsItem = {
                id: h1.id,
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