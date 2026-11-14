// A quiz as a viewer sees it (QUIZ-PLAN Q5): students follow a presentation on their own devices, and the page they
// get must not hold the answers. The presenting screen's quiz describes itself with `viewerView()`: its question,
// items and groups as HTML in the order they show there (so the order gives nothing away), its state in that order,
// and the key only once the answer is revealed. A viewer turns that back into markup (`quizViewMarkup`) inside an
// empty `<juel-quiz no-shuffle>`, and sets the state. See README.md "Viewers".
import { QuizState, QuizType } from './QuizState';

export interface QuizView {
    type: QuizType;
    /** The question, as HTML. */
    question: string;
    /** The items (match: the partners), as HTML, in the order shown. */
    items: string[];
    /** Sort: the groups; match: the left column. In source order (never shuffled). */
    groups: { html: string; colour?: string }[];
    /** The state, with every item index in the order shown. */
    state: QuizState;
    /** Only once revealed: the key as `data-answer` reads it, in the order shown. */
    answer?: number[];
    /** Only once revealed: the explanation, as HTML. */
    explanation?: string;
}

/**
 * Turns a quiz's state, key and items from source order into the order shown (`order[j]` is the source index shown at
 * place j). Pure, for `viewerView` and its tests.
 */
export function toShownOrder(type: QuizType, order: number[], state: QuizState, answer: number[] | null):
    { state: QuizState; answer?: number[] } {
    const shownAt: number[] = [];
    order.forEach((source, j) => shownAt[source] = j);
    const at = (i: number) => (Number.isInteger(i) && i >= 0 && i < shownAt.length ? shownAt[i] : -1);
    const next: QuizState = { ...state, selected: state.selected.map(at).filter(j => j >= 0).sort((a, b) => a - b) };
    // Sort and match: `placed` is indexed by item (match: by partner), so it follows the items.
    if (state.placed) next.placed = order.map(i => state.placed![i] ?? null);
    if (!answer) return { state: next };
    // Choice: the right items. Sort: each item's group (indexed by item). Match: each left entry's partner (a value).
    const shown = type === 'choice' ? answer.map(at).filter(j => j >= 0).sort((a, b) => a - b)
        : type === 'sort' ? order.map(i => answer[i] ?? -1)
            : answer.map(at);
    return { state: next, answer: shown };
}

const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The light DOM for a viewer's `<juel-quiz no-shuffle>`: the question, the lists in the order shown, and once revealed
 * the explanation (the key goes in `data-answer`, which the caller sets). The HTML comes from the presenting deck,
 * which the viewer's own page came from too, so it's as trusted as that page.
 */
export function quizViewMarkup(view: QuizView): string {
    const li = (html: string) => `<li>${html}</li>`;
    const groups = view.groups.map(g => g.colour ? `<li data-colour="${escapeAttr(g.colour)}">${g.html}</li>` : li(g.html)).join('');
    const items = view.items.map(li).join('');
    const lists = view.type === 'sort' ? `<ol data-groups>${groups}</ol><ul>${items}</ul>`
        : view.type === 'match' ? `<ul>${groups}</ul><ul data-partners>${items}</ul>`
            : `<ul>${items}</ul>`;
    const explanation = view.explanation ? `<blockquote>${view.explanation}</blockquote>` : '';
    return `<div>${view.question}</div>${lists}${explanation}`;
}
