import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { MarkdownToHtml } from "../../_Utils/MarkdownToHtml";

@customElement("juel-embed")
export class JuelEmbed extends LitElement {
  @property({ type: String }) url = "";
  @property({ type: String }) type: "html" | "markdown" = "html";

  @state() private _markdownHtml = "";
  @state() private _error: string | null = null;

  static styles = css`
    :host {
      display: block;
    }
    iframe {
      display: block;
      width: 100%;
      height: var(--embed-height, 600px);
      border: none;
    }
    .markdown {
      max-width: 60em;
      line-height: 1.6;
    }
    .markdown pre {
      background: #f8f9fa;
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      overflow-x: auto;
    }
    .markdown code {
      background: #f1f3f5;
      padding: 0.1rem 0.3rem;
      border-radius: 0.25rem;
    }
    .markdown pre code {
      background: none;
      padding: 0;
    }
    .error {
      color: var(--danger, #dc3545);
      padding: 0.75rem 1rem;
      border: 1px solid currentColor;
      border-radius: 0.375rem;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (this.type === "markdown") {
      this._loadMarkdown();
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if ((changedProperties.has("url") || changedProperties.has("type")) && this.type === "markdown") {
      this._loadMarkdown();
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

  render() {
    if (this.type === "markdown") {
      if (this._error) {
        return html`<div class="error">${this._error}</div>`;
      }
      return html`<div class="markdown">${unsafeHTML(this._markdownHtml)}</div>`;
    }
    return html`<iframe src="${this.url}" loading="lazy" title="Embedded content"></iframe>`;
  }
}
