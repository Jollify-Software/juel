import { unsafeHTML } from "lit/directives/unsafe-html";
import { StringsIds } from "../_Strings/StringsIds";
import { StringsRequired } from "../_Strings/StringsRequired";

declare var marked: any;

export function AppendStyle(id: string, content: string, contentIsUrl: boolean = false) {
    return new Promise((resolve, reject) => {
        let el = document.head.querySelector(`#${id}`) as HTMLElement;
        if (!el) {
            if (contentIsUrl == true) {
                el = document.createElement("link");
                (<HTMLLinkElement>el).rel = "stylesheet";
                (<HTMLLinkElement>el).href = content;
            } else {
                el = document.createElement("style");
                el.textContent = content;
            }
            el.id = id;
            el.onload = () => {
                resolve(1);
            };
            document.head.append(el);

        } else {
            el.addEventListener('load', () => {
                resolve(1)
            });
        }
    });
}

export function AppendScript(id: string, content: string, contentIsUrl: boolean = false) {
    return new Promise((resolve, reject) => {
        let el = document.body.querySelector(`#${id}`) as HTMLScriptElement;
        if (!el) {
            el = document.createElement("script");
            el.id = id;
            if (contentIsUrl == true) {
                el.src = content;
            } else {
                el.textContent = content;
            }
            el.onload = () => {
                resolve(1);
            };
            document.body.append(el);
        } else {
            el.addEventListener('load', () => {
                resolve(1)
            });
        }
    });
}

export async function AppendMarkdown(markdown: string) {
    await AppendScript(StringsIds.MarkdownScript, StringsRequired.Markdown, true);
    var renderer = new marked.Renderer();
    renderer.link = function (href, title, text) {
        var link = marked.Renderer.prototype.link.call(this, href, title, text);
        return link.replace("<a", "<a target='_blank' ");
    };
    marked.setOptions({
        renderer: renderer
    });
    if (markdown) {
        let content = marked.parse(markdown);
        return unsafeHTML(content);
    } else {
        return '';
    }
}