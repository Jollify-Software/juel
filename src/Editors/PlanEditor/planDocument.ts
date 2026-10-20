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

/** The plan's own area: its viewBox, else its width and height, else 1000 square. */
export function planBounds(root: Element): { x: number; y: number; width: number; height: number } {
    const box = (root.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    if (box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) return { x: box[0], y: box[1], width: box[2], height: box[3] };
    const width = parseFloat(root.getAttribute('width') ?? ''), height = parseFloat(root.getAttribute('height') ?? '');
    return width > 0 && height > 0 ? { x: 0, y: 0, width, height } : { x: 0, y: 0, width: 1000, height: 1000 };
}
