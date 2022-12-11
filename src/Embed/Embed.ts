import { LitElement, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html";
import Styles from 'bundle-text:./Embed.less';
import { StringsRequired } from "../_Strings/StringsRequired";
import { AppendScript, AppendStyle } from "../_Utils/ElementHelpers";
import { StringsIds } from "../_Strings/StringsIds";

declare var marked: any;
declare var hljs: any;

// TODO: JSON oEmbed => https://oembed.com/
@customElement("juel-embed")
export class JuelEmbed extends LitElement {
    static styles = unsafeCSS(Styles);

    static markdownFunc = (em: JuelEmbed, content: string) => {
        if ('marked' in window) {
            em.innerHTML = marked.parse(content);
            em.requestUpdate();
            if ('hljs' in window) {
                setTimeout(() => hljs.highlightAll(), 400);
            } else {
                AppendStyle(StringsIds.HighlightStyles, StringsRequired.HighlightStyles, true);
                AppendScript(StringsIds.HighlightScript, StringsRequired.Highlight, true).then(() => {
                    hljs.highlightAll();
                });
            }
            if (em.theme) {
                AppendStyle(`${StringsIds.HighlightStyles}-${em.theme}`, `${StringsRequired.HighlightStylesRoot}${em.theme}.css`, true)
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
                        let match = data.match(/(?<=<body>)[\s\S]+(?=<\/body>)/);
                        if (match && match.length == 1) {
                        let $data = $(match[0]);
                        $(this).append(
                            $data
                        );
                        this.requestUpdate();
                        }
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
        AppendScript(StringsIds.MarkdownScript, StringsRequired.Markdown, true).then(() => {
            JuelEmbed.markdownFunc(this, content);
        });
    }

    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }
}