import { LitElement, html } from 'lit';
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
    if (editorContainer) {
      /*
      new EditorView({
            parent: $(this).find("#code-mirror-placeholder")[0],
            state: EditorState.create({
                doc: this.content,
                extensions: [
                  basicSetup,
                  markdown(),
                  EditorView.updateListener.of(this.contentChanged)
                ]    
              })
          });
      */
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
  }

  render() {
    return html`<div id="editor-container" style="height: 100%;"></div>`;
  }
}