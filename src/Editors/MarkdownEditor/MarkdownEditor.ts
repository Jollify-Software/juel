import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators';
import { basicSetup, EditorView } from "codemirror";
import { Annotation, ChangeSet, Compartment, EditorSelection, EditorState, MapMode } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown';
import { Diagnostic, setDiagnostics } from '@codemirror/lint';
import { redo, redoDepth, selectAll, undo, undoDepth } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import { FrontMatter, proseFont, writerLook } from './WriterLook';
import { dividers, MarkdownDivider, setDividersEffect } from './Dividers';
import { frontMatterChip } from './FrontMatterChip';
import { MarkdownEditorEvents, MarkdownContentChanged, MarkdownCursor, MarkdownWarning } from './MarkdownEditorEvents';

/** Marks changes made through the API, which don't fire `content-changed`. */
const External = Annotation.define<boolean>();

/**
 * A CodeMirror 6 Markdown editor.
 *
 * Events (bubbling, composed):
 * - `content-changed` `{ content, mapOffset }`: the user changed the text.
 *   `mapOffset(offset)` says where an offset in the text before the change
 *   is now (null if it was deleted), to keep positions in step. Setting
 *   `content` from outside doesn't fire it. (`ContentChanged`, the old name,
 *   still fires for one more release.)
 * - `cursor-changed` `{ offset, line, column }`: the cursor moved (0-based
 *   offset, 1-based line and column).
 *
 * Methods: `setCursor(offset)`, `revealOffset(offset)`, `insertAtCursor(text)`,
 * `wrapSelection(before, after?, placeholder?)`, `toggleLinePrefix(prefix, numbered?)`,
 * `insertBlock(text)`, `replaceRange(from, to, text)`,
 * `replaceRanges([{ from, to, text }])`, `selectedText`,
 * `setWarnings(list)`, `setDividers([{ offset, label? }])`, `focus()`,
 * `undo()`, `redo()`, `undoDepth`, `redoDepth` (the editor's own history, for an
 * app that keeps one Undo across several editors), `selectAll()`, `openSearch()`.
 *
 * Attributes: `readonly`; `writer`, an opt-in calmer look (headings bold, not
 * underlined; syntax marks dimmed; long lines soft-wrap; a leading `---` front-matter block read as
 * such, not as a setext heading); `prose`, a proportional font for the text
 * (`--juel-font-prose`), with code and front matter kept monospace;
 * `front-matter-chip="Deck settings"`, a leading `---` front-matter block
 * folded into a chip with that name: clicking the name fires
 * `front-matter-open`, the chevron shows or hides the YAML.
 */
@customElement('juel-markdown-editor')
export class JuelMarkdownEditor extends LitElement {
  @property({ type: String })
  content: string = '';

  /** Read-only: the text can be selected and the cursor moved, not edited. */
  @property({ type: Boolean, reflect: true })
  readonly: boolean = false;

  /** The opt-in writer look (see above). Off by default: the look is unchanged. */
  @property({ type: Boolean, reflect: true })
  writer: boolean = false;

  /** A proportional font for the text; code stays monospace. */
  @property({ type: Boolean, reflect: true })
  prose: boolean = false;

  /** Folds the leading front matter into a chip with this name. Empty (the default): no chip. */
  @property({ type: String, attribute: 'front-matter-chip', reflect: true })
  frontMatterChip: string = '';

  private editorView?: EditorView;
  private readonlyCompartment = new Compartment();
  private lookCompartment = new Compartment();
  private dividerCompartment = new Compartment();
  private chipCompartment = new Compartment();
  private lastCursor = -1;

  createRenderRoot() {
    return this; // Use light DOM
  }

  firstUpdated() {
    this.createView();
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasUpdated) return;
    if (!this.editorView) {
      this.createView(); // removed earlier and destroyed, now back
    } else if ((this.editorView.root as unknown) !== this.getRootNode()) {
      // Moved (a juel-mdi reorder, a popout window): mount CodeMirror's
      // styles in the new root.
      this.editorView.setRoot(this.getRootNode() as Document | ShadowRoot);
    }
  }

  private createView() {
    const editorContainer = this.querySelector<HTMLElement>(':scope > .juel-markdown-editor-container');
    if (!editorContainer) return;
    this.hasDividers = false; // a new view starts without the gutter

    this.editorView = new EditorView({
      parent: editorContainer,
      // The editor's own root, given explicitly: CodeMirror otherwise finds
      // its root through assignedSlot, so when this element is slotted into
      // a component's shadow root (a juel-mdi panel) it mounts its styles
      // there, where they can't reach the editor's light-DOM nodes.
      root: this.getRootNode() as Document | ShadowRoot,
      state: EditorState.create({
        doc: this.content,
        extensions: [
          basicSetup,
          this.lookCompartment.of(this.lookExtensions()),
          this.dividerCompartment.of([]),
          this.chipCompartment.of(this.chipExtensions()),
          this.readonlyCompartment.of(EditorState.readOnly.of(this.readonly)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.content = update.state.doc.toString();
              const external = update.transactions.some(t => t.annotation(External));
              if (!external) this.emitContentChanged(update.changes);
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
    if ((changed.has('writer') || changed.has('prose')) && this.editorView) {
      this.editorView.dispatch({ effects: this.lookCompartment.reconfigure(this.lookExtensions()) });
    }
    if (changed.has('frontMatterChip') && changed.get('frontMatterChip') !== undefined) {
      this.editorView.dispatch({ effects: this.chipCompartment.reconfigure(this.chipExtensions()) });
    }
    if (changed.has('readonly')) {
      this.editorView.dispatch({
        effects: this.readonlyCompartment.reconfigure(EditorState.readOnly.of(this.readonly)),
      });
    }
  }

  private chipExtensions() {
    return this.frontMatterChip
      ? frontMatterChip(this.frontMatterChip, () => this.dispatchEvent(
        new CustomEvent(MarkdownEditorEvents.frontMatterOpen, { bubbles: true, composed: true })))
      : [];
  }

  private lookExtensions() {
    return [
      this.writer ? [markdown({ extensions: FrontMatter }), writerLook()] : markdown(),
      this.prose ? proseFont() : [],
    ];
  }

  /** How many steps the editor's own history can undo / redo. */
  get undoDepth(): number {
    return this.editorView ? undoDepth(this.editorView.state) : 0;
  }
  get redoDepth(): number {
    return this.editorView ? redoDepth(this.editorView.state) : 0;
  }

  /** One step of the editor's own history (as Ctrl+Z / Ctrl+Y). False if there's none. */
  undo(): boolean {
    return this.editorView && !this.readonly ? undo(this.editorView) : false;
  }
  redo(): boolean {
    return this.editorView && !this.readonly ? redo(this.editorView) : false;
  }

  /** Selects the whole text and focuses the editor. */
  selectAll() {
    const view = this.editorView;
    if (!view) return;
    selectAll(view);
    view.focus();
  }

  /** Opens the find (and replace) panel. */
  openSearch() {
    const view = this.editorView;
    if (!view) return;
    openSearchPanel(view);
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

  /**
   * Selects `from`–`to` (clamped) and scrolls it into view, without taking
   * focus: a tool elsewhere (a toolbar over a preview) can then use
   * wrapSelection / toggleLinePrefix on that stretch.
   */
  setSelection(from: number, to: number) {
    const view = this.editorView;
    if (!view) return;
    const anchor = this.clamp(from), head = this.clamp(to);
    view.dispatch({ selection: EditorSelection.range(anchor, head), effects: EditorView.scrollIntoView(head, { y: 'center' }) });
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
   * Replaces the text from `from` to `to` (offsets, clamped) with `text`, as
   * one undoable user edit; the cursor keeps its place where it can. For a
   * tool that rewrites one part of the document, such as a settings form
   * editing the front matter.
   */
  replaceRange(from: number, to: number, text: string) {
    const view = this.editorView;
    if (!view || this.readonly) return;
    const start = this.clamp(Math.min(from, to)), end = this.clamp(Math.max(from, to));
    if (view.state.sliceDoc(start, end) === text) return;
    view.dispatch({ changes: { from: start, to: end, insert: text }, userEvent: 'input' });
  }

  /**
   * Several replacements as one edit (one undo step). Offsets are all in the
   * current text; the ranges must not overlap.
   */
  replaceRanges(ranges: { from: number; to: number; text: string }[]) {
    const view = this.editorView;
    if (!view || this.readonly || ranges.length === 0) return;
    const changes = ranges.map(r => ({
      from: this.clamp(Math.min(r.from, r.to)), to: this.clamp(Math.max(r.from, r.to)), insert: r.text,
    })).sort((a, b) => a.from - b.from);
    view.dispatch({ changes, userEvent: 'input' });
  }

  /** The text of the main selection ('' when it's just a cursor). */
  get selectedText(): string {
    const view = this.editorView;
    if (!view) return '';
    const { from, to } = view.state.selection.main;
    return view.state.sliceDoc(from, to);
  }

  /**
   * Toggles `before`/`after` around each selection: wraps it (`**bold**`),
   * or unwraps it if it's already wrapped. An empty selection gets
   * `before + placeholder + after` with the placeholder selected, ready to
   * type over. An undoable user edit.
   */
  wrapSelection(before: string, after: string = before, placeholder: string = '') {
    const view = this.editorView;
    if (!view || this.readonly) return;
    const { state } = view;
    view.dispatch(state.changeByRange(range => {
      const outerFrom = range.from - before.length, outerTo = range.to + after.length;
      const wrapped = outerFrom >= 0 && outerTo <= state.doc.length
        && state.sliceDoc(outerFrom, range.from) === before && state.sliceDoc(range.to, outerTo) === after;
      if (wrapped) {
        return {
          changes: [{ from: outerFrom, to: range.from }, { from: range.to, to: outerTo }],
          range: EditorSelection.range(outerFrom, range.to - before.length),
        };
      }
      const text = range.empty ? placeholder : state.sliceDoc(range.from, range.to);
      return {
        changes: { from: range.from, to: range.to, insert: before + text + after },
        range: EditorSelection.range(range.from + before.length, range.from + before.length + text.length),
      };
    }), { scrollIntoView: true, userEvent: 'input' });
    view.focus();
  }

  /**
   * Toggles a prefix on every line the selection touches: adds it to each
   * (`- `, `> `), or removes it if every line already has it. With
   * `numbered`, the prefix is `1. `, `2. `… and any `N. ` counts as present.
   */
  toggleLinePrefix(prefix: string, numbered = false) {
    const view = this.editorView;
    if (!view || this.readonly) return;
    const { state } = view;
    const { from, to } = state.selection.main;
    const first = state.doc.lineAt(from).number, last = state.doc.lineAt(to).number;
    const lines = Array.from({ length: last - first + 1 }, (_, i) => state.doc.line(first + i));
    const present = (text: string) => numbered ? /^\d+\.\s/.test(text) : text.startsWith(prefix);
    const all = lines.every(l => l.length === 0 || present(l.text)) && lines.some(l => l.length > 0);
    const changes = lines.filter(l => l.length > 0).map((l, i) => all
      ? { from: l.from, to: l.from + (numbered ? /^\d+\.\s/.exec(l.text)![0].length : prefix.length) }
      : { from: l.from, insert: numbered ? `${i + 1}. ` : prefix });
    view.dispatch({ changes, scrollIntoView: true, userEvent: 'input' });
    view.focus();
  }

  /**
   * Inserts `text` as a block of its own: after the cursor's line, with a
   * blank line before and after, and the cursor placed at its end. For
   * slides, tables, containers.
   */
  insertBlock(text: string) {
    const view = this.editorView;
    if (!view || this.readonly) return;
    const { state } = view;
    const line = state.doc.lineAt(state.selection.main.head);
    const at = line.length === 0 ? line.from : line.to;
    // Exactly one blank line on each side, counting the newlines already there.
    const behind = state.sliceDoc(Math.max(0, at - 2), at);
    const ahead = state.sliceDoc(at, at + 2);
    const before = at === 0 || behind === '\n\n' ? '' : behind.endsWith('\n') ? '\n' : '\n\n';
    const after = ahead === '' ? '\n' : ahead === '\n\n' ? '' : ahead.startsWith('\n') ? '\n' : '\n\n';
    const body = text.replace(/\n+$/, '');
    view.dispatch({
      changes: { from: at, insert: before + body + after },
      selection: EditorSelection.cursor(at + before.length + body.length),
      scrollIntoView: true,
      userEvent: 'input',
    });
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

  /**
   * Draws a rule above the line at each offset, with its `label` (a slide
   * number, say) in a gutter beside it; they follow edits until the next call.
   * The gutter only appears once this is first called.
   */
  setDividers(list: MarkdownDivider[]) {
    const view = this.editorView;
    if (!view) return;
    if (!this.hasDividers) {
      this.hasDividers = true;
      view.dispatch({ effects: this.dividerCompartment.reconfigure(dividers()) });
    }
    view.dispatch({ effects: setDividersEffect.of(list) });
  }
  private hasDividers = false;

  focus() {
    this.editorView?.focus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // A move (remove + insert in one task) keeps the editor, its text and
    // its undo history; only an element that stays removed is torn down.
    queueMicrotask(() => {
      if (this.isConnected) return;
      this.editorView?.destroy();
      this.editorView = undefined;
    });
  }

  render() {
    return html`<div class="juel-markdown-editor-container" style="height: 100%;"></div>`;
  }

  private clamp(offset: number): number {
    const length = this.editorView?.state.doc.length ?? 0;
    return Math.max(0, Math.min(Math.trunc(Number(offset) || 0), length));
  }

  private emitContentChanged(changes: ChangeSet) {
    // Where an offset in the text before this change is now; null if the
    // character there was deleted. An insertion exactly at the offset lands
    // before it, so an offset anchored to the start of a block stays there.
    const mapOffset = (offset: number): number | null => {
      if (offset < 0 || offset > changes.length) return null;
      return changes.mapPos(offset, 1, MapMode.TrackAfter);
    };
    for (const name of [MarkdownEditorEvents.contentChanged, MarkdownEditorEvents.legacyContentChanged]) {
      this.dispatchEvent(new CustomEvent<MarkdownContentChanged>(name, { detail: { content: this.content, mapOffset }, bubbles: true, composed: true }));
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
