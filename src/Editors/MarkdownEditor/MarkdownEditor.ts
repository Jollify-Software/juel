import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators';
import { basicSetup, EditorView } from "codemirror";
import { Annotation, Compartment, EditorSelection, EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown';
import { Diagnostic, setDiagnostics } from '@codemirror/lint';
import { MarkdownEditorEvents, MarkdownCursor, MarkdownWarning } from './MarkdownEditorEvents';

/** Marks changes made through the API, which don't fire `content-changed`. */
const External = Annotation.define<boolean>();

/**
 * A CodeMirror 6 Markdown editor.
 *
 * Events (bubbling, composed):
 * - `content-changed` `{ content }`: the user changed the text. Setting
 *   `content` from outside doesn't fire it. (`ContentChanged`, the old name,
 *   still fires for one more release.)
 * - `cursor-changed` `{ offset, line, column }`: the cursor moved (0-based
 *   offset, 1-based line and column).
 *
 * Methods: `setCursor(offset)`, `revealOffset(offset)`, `insertAtCursor(text)`,
 * `setWarnings(list)`, `focus()`.
 */
@customElement('juel-markdown-editor')
export class JuelMarkdownEditor extends LitElement {
  @property({ type: String })
  content: string = '';

  /** Read-only: the text can be selected and the cursor moved, not edited. */
  @property({ type: Boolean, reflect: true })
  readonly: boolean = false;

  private editorView?: EditorView;
  private readonlyCompartment = new Compartment();
  private lastCursor = -1;

  createRenderRoot() {
    return this; // Use light DOM
  }

  firstUpdated() {
    const editorContainer = this.querySelector<HTMLElement>(':scope > .juel-markdown-editor-container');
    if (!editorContainer) return;

    this.editorView = new EditorView({
      parent: editorContainer,
      state: EditorState.create({
        doc: this.content,
        extensions: [
          basicSetup,
          markdown(),
          this.readonlyCompartment.of(EditorState.readOnly.of(this.readonly)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.content = update.state.doc.toString();
              const external = update.transactions.some(t => t.annotation(External));
              if (!external) this.emitContentChanged();
            }
            if (update.docChanged || update.selectionSet) this.emitCursorChanged(update.state);
          }),
        ],
      })
    });
  }

  updated(changed: PropertyValues) {
    if (!this.editorView) return;
    // Keep the editor in sync when `content` is set from outside, without
    // rebuilding the whole CodeMirror instance (which light-DOM re-render would do).
    if (changed.has('content')) {
      const current = this.editorView.state.doc.toString();
      if (current !== this.content) {
        const head = Math.min(this.editorView.state.selection.main.head, this.content.length);
        this.editorView.dispatch({
          changes: { from: 0, to: current.length, insert: this.content },
          selection: { anchor: head },
          annotations: External.of(true),
        });
      }
    }
    if (changed.has('readonly')) {
      this.editorView.dispatch({
        effects: this.readonlyCompartment.reconfigure(EditorState.readOnly.of(this.readonly)),
      });
    }
  }

  /** The cursor's offset in the text (0-based). */
  get cursor(): number {
    return this.editorView?.state.selection.main.head ?? 0;
  }

  /** Moves the cursor to `offset` (clamped to the text) and scrolls it into view. */
  setCursor(offset: number) {
    const view = this.editorView;
    if (!view) return;
    const at = this.clamp(offset);
    view.dispatch({ selection: EditorSelection.cursor(at), effects: EditorView.scrollIntoView(at, { y: 'center' }) });
  }

  /** Scrolls `offset` into view without moving the cursor. */
  revealOffset(offset: number) {
    this.editorView?.dispatch({ effects: EditorView.scrollIntoView(this.clamp(offset), { y: 'center' }) });
  }

  /**
   * Replaces the selection (or inserts at the cursor) with `text`, as the
   * user's own edit: it fires `content-changed` and can be undone.
   */
  insertAtCursor(text: string) {
    const view = this.editorView;
    if (!view || this.readonly) return;
    view.dispatch(view.state.replaceSelection(text), { scrollIntoView: true, userEvent: 'input' });
    view.focus();
  }

  /**
   * Underlines problems in the text, such as a generator's warnings. Each has
   * a `message` and a `from` offset (`to` defaults to the end of that line).
   * An empty list clears them.
   */
  setWarnings(warnings: MarkdownWarning[]) {
    const view = this.editorView;
    if (!view) return;
    const doc = view.state.doc;
    const diagnostics: Diagnostic[] = warnings.map(w => {
      const from = this.clamp(w.from ?? 0);
      const to = Math.max(from, this.clamp(w.to ?? doc.lineAt(from).to));
      return { from, to, severity: w.severity ?? 'warning', message: w.message };
    });
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }

  focus() {
    this.editorView?.focus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.editorView?.destroy();
    this.editorView = undefined;
  }

  render() {
    return html`<div class="juel-markdown-editor-container" style="height: 100%;"></div>`;
  }

  private clamp(offset: number): number {
    const length = this.editorView?.state.doc.length ?? 0;
    return Math.max(0, Math.min(Math.trunc(Number(offset) || 0), length));
  }

  private emitContentChanged() {
    for (const name of [MarkdownEditorEvents.contentChanged, MarkdownEditorEvents.legacyContentChanged]) {
      this.dispatchEvent(new CustomEvent(name, { detail: { content: this.content }, bubbles: true, composed: true }));
    }
  }

  private emitCursorChanged(state: EditorState) {
    const offset = state.selection.main.head;
    if (offset === this.lastCursor) return;
    this.lastCursor = offset;
    const line = state.doc.lineAt(offset);
    this.dispatchEvent(new CustomEvent<MarkdownCursor>(MarkdownEditorEvents.cursorChanged, {
      detail: { offset, line: line.number, column: offset - line.from + 1 },
      bubbles: true,
      composed: true,
    }));
  }
}
