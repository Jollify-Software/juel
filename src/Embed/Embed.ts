import { LitElement, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html";
import Styles from 'bundle-text:./Embed.less';

declare var marked: any;
declare var hljs: any;

// TODO: JSON oEmbed => https://oembed.com/
@customElement("juel-embed")
export class JuelEmbed extends LitElement {
    static styles = unsafeCSS(Styles);

    static UrlMarkdown = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    static HlJs = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release/build/highlight.min.js";
    static HlJsStyles = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release/build/styles/default.min.css";
    static HlJsStylesRoot = "https://cdn.jsdelivr.net/npm/highlight.js/styles/"

    static markdownFunc = (em: JuelEmbed, content: string) => {
        if ('marked' in window) {
            em.innerHTML = marked.parse(content);
            em.requestUpdate();
            if ('hljs' in window) {
                setTimeout(() => hljs.highlightAll(), 400);
            } else {
                let styles = document.createElement("link");
                styles.setAttribute("rel", "stylesheet");
                styles.setAttribute("href", JuelEmbed.HlJsStyles);
                document.head.append(styles);
                let script = document.createElement("script");
                script.src = JuelEmbed.HlJs;
                document.head.append(script);
                setTimeout(() => {
                    hljs.highlightAll();
                }, 400);
            }
            if (em.theme) {
                let id = `hljs-theme-${em.theme}`;
                let style = document.head.querySelector(`#${id}`);
                if (!style) {
                    style = document.createElement("link");
                    style.id = id;
                    style.setAttribute("rel", "stylesheet");
                    style.setAttribute("href", `${JuelEmbed.HlJsStylesRoot}${em.theme}.css`)
                    document.head.append(style);
                }
            }
        }
    }

    @property() url: string;
    @property() selector: string;
    @property() type: string;
    @property() theme: string;

    content: string;

    constructor() {
        super();
        this.selector = "body"
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.url) {
            fetch(this.url).then(response => {
                var contentType = response.headers.get('content-type');

                if (this.type == "markdown" || /markdown/.test(contentType)) {
                    response.text().then(data => {
                        this.processMarkdown(data);
                    }).catch(err => {
                        console.log(err);
                    });
                } else {
                    response.text().then(data => {
                        let $data = $(data);
                        $(this).append(
                            $data.find(this.selector)
                        );
                        this.requestUpdate();
                    })
                }
            });
        } else if (this.innerHTML) {
            let data = this.innerHTML;
            this.requestUpdate();
            setTimeout(() => this.processMarkdown(data), 400);
        }
    }

    processMarkdown(content: string) {
        let script: HTMLScriptElement;
        script = document.head.querySelector('#markdown');
        if (!script) {
            script = document.createElement('script');
            script.id = "markdown";
            script.src = JuelEmbed.UrlMarkdown;
            document.head.append(script);
            script.onload = () => JuelEmbed.markdownFunc(this, content);
        } else {
            setTimeout(() => JuelEmbed.markdownFunc(this, content), 400);
        }
    }

    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }
}