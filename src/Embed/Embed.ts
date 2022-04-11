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

    @property() url: string;
    @property() type: string;

    content: string;

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.url) {
            fetch(this.url).then(response => {
                var contentType = response.headers.get('content-type');

                if (this.type == "markdown" || /markdown/.test(contentType)) {
                    response.text().then(data => {
                        let script = document.createElement('script');
                        script.id = "markdown-it";
                        script.src = JuelEmbed.UrlMarkdown;
                        script.onload = () => {
                            if ('marked' in window) {
                                this.content = marked.parse(data);
                                this.requestUpdate();
                            }
                        };
                        document.head.append(script);
                        if ('hljs' in window) {
                            hljs.highlightAll();
                        }
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