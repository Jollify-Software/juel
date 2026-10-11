export type SortDirection = 'asc' | 'desc';

/** Compares two cell values; negative when `a` comes first. */
export type CellCompare = (a: unknown, b: unknown) => number;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const isEmpty = (v: unknown) => v === null || v === undefined || v === '';

/**
 * The default order: numbers (and numeric strings, and Dates) by value,
 * everything else as text in natural order ("item 2" before "item 10"),
 * ignoring case.
 */
export function compareCells(a: unknown, b: unknown): number {
    const na = toNumber(a), nb = toNumber(b);
    if (na !== null && nb !== null) return na - nb;
    return collator.compare(String(a), String(b));
}

function toNumber(v: unknown): number | null {
    if (typeof v === 'number') return Number.isNaN(v) ? null : v;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    return null;
}

/**
 * The indices of `rows` in display order, sorted by `field`. Stable (equal
 * rows keep their order), and empty values (null, undefined, '') always go
 * last, whichever the direction.
 */
export function sortRows(
    rows: Record<string, any>[],
    field: string | null,
    direction: SortDirection | null,
    compare: CellCompare = compareCells,
): number[] {
    const order = rows.map((_, i) => i);
    if (!field || !direction) return order;
    const sign = direction === 'desc' ? -1 : 1;
    return order.sort((i, j) => {
        const a = rows[i]?.[field], b = rows[j]?.[field];
        const ea = isEmpty(a), eb = isEmpty(b);
        if (ea || eb) return ea === eb ? i - j : ea ? 1 : -1;
        return sign * compare(a, b) || i - j;
    });
}
