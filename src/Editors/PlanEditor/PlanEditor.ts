import { LitElement, css, html, svg as svgTemplate, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators';
import { HistoryController } from '../../_Base/HistoryController';
import {
    attributesOf, ensureIds, isLevelGroup, levelOf, parsePlan, planBounds, planItems, serializePlan,
    setAttributesOf, snapTo, translateItem,
} from './planDocument';

/** A rectangle in plan units. */
interface Box { x: number; y: number; width: number; height: number }

/** Why the plan changed (`plan-changed`'s `reason`). */
export type PlanChangeReason = 'move' | 'delete' | 'attributes' | 'undo' | 'redo';

/**
 * `<juel-plan-editor>`: edits an SVG plan, a floor plan most often (the Jollify
 * app's virtual layouts; Parterre's annotated SVG). Any SVG works: the editor
 * moves shapes and sets attributes; what a `data-*` attribute *means* is the
 * app's business.
 *
 * - **Document:** `svg`, the plan's text (in and out). Its items are the root's
 *   shapes and groups and those in storey groups (`<g data-fixture="level"
 *   data-level="n">`); each gets an `id` if it has none.
 * - **View:** a grid (`grid`, in plan units; every tenth line darker), zoom (wheel,
 *   `+`/`-`, `fit()` or `0`) and pan (drag with the middle button or with Space held).
 * - **Storeys:** `level` shows one storey; the others are faint and can't be picked
 *   (tracing paper). An item's storey is its own `data-level`, its group's, or 0.
 * - **Selection:** click (Shift adds or removes), drag a box on empty space,
 *   Ctrl+A, Escape. Drag selected items to move them, snapped to `grid` unless
 *   `snap` is off (Alt while dragging also turns it off); the arrow keys move by a
 *   grid step (Shift: ten). Delete removes them.
 * - **History:** `undo()` / `redo()` (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z), its own, like
 *   `juel-markdown-editor`'s; `canUndo` / `canRedo`; `history-changed` bubbles.
 * - **API:** `selection` (ids), `select(ids)`, `setAttributes(ids, { name: value | null })`,
 *   `deleteSelection()`, `fit()`, `itemAttributes(id)`.
 * - **Events:** `plan-changed` `{ svg, reason }` after each change you make;
 *   `selection-changed` `{ ids, attributes }` (each selected item's attributes).
 *   Setting `svg` from outside fires neither, and starts a new history.
 */
@customElement('juel-plan-editor')
export class JuelPlanEditor extends LitElement {
    static styles = css`
        :host { display: block; position: relative; overflow: hidden; height: 400px; outline: none;
            background: var(--plan-background, var(--juel-surface, #fff)); touch-action: none; }
        :host(:focus-visible) { box-shadow: inset 0 0 0 2px var(--juel-accent, #3b6fd8); }
        svg.view { width: 100%; height: 100%; display: block; user-select: none; cursor: default; }
        :host([panning]) svg.view { cursor: grab; }
        .grid-minor { stroke: var(--plan-grid, rgba(0, 0, 0, .08)); }
        .grid-major { stroke: var(--plan-grid-major, rgba(0, 0, 0, .18)); }
        .doc * { cursor: pointer; }
        .selected { fill: none; stroke: var(--juel-accent, #3b6fd8); stroke-width: 1.5; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; pointer-events: none; }
        .marquee { fill: color-mix(in srgb, var(--juel-accent, #3b6fd8) 12%, transparent); stroke: var(--juel-accent, #3b6fd8);
            stroke-width: 1; vector-effect: non-scaling-stroke; pointer-events: none; }
    `;

    /** The plan's SVG text. */
    @property({ type: String }) svg = '';
    /** The storey shown (the others faint). */
    @property({ type: Number }) level = 0;
    /** Grid step in plan units (0 for none). */
    @property({ type: Number }) grid = 50;
    /** Snap moves to the grid. */
    @property({ type: Boolean }) snap = true;
    /** Look, select and zoom, but no changes. */
    @property({ type: Boolean, reflect: true }) readonly = false;

    @state() private view: Box = { x: 0, y: 0, width: 1000, height: 1000 };
    @state() private selected: string[] = [];
    @state() private marquee: Box | null = null;
    /** Bumped when the document changes in place, so the overlay is redrawn. */
    @state() private revision = 0;

    @query('svg.view') private viewSvg!: SVGSVGElement;
    @query('g.doc') private docGroup!: SVGGElement;

    /** The plan's root element, without its children (they are live in `g.doc`). */
    private shell?: Element;
    /** The text the editor last read or wrote, so its own `svg` isn't read again. */
    private known = '';
    private history?: HistoryController<string>;
    private spaceDown = false;
    private gesture?: { kind: 'move' | 'pan' | 'box'; start: DOMPoint; last: { dx: number; dy: number }; moved: boolean; screen: { x: number; y: number }; additive: boolean; before: string[] };

    connectedCallback(): void {
        super.connectedCallback();
        if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
        this.addEventListener('keydown', this.onKeydown);
        this.addEventListener('keyup', this.onKeyup);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener('keydown', this.onKeydown);
        this.removeEventListener('keyup', this.onKeyup);
    }

    get selection(): string[] { return [...this.selected]; }
    get canUndo(): boolean { return !!this.history?.canUndo; }
    get canRedo(): boolean { return !!this.history?.canRedo; }

    protected updated(changed: Map<string, unknown>): void {
        if (changed.has('svg') && this.svg !== this.known) this.load(this.svg);
        if (changed.has('level')) this.applyLevelStyle();
    }

    // --- the document ----------------------------------------------------

    /** Reads `text` as the plan: a new document and a new history. */
    private load(text: string) {
        let root: Element;
        try { root = parsePlan(text); } catch { return; }
        ensureIds(root);
        this.shell = root.cloneNode(false) as Element;
        this.docGroup.replaceChildren(...Array.from(root.childNodes).map(n => document.importNode(n, true)));
        this.known = this.serialize();
        this.svg = this.known;
        this.selected = [];
        if (this.history) this.history.rebase(this.known);
        else this.history = new HistoryController<string>(this, this.known, { apply: v => this.restore(v) });
        this.applyLevelStyle();
        this.fit();
    }

    /** The document's text now (the root as read, with its live children). */
    private serialize(): string {
        if (!this.shell) return this.svg;
        const root = this.shell.cloneNode(false) as Element;
        for (const node of Array.from(this.docGroup.childNodes)) root.appendChild(root.ownerDocument.importNode(node, true));
        return serializePlan(root);
    }

    /** Undo/redo: adopt `text` without a new history, keeping the view. */
    private restore(text: string) {
        const root = parsePlan(text);
        this.docGroup.replaceChildren(...Array.from(root.childNodes).map(n => document.importNode(n, true)));
        this.known = text;
        this.svg = text;
        this.selected = this.selected.filter(id => this.item(id));
        this.revision++;
    }

    /** A change the user made: one history entry, and `plan-changed`. */
    private commit(reason: PlanChangeReason) {
        const text = this.serialize();
        this.known = text;
        this.svg = text;
        this.revision++;
        this.history?.record(text);
        this.dispatchEvent(new CustomEvent('plan-changed', { detail: { svg: text, reason }, bubbles: true, composed: true }));
    }

    private items(): Element[] {
        return this.docGroup ? planItems(this.docGroup) : [];
    }

    private item(id: string): Element | undefined {
        return this.items().find(e => e.id === id);
    }

    /** Items on the storey shown: the ones you can pick. */
    private pickable(): Element[] {
        return this.items().filter(e => levelOf(e) === this.level);
    }

    /** Storeys other than `level` faint and unpickable; a rule, so nothing is written to the document. */
    private applyLevelStyle() {
        const style = this.renderRoot.querySelector('style.levels');
        if (!style) return;
        const n = JSON.stringify(String(this.level));
        style.textContent = [
            `.doc > g[data-fixture="level"]:not([data-level=${n}])`,
            `.doc [data-level]:not([data-level=${n}]):not(g[data-fixture="level"])`,
            ...(this.level !== 0 ? [`.doc > :not(g[data-fixture="level"]):not([data-level]):not(defs):not(style)`] : []),
        ].join(',\n') + ' { opacity: .22; pointer-events: none; }';
    }

    // --- API --------------------------------------------------------------

    select(ids: string[]) {
        const next = ids.filter(id => this.item(id));
        if (next.length === this.selected.length && next.every((id, i) => id === this.selected[i])) return;
        this.selected = next;
        this.dispatchEvent(new CustomEvent('selection-changed', {
            detail: { ids: [...next], attributes: next.map(id => attributesOf(this.item(id)!)) }, bubbles: true, composed: true,
        }));
    }

    /** An item's attributes, or undefined when there's no such item. */
    itemAttributes(id: string): Record<string, string> | undefined {
        const el = this.item(id);
        return el ? attributesOf(el) : undefined;
    }

    /** Sets (or, with null, removes) attributes on items: one history entry. */
    setAttributes(ids: string[], attributes: Record<string, string | null>) {
        if (this.readonly) return;
        const targets = ids.map(id => this.item(id)).filter((e): e is Element => !!e);
        if (!targets.length) return;
        for (const el of targets) setAttributesOf(el, attributes);
        this.commit('attributes');
        // Its attributes changed, and the app may be showing them.
        this.dispatchEvent(new CustomEvent('selection-changed', {
            detail: { ids: [...this.selected], attributes: this.selected.map(id => attributesOf(this.item(id)!)) }, bubbles: true, composed: true,
        }));
    }

    deleteSelection() {
        if (this.readonly || !this.selected.length) return;
        for (const id of this.selected) this.item(id)?.remove();
        this.select([]);
        this.commit('delete');
    }

    undo() {
        if (!this.history?.canUndo) return;
        this.history.undo();
        this.dispatchEvent(new CustomEvent('plan-changed', { detail: { svg: this.svg, reason: 'undo' }, bubbles: true, composed: true }));
    }

    redo() {
        if (!this.history?.canRedo) return;
        this.history.redo();
        this.dispatchEvent(new CustomEvent('plan-changed', { detail: { svg: this.svg, reason: 'redo' }, bubbles: true, composed: true }));
    }

    /** The view fits the plan (its viewBox, or its items when they reach outside it), with a margin. */
    fit() {
        if (!this.shell) return;
        let box: Box = planBounds(this.shell);
        const content = this.items().map(e => this.boxOf(e)).filter((b): b is Box => !!b);
        if (content.length) box = union([box, ...content]);
        const margin = Math.max(box.width, box.height) * 0.04;
        this.view = { x: box.x - margin, y: box.y - margin, width: box.width + margin * 2, height: box.height + margin * 2 };
    }

    /** Zooms by `factor` (> 1 in) about a point in plan units (the view's centre by default). */
    zoom(factor: number, about?: { x: number; y: number }) {
        const v = this.view;
        const c = about ?? { x: v.x + v.width / 2, y: v.y + v.height / 2 };
        const width = v.width / factor, height = v.height / factor;
        this.view = { x: c.x - (c.x - v.x) / factor, y: c.y - (c.y - v.y) / factor, width, height };
    }

    // --- geometry ---------------------------------------------------------

    /** A point on screen in plan units. */
    private toPlan(clientX: number, clientY: number): DOMPoint {
        const ctm = this.docGroup.getScreenCTM();
        return ctm ? new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse()) : new DOMPoint(clientX, clientY);
    }

    /** An item's bounding box in plan units (its transforms applied). */
    private boxOf(el: Element): Box | null {
        const shape = el as SVGGraphicsElement;
        if (typeof shape.getBBox !== 'function') return null;
        let b: DOMRect;
        try { b = shape.getBBox(); } catch { return null; }
        const doc = this.docGroup.getScreenCTM(), own = shape.getScreenCTM?.();
        if (!doc || !own) return { x: b.x, y: b.y, width: b.width, height: b.height };
        const m = doc.inverse().multiply(own);
        const corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
            .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
        const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
        return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    }

    /** The item an event landed on: the top-level item it belongs to, on the storey shown. */
    private itemAt(target: EventTarget | null): Element | undefined {
        const pickable = new Set(this.pickable());
        for (let el = target as Element | null; el && el !== this.docGroup; el = el.parentElement) {
            if (pickable.has(el)) return el;
            if (isLevelGroup(el)) return undefined;
        }
        return undefined;
    }

    // --- pointer ----------------------------------------------------------

    private onPointerDown = (e: PointerEvent) => {
        this.focus();
        const start = this.toPlan(e.clientX, e.clientY);
        const base = { start, last: { dx: 0, dy: 0 }, moved: false, screen: { x: e.clientX, y: e.clientY }, additive: e.shiftKey, before: [...this.selected] };
        if (e.button === 1 || this.spaceDown) {
            this.gesture = { kind: 'pan', ...base };
        } else if (e.button === 0) {
            const hit = this.itemAt(e.target);
            if (hit) {
                if (e.shiftKey) this.select(this.selected.includes(hit.id) ? this.selected.filter(id => id !== hit.id) : [...this.selected, hit.id]);
                else if (!this.selected.includes(hit.id)) this.select([hit.id]);
                this.gesture = this.readonly || !this.selected.includes(hit.id) ? undefined : { kind: 'move', ...base };
            } else {
                if (!e.shiftKey) this.select([]);
                this.gesture = { kind: 'box', ...base };
            }
        } else return;
        if (this.gesture) (e.currentTarget as Element).setPointerCapture(e.pointerId);
        e.preventDefault();
    };

    private onPointerMove = (e: PointerEvent) => {
        const g = this.gesture;
        if (!g) return;
        if (!g.moved && Math.hypot(e.clientX - g.screen.x, e.clientY - g.screen.y) < 3) return;
        g.moved = true;
        if (g.kind === 'pan') {
            const now = this.toPlan(e.clientX, e.clientY);
            this.view = { ...this.view, x: this.view.x - (now.x - g.start.x), y: this.view.y - (now.y - g.start.y) };
            return;
        }
        const p = this.toPlan(e.clientX, e.clientY);
        if (g.kind === 'box') {
            this.marquee = { x: Math.min(g.start.x, p.x), y: Math.min(g.start.y, p.y), width: Math.abs(p.x - g.start.x), height: Math.abs(p.y - g.start.y) };
            return;
        }
        const step = this.snap && !e.altKey ? this.grid : 0;
        const dx = snapTo(p.x - g.start.x, step), dy = snapTo(p.y - g.start.y, step);
        if (dx === g.last.dx && dy === g.last.dy) return;
        for (const id of this.selected) { const el = this.item(id); if (el) translateItem(el, dx - g.last.dx, dy - g.last.dy); }
        g.last = { dx, dy };
        this.revision++;
        this.history?.preview(this.serialize());
    };

    private onPointerUp = (e: PointerEvent) => {
        const g = this.gesture;
        this.gesture = undefined;
        if (!g) return;
        (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
        if (g.kind === 'move' && (g.last.dx || g.last.dy)) this.commit('move');
        else if (g.kind === 'move') this.history?.discardPreview();
        if (g.kind === 'box') {
            const m = this.marquee;
            this.marquee = null;
            if (m && g.moved) {
                const inside = this.pickable().filter(el => { const b = this.boxOf(el); return b && intersects(b, m); }).map(el => el.id);
                this.select(g.additive ? [...new Set([...g.before, ...inside])] : inside);
            }
        }
    };

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const p = this.toPlan(e.clientX, e.clientY);
        this.zoom(Math.pow(1.0015, -e.deltaY), p);
    };

    // --- keyboard ---------------------------------------------------------

    private onKeydown = (e: KeyboardEvent) => {
        const mod = e.ctrlKey || e.metaKey;
        if (e.key === ' ' && !this.spaceDown) { this.spaceDown = true; this.toggleAttribute('panning', true); e.preventDefault(); return; }
        if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
        if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return; }
        if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); this.select(this.pickable().map(el => el.id)); return; }
        if (e.key === 'Escape') { this.select([]); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.deleteSelection(); return; }
        if (e.key === '+' || e.key === '=') { this.zoom(1.25); return; }
        if (e.key === '-') { this.zoom(0.8); return; }
        if (e.key === '0') { this.fit(); return; }
        const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (arrows[e.key] && this.selected.length && !this.readonly) {
            e.preventDefault();
            const step = (this.snap && this.grid > 0 ? this.grid : 1) * (e.shiftKey ? 10 : 1);
            for (const id of this.selected) { const el = this.item(id); if (el) translateItem(el, arrows[e.key][0] * step, arrows[e.key][1] * step); }
            this.commit('move');
        }
    };

    private onKeyup = (e: KeyboardEvent) => {
        if (e.key === ' ') { this.spaceDown = false; this.toggleAttribute('panning', false); }
    };

    // --- rendering --------------------------------------------------------

    render() {
        const v = this.view;
        void this.revision;
        return html`<style class="levels"></style>
            <svg class="view" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" preserveAspectRatio="xMidYMid meet"
                @pointerdown=${this.onPointerDown} @pointermove=${this.onPointerMove} @pointerup=${this.onPointerUp}
                @pointercancel=${this.onPointerUp} @wheel=${this.onWheel} role="img" aria-label="Plan">
                ${this.renderGrid()}
                <g class="doc"></g>
                <g class="overlay">${this.renderSelection()}</g>
            </svg>`;
    }

    private renderGrid() {
        const step = this.grid;
        if (!(step > 0)) return nothing;
        // The view box is fitted (meet), so the element shows more than it on one axis: the grid
        // covers the view box's own size again on every side.
        const v0 = this.view, side = Math.max(v0.width, v0.height);
        const v = { x: v0.x - side, y: v0.y - side, width: v0.width + side * 2, height: v0.height + side * 2 };
        // Too fine to see at this zoom: only the major lines.
        const minor = v0.width / step < 160;
        const lines = (every: number, cls: string) => {
            const out = [];
            for (let x = Math.ceil(v.x / every) * every; x <= v.x + v.width; x += every) out.push(svgTemplate`<line class=${cls} x1=${x} y1=${v.y} x2=${x} y2=${v.y + v.height} vector-effect="non-scaling-stroke"/>`);
            for (let y = Math.ceil(v.y / every) * every; y <= v.y + v.height; y += every) out.push(svgTemplate`<line class=${cls} x1=${v.x} y1=${y} x2=${v.x + v.width} y2=${y} vector-effect="non-scaling-stroke"/>`);
            return out;
        };
        return svgTemplate`<g class="grid" pointer-events="none">${minor ? lines(step, 'grid-minor') : nothing}${v0.width / (step * 10) < 160 ? lines(step * 10, 'grid-major') : nothing}</g>`;
    }

    private renderSelection() {
        if (!this.docGroup) return nothing;
        const boxes = this.selected.map(id => this.item(id)).filter((e): e is Element => !!e).map(e => this.boxOf(e)).filter((b): b is Box => !!b);
        return svgTemplate`${boxes.map(b => svgTemplate`<rect class="selected" x=${b.x} y=${b.y} width=${b.width} height=${b.height}/>`)}
            ${this.marquee ? svgTemplate`<rect class="marquee" x=${this.marquee.x} y=${this.marquee.y} width=${this.marquee.width} height=${this.marquee.height}/>` : nothing}`;
    }
}

function union(boxes: Box[]): Box {
    const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
    return { x, y, width: Math.max(...boxes.map(b => b.x + b.width)) - x, height: Math.max(...boxes.map(b => b.y + b.height)) - y };
}

const intersects = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

declare global {
    interface HTMLElementTagNameMap {
        'juel-plan-editor': JuelPlanEditor;
    }
}
