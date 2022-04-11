import { LitElement, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html";
import Styles from 'bundle-text:./Embed.less';

declare var marked: any;
declare var hljs: any;

@customElement("juel-embed")
export class JuelEmbed extends LitElement {
    static styles = unsafeCSS(Styles);

    static UrlMarkdown = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    static markdownFunc = (em: JuelEmbed, content: string) => {
        if ('marked' in window) {
            em.content = marked.parse(content);
            em.requestUpdate();
            if ('hljs' in window) {
                setTimeout(() => hljs.highlightAll(), 400);
            }
        }
    }

    @property() url: string;
    @property() type: string;

    content: string;



    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.url) {
            fetch(this.url).then(response => {
                var contentType = response.headers.get('content-type');

                if (this.type == "markdown" || /markdown/.test(contentType)) {
                    response.text().then(data => {
                        let script: HTMLScriptElement;
                        script = document.head.querySelector('#markdown');
                        if (!script) {
                            script = document.createElement('script');
                            script.id = "markdown";
                            script.src = JuelEmbed.UrlMarkdown;
                            document.head.append(script);
                            script.onload = () => JuelEmbed.markdownFunc(this, data);
                        } else {
                            setTimeout(() => JuelEmbed.markdownFunc(this, data), 400);
                        }
                    }).catch(err => {
                        console.log(err);
                    });
                }
            });
        }
    }

    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }

    render() {
        if (this.content) {
            return unsafeHTML(this.content);
        } else {
            return ``;
        }
    }
}