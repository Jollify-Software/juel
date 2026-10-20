// The document juel-plan-editor edits: an SVG plan (any SVG; annotated ones,
// like Parterre's, carry their meaning in data-* attributes the editor leaves
// alone). Plain functions over the SVG DOM, so they run in tests without a
// layout engine: what the items are, which storey each is on, moving them,
// ids, attributes. The component adds the view and the pointer work.

export const SvgNs = 'http://www.w3.org/2000/svg';

/** The shapes and groups a plan is made of (text, use and images too). */
const ItemTags = new Set(['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'g', 'text', 'use', 'image']);

/** A storey group: Parterre's `<g data-fixture="level" data-level="n">` (tracing paper). */
export const isLevelGroup = (el: Element) => el.localName === 'g' && el.getAttribute('data-fixture') === 'level';

/** The SVG text as a document; throws when it isn't an SVG. */
export function parsePlan(svg: string): SVGSVGElement {
    const doc = new DOMParser().parseFromString(svg || `<svg xmlns="${SvgNs}" viewBox="0 0 1000 1000"/>`, 'image/svg+xml');
    const root = doc.documentElement;
    if (root.localName !== 'svg' || doc.querySelector('parsererror')) throw new Error('Not an SVG plan');
    return root as unknown as SVGSVGElement;
}

/**
 * The items you select and move: the root's own shapes and groups, and those
 * inside storey groups (but not the storey groups themselves). A shape inside an
 * item group (a room's curved edge) belongs to that group.
 */
export function planItems(root: Element): Element[] {
    const items: Element[] = [];
    for (const child of Array.from(root.children)) {
        if (isLevelGroup(child)) {
            for (const inner of Array.from(child.children)) if (ItemTags.has(inner.localName)) items.push(inner);
        } else if (ItemTags.has(child.localName) && child.localName !== 'defs') items.push(child);
    }
    return items;
}

/** An item's storey: its own `data-level`, else its storey group's, else 0 (Parterre's rule). */
export function levelOf(el: Element): number {
    for (let node: Element | null = el; node; node = node.parentElement) {
        const level = node.getAttribute('data-level');
        if (level !== null && level.trim() !== '' && Number.isFinite(Number(level))) return Number(level);
    }
    return 0;
}

/** The storeys the plan has: its storey groups' and items' `data-level`s, and 0. */
export function planLevels(root: Element): number[] {
    const levels = new Set<number>([0]);
    for (const g of Array.from(root.children).filter(isLevelGroup)) levels.add(levelOf(g));
    for (const item of planItems(root)) levels.add(levelOf(item));
    return [...levels].sort((a, b) => a - b);
}

/** Every item gets an `id` (`p1`, `p2`…) if it has none, so selection and the app can name it. */
export function ensureIds(root: Element): void {
    const used = new Set(Array.from(root.querySelectorAll('[id]')).map(e => e.id));
    let n = 1;
    for (const item of planItems(root)) {
        if (item.id) continue;
        while (used.has(`p${n}`)) n++;
        item.setAttribute('id', `p${n}`);
        used.add(`p${n}`);
    }
}

/** The SVG text of a plan (with an XML declaration only if it had one). */
export function serializePlan(root: Element): string {
    return new XMLSerializer().serializeToString(root);
}

const num = (el: Element, name: string) => Number(el.getAttribute(name) ?? 0) || 0;
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** `points` moved by (dx, dy): `x,y x,y` or `x y x y`. */
export function translatePoints(points: string, dx: number, dy: number): string {
    const values = (points.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    const pairs: string[] = [];
    for (let i = 0; i + 1 < values.length; i += 2) pairs.push(`${fmt(values[i] + dx)},${fmt(values[i + 1] + dy)}`);
    return pairs.join(' ');
}

/**
 * Moves an item by (dx, dy) in its parent's units: a rect, circle, ellipse,
 * line, polygon, polyline, text or image without a transform gets new
 * coordinates; anything else (a path, a group, a transformed shape) gets a
 * `translate()` in front of its transform, which renders the same.
 */
export function translateItem(el: Element, dx: number, dy: number): void {
    if (!dx && !dy) return;
    const plain = !el.getAttribute('transform');
    const set = (name: string, v: number) => el.setAttribute(name, fmt(v));
    if (plain && ['rect', 'image', 'use'].includes(el.localName) && el.hasAttribute('x') === el.hasAttribute('y')) {
        set('x', num(el, 'x') + dx); set('y', num(el, 'y') + dy);
    } else if (plain && (el.localName === 'circle' || el.localName === 'ellipse')) {
        set('cx', num(el, 'cx') + dx); set('cy', num(el, 'cy') + dy);
    } else if (plain && el.localName === 'line') {
        set('x1', num(el, 'x1') + dx); set('y1', num(el, 'y1') + dy);
        set('x2', num(el, 'x2') + dx); set('y2', num(el, 'y2') + dy);
    } else if (plain && (el.localName === 'polygon' || el.localName === 'polyline')) {
        el.setAttribute('points', translatePoints(el.getAttribute('points') ?? '', dx, dy));
    } else if (plain && el.localName === 'text' && !/[\s,]/.test((el.getAttribute('x') ?? '') + (el.getAttribute('y') ?? ''))) {
        set('x', num(el, 'x') + dx); set('y', num(el, 'y') + dy);
    } else {
        const rest = el.getAttribute('transform');
        el.setAttribute('transform', `translate(${fmt(dx)} ${fmt(dy)})${rest ? ` ${rest}` : ''}`);
    }
}

/** Sets attributes on an element; null (or '') removes one. */
export function setAttributesOf(el: Element, attributes: Record<string, string | null>): void {
    for (const [name, value] of Object.entries(attributes)) {
        if (value === null || value === '') el.removeAttribute(name);
        else el.setAttribute(name, value);
    }
}

/** An element's attributes as a plain object. */
export function attributesOf(el: Element): Record<string, string> {
    return Object.fromEntries(Array.from(el.attributes).map(a => [a.name, a.value]));
}

/** `value` to the nearest multiple of `step` (unchanged when step is 0 or less). */
export const snapTo = (value: number, step: number) => step > 0 ? Math.round(value / step) * step : value;

export interface Point { x: number; y: number }

/** `x,y x,y` (or `x y x y`) as points. */
export function parsePoints(points: string): Point[] {
    const values = (points.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    const out: Point[] = [];
    for (let i = 0; i + 1 < values.length; i += 2) out.push({ x: values[i], y: values[i + 1] });
    return out;
}

/** Points as a `points` attribute: `x,y x,y`. */
export const formatPoints = (points: Point[]) => points.map(p => `${fmt(p.x)},${fmt(p.y)}`).join(' ');

/**
 * `to`, its angle from `from` snapped to 45° steps (horizontal, vertical,
 * diagonal), keeping its distance along that direction: Shift while drawing.
 */
export function snapAngle(from: Point, to: Point): Point {
    const dx = to.x - from.x, dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (!length) return { ...to };
    const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    // Project onto the snapped direction, so a near-horizontal line keeps its length along x.
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    return { x: from.x + Math.round(along * Math.cos(angle) * 1000) / 1000, y: from.y + Math.round(along * Math.sin(angle) * 1000) / 1000 };
}

/** The corners and vertices an item offers to snap to, in its own (parent's) units; [] for transformed ones and paths. */
export function cornersOf(el: Element): Point[] {
    if (el.getAttribute('transform')) return [];
    const n = (name: string) => Number(el.getAttribute(name) ?? 0) || 0;
    switch (el.localName) {
        case 'rect': { const x = n('x'), y = n('y'), w = n('width'), h = n('height'); return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]; }
        case 'line': return [{ x: n('x1'), y: n('y1') }, { x: n('x2'), y: n('y2') }];
        case 'polygon': case 'polyline': return parsePoints(el.getAttribute('points') ?? '');
        case 'circle': case 'ellipse': return [{ x: n('cx'), y: n('cy') }];
        default: return [];
    }
}

/** The nearest of `candidates` to `p` within `tolerance`, or undefined. */
export function nearestPoint(candidates: Point[], p: Point, tolerance: number): Point | undefined {
    let best: Point | undefined, bestD = tolerance;
    for (const c of candidates) {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d <= bestD) { best = c; bestD = d; }
    }
    return best;
}

/** Where on a polyline/polygon's edges `p` lands within `tolerance`: the edge's index (the point goes after it) and the point on it. */
export function nearestEdge(points: Point[], closed: boolean, p: Point, tolerance: number): { index: number; at: Point } | undefined {
    let best: { index: number; at: Point } | undefined, bestD = tolerance;
    const count = closed ? points.length : points.length - 1;
    for (let i = 0; i < count; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        const lx = b.x - a.x, ly = b.y - a.y, len2 = lx * lx + ly * ly;
        if (!len2) continue;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * lx + (p.y - a.y) * ly) / len2));
        const at = { x: a.x + t * lx, y: a.y + t * ly };
        const d = Math.hypot(at.x - p.x, at.y - p.y);
        if (d <= bestD) { best = { index: i, at }; bestD = d; }
    }
    return best;
}

/** A rect's attributes from two corners (any order), at least `min` each way. */
export function rectFrom(a: Point, b: Point, min = 0): { x: number; y: number; width: number; height: number } {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x, y, width: Math.max(min, Math.abs(b.x - a.x)), height: Math.max(min, Math.abs(b.y - a.y)) };
}

/**
 * The group new shapes on storey `level` go in: its storey group, made if there's
 * none (level 0 without groups: the root, unless `group` asks for a group anyway,
 * to give the storey a name or height).
 */
export function containerFor(root: Element, level: number, group = false): Element {
    const groups = Array.from(root.children).filter(isLevelGroup);
    const found = groups.find(g => levelOf(g) === level);
    if (found) return found;
    if (level === 0 && !groups.length && !group) return root;
    const g = root.ownerDocument.createElementNS(SvgNs, 'g');
    g.setAttribute('data-fixture', 'level');
    g.setAttribute('data-level', String(level));
    // In storey order among the others.
    const after = groups.filter(o => levelOf(o) < level).pop();
    if (after) after.after(g);
    else if (groups.length) groups[0].before(g);
    else root.appendChild(g);
    return g;
}

/** The plan's own area: its viewBox, else its width and height, else 1000 square. */
export function planBounds(root: Element): { x: number; y: number; width: number; height: number } {
    const box = (root.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    if (box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) return { x: box[0], y: box[1], width: box[2], height: box[3] };
    const width = parseFloat(root.getAttribute('width') ?? ''), height = parseFloat(root.getAttribute('height') ?? '');
    return width > 0 && height > 0 ? { x: 0, y: 0, width, height } : { x: 0, y: 0, width: 1000, height: 1000 };
}
