// Which items are selected, and which has focus, by path, over an ordered
// list: click selects one, Ctrl/⌘-click toggles, Shift-click selects a range
// from the anchor, arrows move the focus (Shift extends). Pure, so it's
// unit-tested apart from the DOM.

export type SelectionMode = 'none' | 'single' | 'multiple';

export class Selection {
    mode: SelectionMode;
    /** In list order. */
    private order: string[] = [];
    private chosen = new Set<string>();
    /** Where a Shift range starts. */
    anchor?: string;
    /** The keyboard's place. */
    focus?: string;

    constructor(mode: SelectionMode = 'multiple') {
        this.mode = mode;
    }

    /** The list changed: forget what's gone, keep the rest. */
    setItems(paths: string[]) {
        this.order = paths;
        const present = new Set(paths);
        for (const p of [...this.chosen]) if (!present.has(p)) this.chosen.delete(p);
        if (this.anchor && !present.has(this.anchor)) this.anchor = undefined;
        if (this.focus && !present.has(this.focus)) this.focus = undefined;
    }

    /** Selected paths, in list order. */
    get paths(): string[] {
        return this.order.filter(p => this.chosen.has(p));
    }

    get size(): number {
        return this.chosen.size;
    }

    has(path: string): boolean {
        return this.chosen.has(path);
    }

    /** A click (or tap) with its modifier keys. */
    click(path: string, { toggle = false, range = false } = {}) {
        this.focus = path;
        if (this.mode === 'none') return;
        if (this.mode === 'single') { this.only(path); return; }
        if (range && this.anchor) {
            const span = this.span(this.anchor, path);
            if (!toggle) this.chosen.clear();
            for (const p of span) this.chosen.add(p);
            return;
        }
        if (toggle) { this.toggle(path); return; }
        this.only(path);
    }

    /** A checkbox: adds or removes one, keeping the others. */
    toggle(path: string) {
        this.focus = path;
        this.anchor = path;
        if (this.mode === 'none') return;
        if (this.chosen.has(path)) { this.chosen.delete(path); return; }
        if (this.mode === 'single') this.chosen.clear();
        this.chosen.add(path);
    }

    /** Selects just this one. */
    only(path: string) {
        this.chosen.clear();
        if (this.mode !== 'none') this.chosen.add(path);
        this.anchor = path;
        this.focus = path;
    }

    /** Selects these (and only these). */
    set(paths: string[]) {
        this.chosen.clear();
        const present = new Set(this.order);
        const wanted = paths.filter(p => present.has(p));
        for (const p of this.mode === 'single' ? wanted.slice(0, 1) : this.mode === 'none' ? [] : wanted) this.chosen.add(p);
        this.anchor = this.focus = wanted[wanted.length - 1] ?? this.focus;
    }

    all() {
        if (this.mode !== 'multiple') return;
        for (const p of this.order) this.chosen.add(p);
    }

    clear() {
        this.chosen.clear();
    }

    /**
     * Arrow keys, Home and End: moves the focus by `step` (or to an end).
     * With `extend` (Shift) the selection becomes the range from the anchor;
     * otherwise the focused item alone is selected, unless `keep` (Ctrl), which
     * moves the focus only.
     */
    move(step: number | 'first' | 'last', { extend = false, keep = false } = {}): string | undefined {
        if (!this.order.length) return undefined;
        const at = this.focus ? this.order.indexOf(this.focus) : -1;
        const index = step === 'first' ? 0 : step === 'last' ? this.order.length - 1
            : at < 0 ? (step > 0 ? 0 : this.order.length - 1)
            : Math.max(0, Math.min(this.order.length - 1, at + step));
        const path = this.order[index];
        if (keep) { this.focus = path; return path; }
        if (extend && this.mode === 'multiple') {
            this.anchor ??= this.focus ?? path;
            this.focus = path;
            this.chosen.clear();
            for (const p of this.span(this.anchor, path)) this.chosen.add(p);
            return path;
        }
        this.only(path);
        return path;
    }

    private span(a: string, b: string): string[] {
        const i = this.order.indexOf(a), j = this.order.indexOf(b);
        if (i < 0 || j < 0) return [b];
        return this.order.slice(Math.min(i, j), Math.max(i, j) + 1);
    }
}
