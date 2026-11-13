// Page lists for <juel-pdf> and Jetty's pages as builds (`{pages="4-6"}`). No DOM, so Jest can test it.

/** The most pages one list names. */
const MaxPages = 1000;

/** `"4-6"`, `"2, 5, 9-10"`: the pages named, in order, within 1..count when it's known. */
export function parsePages(text: string | null | undefined, count = Infinity): number[] {
    const pages: number[] = [];
    for (const part of (text ?? '').split(',')) {
        const m = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
        if (!m) continue;
        const first = Number(m[1]);
        const last = m[2] === undefined ? first : Number(m[2]);
        // Both ends inside 1..count first, so a range past the end never counts through pages that aren't there.
        const low = Math.max(1, Math.min(first, last));
        const high = Math.min(count, Math.max(first, last));
        if (low > high) continue;
        const step = last >= first ? 1 : -1;
        for (let n = step > 0 ? low : high; n >= low && n <= high && pages.length < MaxPages; n += step) pages.push(n);
    }
    return pages;
}
