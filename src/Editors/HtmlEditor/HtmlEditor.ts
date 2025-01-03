import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';
import Quill from 'quill';
import QuillTheme from 'bundle-text:quill/dist/quill.bubble.css';
import { HtmlEditorService } from './HtmlEditorService';

@customElement('html-editor')
export class HTMLEditor extends LitElement {
  @property({ type: String })
  value: string = '';

  @property({ type: String, attribute: 'root-id' })
  rootId: string = '';

  private editorContainer!: HTMLDivElement;
  private quill!: Quill;
  private selectedElement: HTMLElement | null = null;

  private editorService = new HtmlEditorService();

  styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }

    .editor-container {
      border: 1px solid #ccc;
      border-radius: 5px;
      min-height: 200px;
    }

    .ql-toolbar button.ql-drag-button {
      mask-image: var(--icon-arrows-move);
      mask-repeat: no-repeat;
      -webkit-mask-image: var(--icon-arrows-move);
      -webkit-mask-repeat: no-repeat;
      background-color: #fff;
    }
    .ql-toolbar button.ql-rotate-button {
      mask-image: var(--icon-arrows-rotate);
      mask-repeat: no-repeat;
      -webkit-mask-image: var(--icon-arrows-rotate);
      -webkit-mask-repeat: no-repeat;
      background-color: #fff;
    }
  `;

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.editorContainer = this.querySelector('#editor-container') as HTMLDivElement;

    this.initializeQuill();
  }

  initializeQuill() {
    this.quill = this.editorService.initializeQuill(this.editorContainer, {
      theme: 'bubble',
      value: this.value,
      onValueChange: (value: string) => {
        this.value = value;
        this.dispatchEvent(new CustomEvent('value-changed', {
          detail: { value: this.value },
          bubbles: true,
          composed: true,
        }));
      },
      onSelectionChange: (element: HTMLElement | null) => {
        this.selectedElement = element;
      },
    });

    // Set the root ID if provided
    if (this.rootId) {
      this.quill.root.setAttribute('id', this.rootId);
    }
  }

  // Get method for the value property
  getValue(): string {
    return this.quill ? this.quill.root.innerHTML : this.value;
  }

  // Set method for the value property
  setValue(newValue: string): void {
    this.value = newValue;
    console.log('Setting value', newValue);
    if (this.quill) {
      var delta = this.quill.clipboard.convert({ html: newValue });
      this.quill.setContents(delta);
    }
  }

  setBaseStyles(cssString: string): void {
    if (this.editorContainer) {
      const styleElement = this.querySelector('#editor-base') as HTMLStyleElement;
      styleElement.textContent = cssString;
    }
  }

  setTheme(cssString: string): void {
    if (this.editorContainer) {
      const styleElement = this.querySelector('#editor-theme') as HTMLStyleElement;
      styleElement.textContent = cssString;
    }
  }

  render() {
    return html`
    <style>${QuillTheme}${this.styles}</style>
    <style id="editor-base"></style>
    <style id="editor-theme"></style>
      <div id="editor-container" class="editor-container"></div>
    `;
  }

  // Ensure Quill is cleaned up
  disconnectedCallback() {
    super.disconnectedCallback();
    this.editorService.cleanupQuill(this.quill);
  }
}

// Usage example in HTML
// <html-editor rootId="custom-root-id">
//   <p>Initial content</p>
// </html-editor>
