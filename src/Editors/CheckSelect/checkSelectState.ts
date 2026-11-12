// The pure half of `<juel-check-select>`: what the button says, and what Select all does.

export interface CheckSelectWords {
    /** Every choice ticked ("All", or "All types"). */
    all: string;
    /** Nothing ticked. */
    none: string;
}

/** Whether all, none or some of `values` are in `selected`. */
export function tickState(values: readonly unknown[], selected: readonly unknown[]): 'all' | 'none' | 'some' {
    const ticked = values.filter(v => selected.includes(v)).length;
    return ticked === 0 ? 'none' : ticked === values.length ? 'all' : 'some';
}

/**
 * The button's words: `all` or `none`, the names when one or two are ticked
 * ("Reports, Notes"), else "3 of 7". With no choices at all it says `none`.
 */
export function checkSelectSummary(items: readonly { text: string; value: unknown }[], selected: readonly unknown[], words: CheckSelectWords): string {
    if (!items.length) return words.none;
    const state = tickState(items.map(i => i.value), selected);
    if (state === 'all') return words.all;
    if (state === 'none') return words.none;
    const ticked = items.filter(i => selected.includes(i.value));
    return ticked.length <= 2 ? ticked.map(i => i.text).join(', ') : `${ticked.length} of ${items.length}`;
}

/**
 * Select all: ticks every choice when any is unticked, else unticks them all. Values the list doesn't
 * offer are kept as they were, so a value from elsewhere isn't lost; the result follows the list's order,
 * then those extra values.
 */
export function toggleAll(values: readonly unknown[], selected: readonly unknown[]): unknown[] {
    const extra = selected.filter(v => !values.includes(v));
    return tickState(values, selected) === 'all' ? extra : [...values, ...extra];
}

/** One choice ticked or unticked, keeping the list's order (then any extra values). */
export function toggleOne(values: readonly unknown[], selected: readonly unknown[], value: unknown, on: boolean): unknown[] {
    const next = new Set(selected);
    if (on) next.add(value); else next.delete(value);
    return [...values.filter(v => next.has(v)), ...[...next].filter(v => !values.includes(v))];
}
