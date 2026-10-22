// The state of a <juel-quiz>, kept apart from the element so it can travel:
// a small serialisable object, changed only by messages (QUIZ-PLAN.md §4–§5).
// A stage, a presenter console or a viewer that applies the same messages to
// the same state ends up showing the same thing.

export type QuizType = 'choice' | 'sort' | 'match';

/** Sort and match: items are moved into places (groups, or partner slots). */
export const placesItems = (type: QuizType): boolean => type === 'sort' || type === 'match';

export interface QuizState {
    type: QuizType;
    /** Chosen items, as indices into the source order (not the shuffled one). */
    selected: number[];
    /** Check has been pressed since the last change. */
    checked: boolean;
    /** The answer is showing. */
    revealed: boolean;
    /**
     * Sort and match only: where each item (source order) is: a group or a
     * partner slot, or null while it's still in the pool.
     */
    placed?: (number | null)[];
}

export type QuizMessage =
    | { type: 'quiz-select'; index: number; on: boolean }
    | { type: 'quiz-move'; index: number; to: number | null }
    | { type: 'quiz-check' }
    | { type: 'quiz-reveal' }
    | { type: 'quiz-reset' };

/** The start: nothing chosen; for sort and match, `count` items all in the pool. */
export const initialState = (type: QuizType = 'choice', count = 0): QuizState =>
    placesItems(type)
        ? { type, selected: [], checked: false, revealed: false, placed: Array<number | null>(count).fill(null) }
        : { type, selected: [], checked: false, revealed: false };

/**
 * Apply one message. `multiple` is false for a one-answer (radio) quiz, where
 * selecting an item clears the others. `places` is how many groups or slots a
 * sort or match quiz has; `answer` is its key, for `quiz-reveal`. Returns a
 * new object; never mutates.
 */
export function reduce(state: QuizState, message: QuizMessage, multiple: boolean, count: number,
    places = 0, answer: number[] = []): QuizState {
    switch (message.type) {
        case 'quiz-select': {
            const { index, on } = message;
            if (!Number.isInteger(index) || index < 0 || index >= count) return state;
            let selected = state.selected.filter(i => i !== index);
            if (on) selected = multiple ? [...selected, index].sort((a, b) => a - b) : [index];
            // Already so: nothing changes, and a Check stays marked.
            if (selected.length === state.selected.length && selected.every((v, i) => v === state.selected[i])) return state;
            return { ...state, selected, checked: false, revealed: false };
        }
        case 'quiz-move': {
            const { index, to } = message;
            if (!state.placed || !Number.isInteger(index) || index < 0 || index >= count) return state;
            if (to !== null && (!Number.isInteger(to) || to < 0 || to >= places)) return state;
            // Dropped where it already is: nothing changes, and a Check stays marked.
            if ((state.placed[index] ?? null) === to) return state;
            const placed = Array.from({ length: count }, (_, i) => state.placed![i] ?? null);
            // A match slot holds one partner: the one already there goes back to the pool.
            if (state.type === 'match' && to !== null)
                for (let i = 0; i < count; i++) if (placed[i] === to) placed[i] = null;
            placed[index] = to;
            return { ...state, placed, checked: false, revealed: false };
        }
        case 'quiz-check':
            return { ...state, checked: true };
        case 'quiz-reveal':
            return state.placed
                ? { ...state, revealed: true, placed: Array.from({ length: count }, (_, i) => answer[i] ?? null) }
                : { ...state, revealed: true };
        case 'quiz-reset':
            return initialState(state.type, state.placed?.length ?? count);
        default:
            return state;
    }
}

/**
 * True when exactly the right items are chosen (choice), or every item is in
 * its right place (sort, match: `answer[i]` is item i's group or slot).
 */
export function isCorrect(state: QuizState, answer: number[]): boolean {
    if (state.placed)
        return state.placed.length > 0 && state.placed.every((p, i) => p !== null && p === answer[i]);
    const want = [...new Set(answer)].sort((a, b) => a - b);
    return state.selected.length === want.length && state.selected.every((v, i) => v === want[i]);
}

/** `data-answer="1, 3"` → [1, 3]; anything not a whole number is dropped. */
export function parseAnswer(text: string | null | undefined): number[] {
    return (text ?? '').split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s)).map(Number);
}

/** A 32-bit FNV-1a hash of a string: the default seed is the question text. */
export function hashSeed(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** mulberry32: a small seeded PRNG, so every screen shuffles the same way. */
function random(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The display order: source indices, shuffled by `seed` (Fisher–Yates). A
 * list of two or fewer (yes/no) keeps its order, and so does `shuffle: false`.
 */
export function displayOrder(count: number, seed: number, shuffle = true): number[] {
    const order = Array.from({ length: count }, (_, i) => i);
    if (!shuffle || count <= 2) return order;
    const next = random(seed);
    for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}

/**
 * Sort and match, after Check: each item's mark, `right`, `wrong`, or null
 * for one still in the pool. Empty for a choice quiz.
 */
export function marks(state: QuizState, answer: number[]): ('right' | 'wrong' | null)[] {
    return (state.placed ?? []).map((p, i) => p === null ? null : p === answer[i] ? 'right' : 'wrong');
}
