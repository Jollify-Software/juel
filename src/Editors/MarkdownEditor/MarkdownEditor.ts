import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators';
import { basicSetup, EditorView } from "codemirror";
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown';

@customElement('juel-markdown-editor')
export class JuelMarkdownEditor extends LitElement {
  @property({ type: String })
  content: string = '';

  private editorView?: EditorView;

  createRenderRoot() {
    return this; // Use light DOM
  }

  firstUpdated() {
    const editorContainer = this.querySelector('#editor-container');
    if (!editorContainer) return;

    this.editorView = new EditorView({
      parent: editorContainer,
      state: EditorState.create({
        doc: this.content,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.content = this.editorView?.state.doc.toString() || '';
              this.dispatchEvent(
                new CustomEvent('ContentChanged', {
                  detail: { content: this.content },
                  bubbles: true,
                  composed: true,
                })
              );
            }
          }),
        ],
      })
    });
  }

  updated(changed: PropertyValues) {
    // Keep the editor in sync when `content` is set from outside, without
    // rebuilding the whole CodeMirror instance (which light-DOM re-render would do).
    if (changed.has('content') && this.editorView) {
      const current = this.editorView.state.doc.toString();
      if (current !== this.content) {
        this.editorView.dispatch({
          changes: { from: 0, to: current.length, insert: this.content },
        });
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.editorView?.destroy();
    this.editorView = undefined;
  }

  render() {
    return html`<div id="editor-container" style="height: 100%;"></div>`;
  }
}
