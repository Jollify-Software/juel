import { LitElement, css, html, svg as svgTemplate, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators';
import { unsafeSVG } from 'lit/directives/unsafe-svg';
import { HistoryController } from '../../_Base/HistoryController';
import {
    attributesOf, containerFor, cornersOf, ensureIds, formatPoints, isLevelGroup, levelOf, nearestEdge, nearestPoint,
    parsePlan, parsePoints, planBounds, planItems, rectFrom, serializePlan, setAttributesOf, snapAngle, snapTo,
    SvgNs, translateItem, type Point,
} from './planDocument';

/** A rectangle in plan units. */
interface Box { x: number; y: number; width: number; height: number }

/** What a click or drag does: pick and move, or draw a shape of that kind. */
export type PlanTool = 'select' | 'rect' | 'polygon' | 'polyline' | 'circle' | 'point';

/** Why the plan changed (`plan-changed`'s `reason`). */
export type PlanChangeReason = 'move' | 'delete' | 'attributes' | 'draw' | 'reshape' | 'undo' | 'redo';

/** How close (screen px) a point must be to a corner to snap to it, or to a handle or edge to pick it. */
const SnapPx = 8;
const HandlePx = 9;

/**
 * `<juel-plan-editor>`: edits an SVG plan, a floor plan most often (the Jollify
 * app's virtual layouts; Parterre's annotated SVG). Any SVG works: the editor
 * draws, moves and reshapes shapes and sets attributes; what a `data-*`
 * attribute *means* is the app's business.
 *
 * - **Document:** `svg`, the plan's text (in and out). Its items are the root's
 *   shapes and groups and those in storey groups (`<g data-fixture="level"
 *   data-level="n">`); each gets an `id` if it has none.
 * - **View:** a grid (`grid`, in plan units; every tenth line darker), zoom (wheel,
 *   `+`/`-`, `fit()` or `0`) and pan (drag with the middle button or with Space held).
 * - **Storeys:** `level` shows one storey; the others are faint and can't be picked
 *   (tracing paper). An item's storey is its own `data-level`, its group's, or 0.
 *   New shapes go in the storey's group (made when there's none).
 * - **Tools** (`tool`): `select`; `rect` and `circle` (drag a corner to the opposite
 *   one, or the centre out; a click makes one two grid steps across); `polygon`
 *   (click the corners; click the first again, double-click or Enter to close) and
 *   `polyline` (double-click or Enter to finish), Backspace taking the last point
 *   back and Escape dropping the shape; `point` (a small circle, for a model or a
 *   label). New shapes get `newAttributes` (the app's `data-fixture`, fill…; `{id}` in a
 *   value is the new shape's id), are
 *   selected, and fire `shape-created` `{ id, kind }`.
 * - **Snapping:** to other shapes' corners nearby, else to the grid unless `snap`
 *   is off; Alt turns both off, and Shift keeps a line to 45° steps.
 * - **Selection** (the `select` tool): click (Shift adds or removes), a box on empty
 *   space, Ctrl+A, Escape. Drag the selection to move it; the arrow keys nudge it (Shift:
 *   ten steps); Delete removes it. One selected shape shows handles: a rect's corners
 *   resize it, a polygon's, polyline's or line's points move (double-click an edge to add
 *   one, Alt+click a point to remove it), a circle's handle sets its radius.
 * - **History:** `undo()` / `redo()` (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z), its own, like
 *   `juel-markdown-editor`'s; `canUndo` / `canRedo`; `history-changed` bubbles.
 * - **API:** `selection` (ids), `select(ids)`, `setAttributes(ids, { name: value | null })`,
 *   `setLevelAttributes(level, { … })` (a storey's name, height), `deleteSelection()`, `fit()`,
 *   `zoom(factor)`, `itemAttributes(id)`.
 * - **Marks:** `marks`, SVG markup in plan units drawn over the plan (an app's arrows, labels):
 *   not part of `svg`, not pickable, not in the history.
 * - **Events:** `plan-changed` `{ svg, reason }` after each change you make;
 *   `selection-changed` `{ ids, attributes }`; `shape-created` `{ id, kind }`.
 *   Setting `svg` from outside fires none of them, and starts a new history.
 */
@customElement('juel-plan-editor')
export class JuelPlanEditor extends LitElement {
    static styles = css`
        :host { display: block; position: relative; overflow: hidden; height: 400px; outline: none;
            background: var(--plan-background, var(--juel-surface, #fff)); touch-action: none; }
        :host(:focus-visible) { box-shadow: inset 0 0 0 2px var(--juel-accent, #3b6fd8); }
        svg.view { width: 100%; height: 100%; display: block; user-select: none; cursor: default; }
        :host([drawing]) svg.view, :host([drawing]) .doc * { cursor: crosshair; }
        :host([panning]) svg.view { cursor: grab; }
        .grid-minor { stroke: var(--plan-grid, rgba(0, 0, 0, .08)); }
        .grid-major { stroke: var(--plan-grid-major, rgba(0, 0, 0, .18)); }
        .doc * { cursor: pointer; }
        .overlay { pointer-events: none; }
        .selected { fill: none; stroke: var(--juel-accent, #3b6fd8); stroke-width: 1.5; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
        .marquee, .draft { fill: color-mix(in srgb, var(--juel-accent, #3b6fd8) 12%, transparent); stroke: var(--juel-accent, #3b6fd8);
            stroke-width: 1.5; vector-effect: non-scaling-stroke; }
        .draft.open { fill: none; }
        .handle { fill: #fff; stroke: var(--juel-accent, #3b6fd8); stroke-width: 1.5; vector-effect: non-scaling-stroke; pointer-events: all; cursor: move; }
        .snap-mark { fill: none; stroke: var(--juel-accent, #3b6fd8); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
    `;

    /** The plan's SVG text. */
    @property({ type: String }) svg = '';
    /** The storey shown (the others faint); new shapes go on it. */
    @property({ type: Number }) level = 0;
    /** Grid step in plan units (0 for none). */
    @property({ type: Number }) grid = 50;
    /** Snap to the grid (corners snap either way). */
    @property({ type: Boolean }) snap = true;
    /** Look, select and zoom, but no changes. */
    @property({ type: Boolean, reflect: true }) readonly = false;
    /** What a click or drag on the plan does. */
    @property({ type: String }) tool: PlanTool = 'select';
    /** Attributes every new shape gets (the app's `data-fixture`, `fill`, `stroke`…); `{id}` in a value is the shape's id. */
    @property({ attribute: false }) newAttributes: Record<string, string> = {};
    /**
     * SVG markup in plan units, drawn over the plan and under the selection: an app's own
     * marks (which way stairs climb, say). Not part of `svg`, not pickable, no history.
     */
    @property({ attribute: false }) marks = '';

    @state() private view: Box = { x: 0, y: 0, width: 1000, height: 1000 };
    @state() private selected: string[] = [];
    @state() private marquee: Box | null = null;
    /** A shape being drawn: its points so far, and where the pointer is. */
    @state() private draft: { points: Point[]; cursor?: Point } | null = null;
    /** The corner the pointer snapped to, shown as a ring. */
    @state() private snapMark: Point | null = null;
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
    private gesture?: {
        kind: 'move' | 'pan' | 'box' | 'draw' | 'handle';
        start: Point; last: { dx: number; dy: number }; moved: boolean; screen: { x: number; y: number };
        additive: boolean; before: string[]; handle?: number;
    };

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
        if (changed.has('level')) { this.applyLevelStyle(); this.draft = null; }
        if (changed.has('tool')) {
            this.toggleAttribute('drawing', this.tool !== 'select');
            this.draft = null;
            this.snapMark = null;
        }
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
        this.draft = null;
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

    /** Items on the storey shown: the ones you can pick, and snap to. */
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
        this.fireSelection();
    }

    private fireSelection() {
        this.dispatchEvent(new CustomEvent('selection-changed', {
            detail: { ids: [...this.selected], attributes: this.selected.map(id => attributesOf(this.item(id)!)) }, bubbles: true, composed: true,
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
        // Their attributes changed, and the app may be showing them.
        this.fireSelection();
    }

    /**
     * Sets (or, with null, removes) attributes on storey `level`'s group (made when
     * there's none): its `data-label`, `data-height`… One history entry.
     */
    setLevelAttributes(level: number, attributes: Record<string, string | null>) {
        if (this.readonly) return;
        const group = containerFor(this.docGroup, level, true);
        setAttributesOf(group, attributes);
        this.applyLevelStyle();
        this.commit('attributes');
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
    zoom(factor: number, about?: Point) {
        const v = this.view;
        const c = about ?? { x: v.x + v.width / 2, y: v.y + v.height / 2 };
        this.view = { x: c.x - (c.x - v.x) / factor, y: c.y - (c.y - v.y) / factor, width: v.width / factor, height: v.height / factor };
    }

    // --- geometry ---------------------------------------------------------

    /** A point on screen in plan units. */
    private toPlan(clientX: number, clientY: number): Point {
        const ctm = this.docGroup.getScreenCTM();
        const p = ctm ? new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse()) : new DOMPoint(clientX, clientY);
        return { x: p.x, y: p.y };
    }

    /** Plan units per screen pixel at this zoom. */
    private perPixel(): number {
        const ctm = this.docGroup?.getScreenCTM();
        return ctm && ctm.a ? 1 / ctm.a : 1;
    }

    /** An item's bounding box in plan units (its transforms applied). */
    private boxOf(el: Element): Box | null {
        const shape = el as SVGGraphicsElement;
        if (typeof shape.getBBox !== 'function') return null;
        let b: DOMRect;
        try { b = shape.getBBox(); } catch { return null; }
        const m = this.toDocMatrix(el);
        if (!m) return { x: b.x, y: b.y, width: b.width, height: b.height };
        const corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
            .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
        const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
        return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    }

    /** From an element's own units to plan units (its and its groups' transforms). */
    private toDocMatrix(el: Element): DOMMatrix | null {
        const doc = this.docGroup.getScreenCTM(), own = (el as SVGGraphicsElement).getScreenCTM?.();
        return doc && own ? doc.inverse().multiply(own) : null;
    }

    /** The corners of the items on the storey shown, in plan units: what a point snaps to. */
    private snapCorners(exclude?: Element): Point[] {
        const out: Point[] = [];
        for (const el of this.pickable()) {
            if (el === exclude) continue;
            const m = this.toDocMatrix(el.parentElement ?? el);
            for (const c of cornersOf(el)) {
                const p = m ? new DOMPoint(c.x, c.y).matrixTransform(m) : c;
                out.push({ x: p.x, y: p.y });
            }
        }
        return out;
    }

    /**
     * Where a point the pointer is at lands: Shift keeps it at 45° steps from `from`;
     * otherwise a corner nearby, else the grid (when `snap`); Alt, neither.
     */
    private snapPoint(raw: Point, e: { altKey: boolean; shiftKey: boolean }, from?: Point, exclude?: Element): Point {
        this.snapMark = null;
        if (e.altKey) return raw;
        if (e.shiftKey && from) return snapAngle(from, raw);
        const extra = this.draft?.points ?? [];
        const corner = nearestPoint([...this.snapCorners(exclude), ...extra], raw, SnapPx * this.perPixel());
        if (corner) { this.snapMark = corner; return { ...corner }; }
        const step = this.snap ? this.grid : 0;
        return { x: snapTo(raw.x, step), y: snapTo(raw.y, step) };
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

    // --- drawing ----------------------------------------------------------

    /** Adds a shape on the storey shown, with `newAttributes`: selected, recorded, announced. */
    private create(tag: string, geometry: Record<string, string | number>): Element {
        const el = document.createElementNS(SvgNs, tag);
        for (const [name, value] of Object.entries({ ...this.newAttributes, ...geometry })) el.setAttribute(name, String(value));
        // Its storey: the storey group's, or its own data-level when the group is the root (level 0 with no groups).
        const container = containerFor(this.docGroup, this.level);
        if (container === this.docGroup && this.level !== 0) el.setAttribute('data-level', String(this.level));
        container.appendChild(el);
        ensureIds(this.docGroup);
        // `{id}` in a new attribute's value is the shape's own id (an app's data-id="{id}").
        for (const [name, value] of Object.entries(this.newAttributes))
            if (value.includes('{id}')) el.setAttribute(name, value.split('{id}').join(el.id));
        this.selected = [el.id];
        this.applyLevelStyle();
        this.commit('draw');
        this.fireSelection();
        this.dispatchEvent(new CustomEvent('shape-created', { detail: { id: el.id, kind: this.tool }, bubbles: true, composed: true }));
        return el;
    }

    /** The polygon or polyline being drawn is done (a polygon needs three corners, a polyline two). */
    private finishDraft() {
        const d = this.draft;
        this.draft = null;
        this.snapMark = null;
        if (!d) return;
        const closed = this.tool === 'polygon';
        // A double-click adds its last point twice: one copy is enough.
        const points = d.points.filter((p, i) => i === 0 || p.x !== d.points[i - 1].x || p.y !== d.points[i - 1].y);
        if (points.length < (closed ? 3 : 2)) return;
        this.create(closed ? 'polygon' : 'polyline', { points: formatPoints(points) });
    }

    // --- handles ----------------------------------------------------------

    /** The selected shape's handles, in plan units: corners, points, a radius. */
    private handles(): Point[] {
        if (this.selected.length !== 1 || this.readonly) return [];
        const el = this.item(this.selected[0]);
        if (!el || el.getAttribute('transform') || (el.parentElement && (el.parentElement as Element) !== this.docGroup && !isLevelGroup(el.parentElement))) return [];
        const m = this.toDocMatrix(el.parentElement!);
        const toPlan = (p: Point) => { const q = m ? new DOMPoint(p.x, p.y).matrixTransform(m) : p; return { x: q.x, y: q.y }; };
        if (el.localName === 'circle') {
            const n = (a: string) => Number(el.getAttribute(a) ?? 0) || 0;
            return [toPlan({ x: n('cx') + n('r'), y: n('cy') })];
        }
        return ['rect', 'polygon', 'polyline', 'line'].includes(el.localName) ? cornersOf(el).map(toPlan) : [];
    }

    /** A handle dragged to `p` (plan units): the shape follows. */
    private moveHandle(el: Element, index: number, p: Point) {
        const m = this.toDocMatrix(el.parentElement!)?.inverse();
        const local = m ? new DOMPoint(p.x, p.y).matrixTransform(m) : p;
        const q = { x: local.x, y: local.y };
        const n = (a: string) => Number(el.getAttribute(a) ?? 0) || 0;
        if (el.localName === 'rect') {
            const corners = cornersOf(el);
            const r = rectFrom(corners[(index + 2) % 4], q, 0);
            setAttributesOf(el, { x: fmt(r.x), y: fmt(r.y), width: fmt(r.width), height: fmt(r.height) });
        } else if (el.localName === 'circle') {
            el.setAttribute('r', fmt(Math.max(0.5, Math.hypot(q.x - n('cx'), q.y - n('cy')))));
        } else if (el.localName === 'line') {
            setAttributesOf(el, index === 0 ? { x1: fmt(q.x), y1: fmt(q.y) } : { x2: fmt(q.x), y2: fmt(q.y) });
        } else {
            const points = parsePoints(el.getAttribute('points') ?? '');
            points[index] = q;
            el.setAttribute('points', formatPoints(points));
        }
    }

    /** The handle under a point (plan units), or -1. */
    private handleAt(p: Point): number {
        const tolerance = HandlePx * this.perPixel();
        return this.handles().findIndex(h => Math.hypot(h.x - p.x, h.y - p.y) <= tolerance);
    }

    // --- pointer ----------------------------------------------------------

    private onPointerDown = (e: PointerEvent) => {
        // Not scrolled into view: the pointer's position was measured where the page is now.
        this.focus({ preventScroll: true });
        const raw = this.toPlan(e.clientX, e.clientY);
        const base = { start: raw, last: { dx: 0, dy: 0 }, moved: false, screen: { x: e.clientX, y: e.clientY }, additive: e.shiftKey, before: [...this.selected] };
        if (e.button === 1 || this.spaceDown) {
            this.gesture = { kind: 'pan', ...base };
        } else if (e.button !== 0) {
            return;
        } else if (this.tool !== 'select') {
            if (this.readonly) return;
            this.pointerDraw(e, raw, base);
        } else {
            const handle = this.handleAt(raw);
            const el = this.selected.length === 1 ? this.item(this.selected[0]) : undefined;
            if (handle >= 0 && el) {
                // Alt+click on a polygon's or polyline's point removes it (keeping three, or two).
                if (e.altKey && (el.localName === 'polygon' || el.localName === 'polyline')) {
                    const points = parsePoints(el.getAttribute('points') ?? '');
                    if (points.length > (el.localName === 'polygon' ? 3 : 2)) {
                        points.splice(handle, 1);
                        el.setAttribute('points', formatPoints(points));
                        this.commit('reshape');
                    }
                    return;
                }
                this.gesture = { kind: 'handle', ...base, handle };
            } else {
                const hit = this.itemAt(e.target);
                if (hit) {
                    if (e.shiftKey) this.select(this.selected.includes(hit.id) ? this.selected.filter(id => id !== hit.id) : [...this.selected, hit.id]);
                    else if (!this.selected.includes(hit.id)) this.select([hit.id]);
                    this.gesture = this.readonly || !this.selected.includes(hit.id) ? undefined : { kind: 'move', ...base };
                } else {
                    if (!e.shiftKey) this.select([]);
                    this.gesture = { kind: 'box', ...base };
                }
            }
        }
        if (this.gesture) (e.currentTarget as Element).setPointerCapture(e.pointerId);
        e.preventDefault();
    };

    /** A press with a drawing tool: a rect or circle starts, a polygon or polyline gets a point, a point is made. */
    private pointerDraw(e: PointerEvent, raw: Point, base: Omit<NonNullable<JuelPlanEditor['gesture']>, 'kind'>) {
        if (this.tool === 'polygon' || this.tool === 'polyline') {
            const points = this.draft?.points ?? [];
            const p = this.snapPoint(raw, e, points[points.length - 1]);
            // Clicking the first corner again closes a polygon.
            const first = points[0];
            if (this.tool === 'polygon' && first && points.length >= 3 && Math.hypot(p.x - first.x, p.y - first.y) <= SnapPx * this.perPixel()) {
                this.finishDraft();
                return;
            }
            this.draft = { points: [...points, p], cursor: p };
            if (e.detail >= 2) this.finishDraft();
            return;
        }
        const p = this.snapPoint(raw, e);
        if (this.tool === 'point') {
            this.create('circle', { cx: fmt(p.x), cy: fmt(p.y), r: fmt(Math.max(this.grid / 4, 2)) });
            return;
        }
        this.draft = { points: [p], cursor: p };
        this.gesture = { kind: 'draw', ...base, start: p };
    }

    private onPointerMove = (e: PointerEvent) => {
        const g = this.gesture;
        const raw = this.toPlan(e.clientX, e.clientY);
        if (!g) {
            // Drawing a polygon or polyline: the next edge follows the pointer.
            if (this.draft && (this.tool === 'polygon' || this.tool === 'polyline')) {
                const pts = this.draft.points;
                this.draft = { ...this.draft, cursor: this.snapPoint(raw, e, pts[pts.length - 1]) };
            } else if (this.tool !== 'select') {
                this.snapPoint(raw, e);
            }
            return;
        }
        if (!g.moved && Math.hypot(e.clientX - g.screen.x, e.clientY - g.screen.y) < 3) return;
        g.moved = true;
        if (g.kind === 'pan') {
            this.view = { ...this.view, x: this.view.x - (raw.x - g.start.x), y: this.view.y - (raw.y - g.start.y) };
            return;
        }
        if (g.kind === 'box') {
            this.marquee = { x: Math.min(g.start.x, raw.x), y: Math.min(g.start.y, raw.y), width: Math.abs(raw.x - g.start.x), height: Math.abs(raw.y - g.start.y) };
            return;
        }
        if (g.kind === 'draw') {
            this.draft = { points: [g.start], cursor: this.snapPoint(raw, e, g.start) };
            return;
        }
        if (g.kind === 'handle') {
            const el = this.item(this.selected[0]);
            if (!el) return;
            const p = this.snapPoint(raw, e, undefined, el);
            this.moveHandle(el, g.handle!, p);
            this.revision++;
            this.history?.preview(this.serialize());
            return;
        }
        const step = this.snap && !e.altKey ? this.grid : 0;
        const dx = snapTo(raw.x - g.start.x, step), dy = snapTo(raw.y - g.start.y, step);
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
        if (g.kind === 'handle') { if (g.moved) this.commit('reshape'); else this.history?.discardPreview(); }
        if (g.kind === 'draw') this.finishDrag(g.start, g.moved ? this.draft?.cursor ?? g.start : undefined);
        if (g.kind === 'box') {
            const m = this.marquee;
            this.marquee = null;
            if (m && g.moved) {
                const inside = this.pickable().filter(el => { const b = this.boxOf(el); return b && intersects(b, m); }).map(el => el.id);
                this.select(g.additive ? [...new Set([...g.before, ...inside])] : inside);
            }
        }
    };

    /** A rect or circle drag ended (`end` undefined: a click, which makes one two grid steps across). */
    private finishDrag(start: Point, end?: Point) {
        this.draft = null;
        this.snapMark = null;
        const size = Math.max(this.grid, 1) * 2;
        if (this.tool === 'rect') {
            const r = end && end.x !== start.x && end.y !== start.y ? rectFrom(start, end) : { x: start.x, y: start.y, width: size, height: size };
            this.create('rect', { x: fmt(r.x), y: fmt(r.y), width: fmt(r.width), height: fmt(r.height) });
        } else if (this.tool === 'circle') {
            const r = end ? Math.hypot(end.x - start.x, end.y - start.y) : 0;
            this.create('circle', { cx: fmt(start.x), cy: fmt(start.y), r: fmt(r || size / 2) });
        }
    }

    /** A double-click on an edge of the selected polygon or polyline adds a point there. */
    private onDoubleClick = (e: MouseEvent) => {
        if (this.tool !== 'select' || this.readonly || this.selected.length !== 1) return;
        const el = this.item(this.selected[0]);
        if (!el || el.getAttribute('transform') || (el.localName !== 'polygon' && el.localName !== 'polyline')) return;
        const m = this.toDocMatrix(el.parentElement!)?.inverse();
        const raw = this.toPlan(e.clientX, e.clientY);
        const local = m ? new DOMPoint(raw.x, raw.y).matrixTransform(m) : raw;
        const points = parsePoints(el.getAttribute('points') ?? '');
        const edge = nearestEdge(points, el.localName === 'polygon', { x: local.x, y: local.y }, SnapPx * this.perPixel());
        if (!edge) return;
        const step = this.snap && !e.altKey ? this.grid : 0;
        points.splice(edge.index + 1, 0, { x: snapTo(edge.at.x, step), y: snapTo(edge.at.y, step) });
        el.setAttribute('points', formatPoints(points));
        this.commit('reshape');
    };

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();
        this.zoom(Math.pow(1.0015, -e.deltaY), this.toPlan(e.clientX, e.clientY));
    };

    // --- keyboard ---------------------------------------------------------

    private onKeydown = (e: KeyboardEvent) => {
        const mod = e.ctrlKey || e.metaKey;
        if (e.key === ' ' && !this.spaceDown) { this.spaceDown = true; this.toggleAttribute('panning', true); e.preventDefault(); return; }
        if (this.draft) {
            if (e.key === 'Enter') { e.preventDefault(); this.finishDraft(); return; }
            if (e.key === 'Escape') { this.draft = null; this.snapMark = null; return; }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                const points = this.draft.points.slice(0, -1);
                this.draft = points.length ? { ...this.draft, points } : null;
                return;
            }
        }
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
                @pointercancel=${this.onPointerUp} @dblclick=${this.onDoubleClick} @wheel=${this.onWheel} role="img" aria-label="Plan">
                ${this.renderGrid()}
                <g class="doc"></g>
                <g class="overlay"><g class="marks">${this.marks ? unsafeSVG(this.marks) : nothing}</g>${this.renderSelection()}${this.renderDraft()}${this.renderHandles()}</g>
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

    private renderDraft() {
        const d = this.draft;
        const mark = this.snapMark ? svgTemplate`<circle class="snap-mark" cx=${this.snapMark.x} cy=${this.snapMark.y} r=${6 * this.perPixel()}/>` : nothing;
        if (!d) return mark;
        const cursor = d.cursor ?? d.points[d.points.length - 1];
        if (this.tool === 'rect') {
            const r = rectFrom(d.points[0], cursor);
            return svgTemplate`<rect class="draft" x=${r.x} y=${r.y} width=${r.width} height=${r.height}/>${mark}`;
        }
        if (this.tool === 'circle') {
            return svgTemplate`<circle class="draft" cx=${d.points[0].x} cy=${d.points[0].y} r=${Math.hypot(cursor.x - d.points[0].x, cursor.y - d.points[0].y)}/>${mark}`;
        }
        const points = formatPoints([...d.points, cursor]);
        return this.tool === 'polygon' && d.points.length >= 2
            ? svgTemplate`<polygon class="draft" points=${points}/>${mark}`
            : svgTemplate`<polyline class="draft open" points=${points}/>${mark}`;
    }

    private renderHandles() {
        if (!this.docGroup || this.tool !== 'select') return nothing;
        const size = HandlePx * this.perPixel();
        return svgTemplate`${this.handles().map((h, i) => svgTemplate`<rect class="handle" data-handle=${i} x=${h.x - size / 2} y=${h.y - size / 2} width=${size} height=${size}/>`)}`;
    }
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

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
