// The editor's opt-in "writer" look (`<juel-markdown-editor writer>`): no
// underlined headings, dimmed syntax marks, front matter read as front matter
// rather than as a setext heading, and (with `prose`) a proportional font for
// the text while code stays monospace. Without the attribute the editor looks
// as it always has (CodeMirror's default highlighting, from basicSetup).
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from 'codemirror';
import { Extension } from '@codemirror/state';
import { MarkdownConfig } from '@lezer/markdown';
import { tags } from '@lezer/highlight';

/**
 * A leading `---` … `---` (or `...`) block, as Slipway and most static site
 * generators read it. lang-markdown has none, so without this the YAML's last
 * line and the closing `---` parse as a setext heading. Only at the very start
 * of the text; an unclosed block runs to the end, as it does while being typed.
 */
export const FrontMatter: MarkdownConfig = {
  defineNodes: [
    { name: 'FrontMatter', block: true, style: tags.meta },
    { name: 'FrontMatterMark', style: tags.processingInstruction },
  ],
  parseBlock: [{
    name: 'FrontMatter',
    before: 'HorizontalRule',
    parse(cx, line) {
      if (cx.lineStart !== 0 || line.text.trimEnd() !== '---') return false;
      const marks = [cx.elt('FrontMatterMark', 0, 3)];
      let end = line.text.length;
      while (cx.nextLine()) {
        const text = line.text.trimEnd();
        end = cx.lineStart + line.text.length;
        if (text === '---' || text === '...') {
          marks.push(cx.elt('FrontMatterMark', cx.lineStart, cx.lineStart + 3));
          cx.nextLine();
          break;
        }
      }
      cx.addElement(cx.elt('FrontMatter', 0, end, marks));
      return true;
    },
  }],
};

const mono = 'var(--juel-font-mono, ui-monospace, SFMono-Regular, Consolas, monospace)';
const muted = 'var(--juel-muted, #6b7280)';

/** Headings bold and larger, never underlined; marks (#, *, `, >) dimmed. */
const writerHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: '700', fontSize: '1.3em' },
  { tag: tags.heading2, fontWeight: '700', fontSize: '1.15em' },
  { tag: [tags.heading3, tags.heading4, tags.heading5, tags.heading6], fontWeight: '700' },
  { tag: tags.processingInstruction, color: muted },
  { tag: tags.meta, color: muted, fontFamily: mono },
  { tag: tags.contentSeparator, color: muted },
  { tag: tags.quote, color: muted, fontStyle: 'italic' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--juel-accent, #2563eb)' },
  { tag: tags.url, color: muted },
  { tag: tags.monospace, fontFamily: mono },
]);

/** The editor's chrome in the theme's tokens (fallbacks are CodeMirror's own), so it follows dark mode. */
const writerChrome = EditorView.theme({
  '.cm-gutters': {
    backgroundColor: 'var(--juel-raised, #f5f5f5)',
    color: muted,
    borderRight: '1px solid var(--juel-border, #ddd)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'var(--juel-selection, #e2f2ff)' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--juel-selection, #cceeff) 40%, transparent)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--juel-text, black)' },
});

/** The writer look. basicSetup's default style is only a fallback, so this replaces it.
 *  Long lines soft-wrap, as in a word processor. */
export function writerLook(): Extension {
  return [syntaxHighlighting(writerHighlight), writerChrome, EditorView.lineWrapping];
}

/** A proportional font for the text; code, front matter and the gutter stay monospace. */
export function proseFont(): Extension {
  return EditorView.theme({
    '.cm-content': {
      fontFamily: 'var(--juel-font-prose, var(--juel-font, system-ui, -apple-system, "Segoe UI", sans-serif))',
    },
    '.cm-gutters': { fontFamily: mono },
  });
}
