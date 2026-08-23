import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { MarkdownToHtml } from "../../_Utils/MarkdownToHtml";

const embedStylesId = "juel-embed-styles";
const embedStyles = `
  juel-embed {
    display: block;
  }
  juel-embed iframe {
    display: block;
    width: 100%;
    height: var(--embed-height, 600px);
    border: none;
  }
  juel-embed .markdown {
    max-width: 60em;
    line-height: 1.6;
  }
  juel-embed .markdown pre {
    background: #f8f9fa;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    overflow-x: auto;
  }
  juel-embed .markdown code {
    background: #f1f3f5;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
  }
  juel-embed .markdown pre code {
    background: none;
    padding: 0;
  }
  juel-embed .error {
    color: var(--danger, #dc3545);
    padding: 0.75rem 1rem;
    border: 1px solid currentColor;
    border-radius: 0.375rem;
  }
`;

function ensureEmbedStyles() {
  if (document.getElementById(embedStylesId)) return;
  const style = document.createElement("style");
  style.id = embedStylesId;
  style.textContent = embedStyles;
  document.head.append(style);
}

@customElement("juel-embed")
export class JuelEmbed extends LitElement {
  @property({ type: String }) url = "";
  // "iframe" embeds a full standalone page in an isolated document (its own
  // <script>s run normally) — used throughout the example gallery.
  // "html" fetches a URL's raw markup and injects it as a plain HTML
  // fragment into this element's light DOM, so it inherits the host page's
  // stylesheet (a shared header/sidebar partial, say) — <script> tags in
  // fetched fragments do NOT execute (standard innerHTML behaviour), so
  // this is markup-only, not a full templating include.
  // "markdown" fetches and renders a Markdown file the same way.
  @property({ type: String }) type: "html" | "markdown" | "iframe" = "iframe";

  @state() private _markdownHtml = "";
  @state() private _htmlFragment = "";
  @state() private _error: string | null = null;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    ensureEmbedStyles();
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.type === "markdown") {
      this._loadMarkdown();
    } else if (this.type === "html") {
      this._loadHtml();
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has("url") || changedProperties.has("type")) {
      if (this.type === "markdown") {
        this._loadMarkdown();
      } else if (this.type === "html") {
        this._loadHtml();
      }
    }
  }

  private async _loadMarkdown() {
    if (!this.url) return;
    this._error = null;
    try {
      const response = await fetch(this.url);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      this._markdownHtml = MarkdownToHtml(text);
    } catch (e) {
      this._error = `Couldn't load ${this.url}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  private async _loadHtml() {
    if (!this.url) return;
    this._error = null;
    try {
      const response = await fetch(this.url);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      // Relative URLs inside a fetched fragment resolve against the *consuming*
      // page's URL, not the fragment's own location — so a shared partial can't
      // hardcode a relative link back to, say, the gallery index. {{basePath}}
      // is replaced with the relative path from this page back to the folder
      // this.url was fetched from, derived from this.url itself (the same
      // relative prefix the consuming page already had to get right to reach
      // the fragment in the first place).
      const basePath = this.url.slice(0, this.url.lastIndexOf("/") + 1);
      this._htmlFragment = text.replace(/\{\{basePath\}\}/g, basePath);
    } catch (e) {
      this._error = `Couldn't load ${this.url}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  render() {
    if (this.type === "markdown") {
      if (this._error) {
        return html`<div class="error">${this._error}</div>`;
      }
      return html`<div class="markdown">${unsafeHTML(this._markdownHtml)}</div>`;
    }
    if (this.type === "html") {
      if (this._error) {
        return html`<div class="error">${this._error}</div>`;
      }
      return html`${unsafeHTML(this._htmlFragment)}`;
    }
    return html`<iframe src="${this.url}" loading="lazy" title="Embedded content"></iframe>`;
  }
}
