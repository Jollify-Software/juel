// Dividers for juel-markdown-editor (`setDividers`): a rule above the line
// at each offset, and a label (a slide number, say) in a gutter beside it.
// They follow the text as it's edited, until the next setDividers call.
import { RangeSet, RangeSetBuilder, StateEffect, StateField, Extension, Text } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, GutterMarker, gutter } from '@codemirror/view';

export interface MarkdownDivider {
  /** An offset in the line the divider goes above. */
  offset: number;
  /** Shown in the gutter beside that line (e.g. the slide number). */
  label?: string;
}

class LabelMarker extends GutterMarker {
  constructor(readonly label: string) { super(); }
  eq(other: LabelMarker) { return other.label === this.label; }
  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.label;
    return span;
  }
}

interface DividerState { marks: { from: number; label: string }[]; lines: DecorationSet; labels: RangeSet<GutterMarker> }

export const setDividersEffect = StateEffect.define<MarkdownDivider[]>();

const dividerLine = Decoration.line({ class: 'cm-juel-divider' });

function build(marks: { from: number; label: string }[]): DividerState {
  const lines = new RangeSetBuilder<Decoration>();
  const labels = new RangeSetBuilder<GutterMarker>();
  for (const { from, label } of marks) {
    lines.add(from, from, dividerLine);
    if (label) labels.add(from, from, new LabelMarker(label));
  }
  return { marks, lines: lines.finish(), labels: labels.finish() };
}

/** One per line, in order, each at its line's start. */
function normalise(doc: Text, marks: { from: number; label: string }[]) {
  const byLine = new Map<number, string>();
  for (const m of marks) {
    const from = doc.lineAt(Math.max(0, Math.min(m.from, doc.length))).from;
    if (!byLine.has(from)) byLine.set(from, m.label);
  }
  return [...byLine.entries()].sort((a, b) => a[0] - b[0]).map(([from, label]) => ({ from, label }));
}

const dividerField = StateField.define<DividerState>({
  create: () => build([]),
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDividersEffect))
        return build(normalise(tr.state.doc, effect.value.map(d => ({ from: d.offset, label: d.label ?? '' }))));
    }
    if (!tr.docChanged || !value.marks.length) return value;
    // Text typed at a divider's line start goes above it, so map forwards.
    return build(normalise(tr.state.doc, value.marks.map(m => ({ from: tr.changes.mapPos(m.from, 1), label: m.label }))));
  },
  provide: f => EditorView.decorations.from(f, v => v.lines),
});

const dividerTheme = EditorView.baseTheme({
  '.cm-juel-divider': {
    borderTop: '1px dashed var(--juel-border, #d0d4da)',
  },
  // The first line of the text needs no rule above it.
  '.cm-content > .cm-juel-divider:first-child': { borderTop: 'none' },
  '.cm-juel-divider-gutter .cm-gutterElement': {
    color: 'var(--juel-muted, #6b7280)',
    fontSize: '0.75em',
    padding: '0 6px 0 4px',
    textAlign: 'right',
    minWidth: '1.5em',
  },
});

/** The dividers' state, line rules, label gutter and styles. */
export function dividers(): Extension {
  return [
    dividerField,
    gutter({ class: 'cm-juel-divider-gutter', markers: v => v.state.field(dividerField).labels }),
    dividerTheme,
  ];
}
