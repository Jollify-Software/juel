// Suggestions while typing in juel-markdown-editor (DOCS-PLAN H6): the data
// shape, which suggestions apply where the cursor is (matchSuggestions), and
// the @codemirror/autocomplete extension built on it (suggestionsExtension).
import { acceptCompletion, autocompletion, Completion, CompletionContext, CompletionResult, snippet, startCompletion } from '@codemirror/autocomplete';
import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

/** One suggestion offered while typing. */
export interface Suggestion {
    /**
     * The trigger text it follows: `:::` (only at a line start), `![`, `[`,
     * `](`, `{`, `in=`, a front-matter key such as `theme:` (for its values),
     * or `FrontMatterKeyTrigger` (for key names, at the start of a line inside
     * the front matter).
     */
    after: string;
    /** What the list shows, and what typing after the trigger filters on. */
    label: string;
    /** A short note beside the label. */
    detail?: string;
    /** The text inserted in place of what was typed after the trigger: a snippet, `${…}` fields with Tab between them. Default: the label. */
    insert?: string;
    /** A longer explanation for the info panel. */
    info?: string;
    /**
     * Text the insert also replaces when it comes straight after the cursor:
     * `]` for a suggestion after `![`, where the editor has auto-closed the
     * bracket (`![|]`), so an insert of `${alt}](photo.png)` doesn't leave `]]`.
     */
    consume?: string;
}

/** The suggestions that apply at the cursor, and where the typed part begins. */
export interface SuggestionMatch {
    /** The trigger that matched. */
    after: string;
    /** Offset in the line where the typed part (replaced on insert) starts. */
    from: number;
    /** What was typed after the trigger. */
    typed: string;
    /** The suggestions for that trigger whose label starts with `typed` (case-insensitive). */
    options: Suggestion[];
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The trigger for front-matter key names: a line inside the front matter
 * (between the opening `---` on the first line and its closing `---` or
 * `...`) that is empty up to the cursor, or holds only the start of a key
 * (`the`). It has a newline in it, so it never matches a line's text the way
 * the other triggers do.
 */
export const FrontMatterKeyTrigger = '---\n';

/**
 * Whether line `lineIndex` (0-based) is inside a closed front matter: the
 * first line is `---`, and a closing `---` or `...` comes after `lineIndex`.
 * The fences themselves aren't inside, and a lone `---` on the first line
 * with no closing fence (a rule) has no front matter. `lineAt(i)` gives line
 * `i`'s text, or undefined past the end.
 */
export function inFrontMatter(lineAt: (index: number) => string | undefined, lineIndex: number): boolean {
    if (lineIndex < 1 || lineAt(0)?.trimEnd() !== '---') return false;
    for (let i = 1; ; i++) {
        const text = lineAt(i);
        if (text === undefined) return false;
        if (/^(---|\.\.\.)\s*$/.test(text)) return i > lineIndex;
    }
}

/** What may be typed before a key's list still shows: nothing, or the start of a name. */
const frontMatterKeyTyped = /^([A-Za-z][\w-]*)?$/;

/**
 * Finds the trigger just before the cursor (`lineBefore` is the line's text up
 * to the cursor) and the suggestions for it. `:::` counts only at the start of
 * a line; a front-matter key (`theme:`) also matches with spaces after its
 * colon; the longest trigger wins (`](` over `[`). `extraTriggers` are
 * triggers with no fixed suggestions (a `suggest` callback fills them).
 * With `inFrontMatterLine` (the caller knows it: see `inFrontMatter`), a line
 * that is empty up to the cursor, or holds only the start of a key, matches
 * `FrontMatterKeyTrigger`, typed being the key so far. Returns null when no
 * trigger is there.
 */
export function matchSuggestions(lineBefore: string, suggestions: Suggestion[], extraTriggers: string[] = [], inFrontMatterLine = false): SuggestionMatch | null {
    if (inFrontMatterLine && frontMatterKeyTyped.test(lineBefore)) {
        const lower = lineBefore.toLowerCase();
        return {
            after: FrontMatterKeyTrigger,
            from: 0,
            typed: lineBefore,
            options: suggestions.filter(s => s.after === FrontMatterKeyTrigger && s.label.toLowerCase().startsWith(lower)),
        };
    }
    const triggers = Array.from(new Set([...suggestions.map(s => s.after), ...extraTriggers].filter(a => a.length > 0 && a !== FrontMatterKeyTrigger)))
        .sort((a, b) => b.length - a.length);
    for (const after of triggers) {
        const atLineStart = after.startsWith(":::") ? "^\\s*" : "";
        // a front-matter key (`theme:`) may have YAML's space after its colon
        const space = /[^:]:$/.test(after) ? " *" : "";
        const match = new RegExp(`${atLineStart}${escapeRegExp(after)}${space}([\\w./-]*)$`).exec(lineBefore);
        if (!match) continue;
        if (atLineStart && /^\s*:{4,}/.test(lineBefore)) continue; // a longer fence isn't ":::"
        const typed = match[1];
        const lower = typed.toLowerCase();
        return {
            after,
            from: lineBefore.length - typed.length,
            typed,
            options: suggestions.filter(s => s.after === after && s.label.toLowerCase().startsWith(lower)),
        };
    }
    return null;
}

/** The triggers a `suggest` callback is asked about, besides those in `suggestions`. */
export const SuggestionTriggers = [':::', '![', '[', '](', '{', 'in=', FrontMatterKeyTrigger];

/** What a `suggest` callback is asked: the trigger and what was typed after it. */
export interface SuggestRequest {
    after: string;
    typed: string;
}

/** Suggestions for lists that change (files, pages): called at each trigger, merged after the fixed ones. */
export type SuggestCallback = (request: SuggestRequest) => Suggestion[] | Promise<Suggestion[]>;

export interface SuggestionsSetup {
    suggestions: Suggestion[];
    suggest?: SuggestCallback;
    /** Off: the list opens only on Ctrl+Space. */
    live: boolean;
    /** "More in the guide" in the info panel was clicked. */
    onHelp: (suggestion: Suggestion) => void;
}

function infoPanel(s: Suggestion, onHelp: (suggestion: Suggestion) => void): Node {
    const panel = document.createElement('div');
    panel.className = 'cm-juel-suggestion-info';
    const body = document.createElement('div');
    body.innerHTML = s.info ?? '';
    const more = document.createElement('a');
    more.href = '#';
    more.className = 'cm-juel-suggestion-help';
    more.textContent = 'More in the guide';
    more.addEventListener('mousedown', e => e.preventDefault()); // keep the editor's focus
    more.addEventListener('click', e => { e.preventDefault(); onHelp(s); });
    panel.append(body, more);
    return panel;
}

/**
 * A suggestion as a CodeMirror completion: a snippet when its insert has
 * `${…}` fields, and replacing its `consume` text too when that follows.
 */
export function toCompletion(s: Suggestion, onHelp: (suggestion: Suggestion) => void): Completion {
    const insert = s.insert ?? s.label;
    const fields = /\$\{/.test(insert);
    const write = fields ? snippet(insert) : null;
    return {
        label: s.label,
        detail: s.detail,
        info: s.info ? () => infoPanel(s, onHelp) : undefined,
        type: 'text',
        apply: !fields && !s.consume ? insert : (view, completion, from, to) => {
            if (s.consume && view.state.sliceDoc(to, to + s.consume.length) === s.consume) to += s.consume.length;
            if (write) write(view, completion, from, to);
            else view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length }, userEvent: 'input.complete' });
        },
    };
}

const suggestionsLook = EditorView.theme({
    '.cm-tooltip.cm-tooltip-autocomplete, .cm-tooltip.cm-completionInfo': {
        background: 'var(--juel-raised, #fff)',
        color: 'var(--juel-text, #1f2933)',
        border: '1px solid var(--juel-border, #d0d4da)',
        borderRadius: 'var(--juel-radius-sm, 4px)',
        fontFamily: 'var(--juel-font, system-ui, sans-serif)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        background: 'var(--juel-accent, #2563eb)',
        color: 'var(--juel-on-accent, #fff)',
    },
    '.cm-completionDetail': { color: 'var(--juel-muted, #6b7280)', marginLeft: '0.75em' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionDetail': { color: 'inherit', opacity: '0.85' },
    '.cm-juel-suggestion-help': { display: 'inline-block', marginTop: '0.4em', color: 'var(--juel-accent, #2563eb)' },
});

/** Whether CodeMirror line `lineNumber` (1-based) is inside the front matter. */
function lineInFrontMatter(state: EditorState, lineNumber: number): boolean {
    const doc = state.doc;
    return inFrontMatter(i => (i < doc.lines ? doc.line(i + 1).text : undefined), lineNumber - 1);
}

/**
 * The autocomplete extension for juel-markdown-editor: lists the suggestions
 * for the trigger before the cursor, inserts a snippet (Tab between its
 * fields), Enter or Tab takes the selected one, Ctrl+Space opens it on demand.
 */
export function suggestionsExtension(setup: SuggestionsSetup) {
    const { suggestions, suggest, live, onHelp } = setup;
    if (suggestions.length === 0 && !suggest) return [];
    const source = async (context: CompletionContext): Promise<CompletionResult | null> => {
        const line = context.state.doc.lineAt(context.pos);
        const before = line.text.slice(0, context.pos - line.from);
        const match = matchSuggestions(before, suggestions, suggest ? SuggestionTriggers : [], lineInFrontMatter(context.state, line.number));
        if (!match) return null;
        let options = match.options;
        if (suggest) {
            const lower = match.typed.toLowerCase();
            const extra = await suggest({ after: match.after, typed: match.typed });
            options = [...options, ...(extra ?? []).filter(s => s.label.toLowerCase().startsWith(lower))];
        }
        if (options.length === 0) return null;
        return { from: line.from + match.from, options: options.map(s => toCompletion(s, onHelp)), filter: false };
    };
    // A new line in the front matter opens the key list by itself: typing
    // opens the others, and Enter isn't typing to the autocomplete.
    const openOnNewLine = live ? EditorView.updateListener.of(update => {
        if (!update.docChanged) return;
        if (!update.transactions.some(tr => tr.isUserEvent('input') && !tr.isUserEvent('input.type') && !tr.isUserEvent('input.complete'))) return;
        const state = update.state;
        const head = state.selection.main;
        if (!head.empty) return;
        const line = state.doc.lineAt(head.head);
        if (line.text.trim() !== '' || !lineInFrontMatter(state, line.number)) return;
        // not inside this update: CodeMirror doesn't allow a dispatch there
        setTimeout(() => { if (update.view.state === state) startCompletion(update.view); });
    }) : [];
    return [
        autocompletion({ override: [source], activateOnTyping: live }),
        openOnNewLine,
        Prec.high(keymap.of([{ key: 'Tab', run: acceptCompletion }])),
        suggestionsLook,
    ];
}
