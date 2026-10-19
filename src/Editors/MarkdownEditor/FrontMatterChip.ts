// The front-matter chip for juel-markdown-editor (`front-matter-chip="Deck
// settings"`): a leading `---` … `---` block is folded into one chip that
// names it. Clicking the name fires `front-matter-open` (the app opens its own
// settings dialog); the chevron expands it to show the YAML, and collapses it
// again. Putting the cursor inside the block (a search, arrowing in) shows it.
import { EditorState, Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { lucideIcon } from '../../_Modules/Icons/Lucide';

/** How far down the closing `---` is looked for. */
const MaxLines = 500;

/**
 * The leading front-matter block, from 0 to the end of its closing line, as
 * the writer look's FrontMatter parser reads it. Null when there is none, or
 * while it's unclosed (being typed).
 */
export function frontMatterRange(state: EditorState): { from: number; to: number } | null {
  const doc = state.doc;
  if (doc.lines < 2 || doc.line(1).text.trimEnd() !== '---') return null;
  for (let n = 2; n <= Math.min(doc.lines, MaxLines); n++) {
    const line = doc.line(n);
    const text = line.text.trimEnd();
    if (text === '---' || text === '...') return { from: 0, to: line.to };
  }
  return null;
}

export const toggleFrontMatterEffect = StateEffect.define<boolean>();

class ChipWidget extends WidgetType {
  constructor(readonly label: string, readonly expanded: boolean, readonly onOpen: () => void) { super(); }

  eq(other: ChipWidget) { return other.label === this.label && other.expanded === this.expanded; }

  toDOM(view: EditorView) {
    const chip = document.createElement('div');
    chip.className = 'cm-juel-fm-chip' + (this.expanded ? ' cm-juel-fm-chip-expanded' : '');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cm-juel-fm-toggle';
    toggle.title = this.expanded ? 'Hide the YAML' : 'Show the YAML';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', String(this.expanded));
    const icon = lucideIcon(this.expanded ? 'lucide-chevron-down' : 'lucide-chevron-right');
    if (icon) toggle.style.setProperty('--cm-juel-fm-icon', `url("${icon}")`);
    toggle.addEventListener('mousedown', e => e.preventDefault());
    toggle.addEventListener('click', () => {
      view.dispatch({ effects: toggleFrontMatterEffect.of(!this.expanded) });
    });

    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'cm-juel-fm-name';
    name.textContent = this.label;
    name.addEventListener('mousedown', e => e.preventDefault());
    name.addEventListener('click', () => this.onOpen());

    chip.append(toggle, name);
    return chip;
  }

  ignoreEvent() { return true; }
}

interface ChipState { expanded: boolean; decorations: DecorationSet }

function decorate(state: EditorState, expanded: boolean, label: string, onOpen: () => void): DecorationSet {
  const range = frontMatterRange(state);
  if (!range) return Decoration.none;
  const head = state.selection.main.head;
  const inside = head > range.from && head <= range.to;
  if (expanded || inside) {
    // Shown: the chip sits above the YAML, to collapse it again.
    return Decoration.set(Decoration.widget({ widget: new ChipWidget(label, true, onOpen), block: true, side: -1 }).range(0));
  }
  return Decoration.set(Decoration.replace({ widget: new ChipWidget(label, false, onOpen), block: true }).range(range.from, range.to));
}

const chipTheme = EditorView.baseTheme({
  '.cm-juel-fm-chip': {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    width: 'fit-content',
    margin: '2px 0 6px',
    padding: '1px 8px 1px 2px',
    border: '1px solid var(--juel-border, #d0d4da)',
    borderRadius: 'var(--juel-radius-lg, 12px)',
    background: 'var(--juel-raised, #f3f4f6)',
    color: 'var(--juel-text, inherit)',
    fontFamily: 'var(--juel-font, system-ui, sans-serif)',
    fontSize: '0.85em',
  },
  '.cm-juel-fm-chip button': {
    font: 'inherit',
    color: 'inherit',
    background: 'none',
    border: 'none',
    borderRadius: 'var(--juel-radius-sm, 4px)',
    padding: '2px 4px',
    // WCAG 2.5.8: at least 24px each way, so the two buttons are big enough targets side by side.
    minHeight: '24px',
    minWidth: '24px',
    cursor: 'pointer',
  },
  '.cm-juel-fm-chip button:hover': { background: 'var(--juel-selection, rgba(0,0,0,0.08))' },
  '.cm-juel-fm-chip button:focus-visible': { outline: '2px solid var(--juel-accent, #2563eb)', outlineOffset: '1px' },
  '.cm-juel-fm-toggle': { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  '.cm-juel-fm-toggle::before': {
    content: '""',
    width: '14px',
    height: '14px',
    background: 'currentColor',
    mask: 'var(--cm-juel-fm-icon) center / contain no-repeat',
    WebkitMask: 'var(--cm-juel-fm-icon) center / contain no-repeat',
  },
});

/** Folds the leading front matter into a chip named `label`; `onOpen` runs when the name is clicked. */
export function frontMatterChip(label: string, onOpen: () => void): Extension {
  const field = StateField.define<ChipState>({
    create: state => ({ expanded: false, decorations: decorate(state, false, label, onOpen) }),
    update(value, tr) {
      let expanded = value.expanded;
      for (const effect of tr.effects) if (effect.is(toggleFrontMatterEffect)) expanded = effect.value;
      if (expanded === value.expanded && !tr.docChanged && !tr.selection) return value;
      return { expanded, decorations: decorate(tr.state, expanded, label, onOpen) };
    },
    provide: f => EditorView.decorations.from(f, v => v.decorations),
  });
  return [field, chipTheme];
}
