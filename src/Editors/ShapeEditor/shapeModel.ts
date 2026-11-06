// The model behind <juel-shape-editor>: a drawing is a list of separate marks, back to front, and
// nothing here touches the page, so all of it runs in plain tests. Three kinds of mark:
//
//   box    — a rectangle (optionally rounded) or an ellipse: x, y, w, h.
//   path   — everything else: pencil strokes, lines, arrows, triangles, polygons, stars, curves. A list of
//            points, each with optional bend handles, open or closed.
//   locked — part of an opened SVG that can't be edited as a shape (text, a picture, a filter): its markup is
//            kept word for word and it moves, resizes and rotates as a whole.
//
// A mark's rotation is about the middle of its own box, so moving, resizing and flipping work on
// unrotated geometry and the rotation goes on top. The file written (`shapeToSvg`) is a normal SVG with the
// `viewBox` trimmed to what was drawn; `shapeSvg.ts` reads one back.

export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
/** A point of a path; `in` and `out` are its bend handles, in drawing coordinates. */
export interface PathNode extends Pt { in?: Pt; out?: Pt }

export type Dash = 'solid' | 'dashed' | 'dotted';
export interface MarkStyle {
    /** The inside's colour; null for none. */
    fill: string | null;
    /** The line's colour; null for none. */
    stroke: string | null;
    width: number;
    dash: Dash;
    /** 0 to 1. */
    opacity: number;
}

interface MarkBase extends MarkStyle {
    id: string;
    /** Degrees, clockwise, about the middle of the mark's own box. */
    rotation?: number;
    /** From an opened file with square-cornered lines: written back that way, not rounded. */
    sharp?: boolean;
    /** Marks with the same group id select and move together, and sit next to each other in the list. */
    group?: string;
}
export interface BoxMark extends MarkBase, Box { kind: 'rect' | 'ellipse'; radius?: number }
export interface PathMark extends MarkBase {
    kind: 'path';
    nodes: PathNode[];
    closed: boolean;
    arrow?: boolean;
    /** More outlines of the same shape, after a Join or a Cut out: a hole, or a part standing apart. Always closed. */
    more?: PathNode[][];
}
export interface LockedMark extends MarkBase, Box {
    kind: 'locked';
    /** The original markup, word for word. */
    markup: string;
    /** The box the markup draws in its own coordinates. */
    natural: Box;
    flipX?: boolean;
    flipY?: boolean;
}
export type Mark = BoxMark | PathMark | LockedMark;
export interface ShapeDoc {
    marks: Mark[];
    /** An opened file's gradients, styles and so on, word for word, for the locked marks that use them. */
    defs?: string;
}

export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export const Handles: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export const DefaultStyle: MarkStyle = { fill: '#4c8bf5', stroke: '#1f2937', width: 2, dash: 'solid', opacity: 1 };

export const cloneDoc = (doc: ShapeDoc): ShapeDoc => JSON.parse(JSON.stringify(doc));
export const cloneMark = <T extends Mark>(m: T): T => JSON.parse(JSON.stringify(m));
export const emptyDoc = (): ShapeDoc => ({ marks: [] });

/** An id no mark in `used` has (`m1`, `m2`, …). */
export function freshId(used: Iterable<string>, prefix = 'm'): string {
    const taken = new Set(used);
    let i = taken.size + 1;
    while (taken.has(`${prefix}${i}`)) i++;
    return `${prefix}${i}`;
}

// ---- small geometry -----------------------------------------------------------------------

export const distance = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const boxCentre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export function rotatePoint(p: Pt, about: Pt, degrees: number): Pt {
    if (!degrees) return { x: p.x, y: p.y };
    const r = degrees * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const dx = p.x - about.x, dy = p.y - about.y;
    return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
}

export function boxOfPoints(points: Pt[]): Box {
    if (!points.length) return { x: 0, y: 0, w: 0, h: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function unionBoxes(boxes: Box[]): Box {
    return boxOfPoints(boxes.flatMap(b => [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y + b.h }]));
}

export const boxesTouch = (a: Box, b: Box) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;

/** The end of a line from `from`, turned to the nearest 45° (Shift on Line and Arrow). */
export function lockAngle(from: Pt, to: Pt, step = 45): Pt {
    const length = distance(from, to);
    const angle = Math.round(Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI / step) * step * Math.PI / 180;
    return { x: from.x + Math.cos(angle) * length, y: from.y + Math.sin(angle) * length };
}

/** The box a drag from `start` to `end` makes: Shift makes it square, Alt grows it from the middle. */
export function boxFromDrag(start: Pt, end: Pt, options: { square?: boolean; fromCentre?: boolean } = {}): Box {
    let dx = end.x - start.x, dy = end.y - start.y;
    if (options.square) {
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        dx = (dx < 0 ? -1 : 1) * side;
        dy = (dy < 0 ? -1 : 1) * side;
    }
    if (options.fromCentre) return { x: start.x - Math.abs(dx), y: start.y - Math.abs(dy), w: Math.abs(dx) * 2, h: Math.abs(dy) * 2 };
    return { x: Math.min(start.x, start.x + dx), y: Math.min(start.y, start.y + dy), w: Math.abs(dx), h: Math.abs(dy) };
}

/** Points stretched to exactly fill `box`, so the corners of a star follow the pointer. */
function fitPoints(points: Pt[], box: Box): Pt[] {
    const from = boxOfPoints(points);
    return points.map(p => ({
        x: box.x + (from.w ? (p.x - from.x) / from.w : 0.5) * box.w,
        y: box.y + (from.h ? (p.y - from.y) / from.h : 0.5) * box.h,
    }));
}

export function trianglePoints(box: Box): Pt[] {
    return [{ x: box.x + box.w / 2, y: box.y }, { x: box.x + box.w, y: box.y + box.h }, { x: box.x, y: box.y + box.h }];
}

/** A regular polygon of `sides` (3 or more), point at the top, stretched to the box. */
export function polygonPoints(box: Box, sides: number): Pt[] {
    const n = Math.max(3, Math.round(sides));
    const points: Pt[] = [];
    for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / n;
        points.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return fitPoints(points, box);
}

/** A star of `count` points (3 or more), one at the top, stretched to the box. */
export function starPoints(box: Box, count: number, inner = 0.45): Pt[] {
    const n = Math.max(3, Math.round(count));
    const points: Pt[] = [];
    for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + i * Math.PI / n;
        const r = i % 2 ? inner : 1;
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    return fitPoints(points, box);
}

// ---- the pencil ----------------------------------------------------------------------------

/** Fewer points along the same line (Ramer-Douglas-Peucker): none left further than `tolerance` from it. */
export function simplifyPoints(points: Pt[], tolerance: number): Pt[] {
    if (points.length < 3) return points.map(p => ({ x: p.x, y: p.y }));
    const keep = new Array<boolean>(points.length).fill(false);
    keep[0] = keep[points.length - 1] = true;
    const stack: [number, number][] = [[0, points.length - 1]];
    while (stack.length) {
        const [from, to] = stack.pop()!;
        const a = points[from], b = points[to];
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        let worst = -1, worstAt = -1;
        for (let i = from + 1; i < to; i++) {
            const p = points[i];
            const d = len ? Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y)) / len : distance(p, a);
            if (d > worst) { worst = d; worstAt = i; }
        }
        if (worst > tolerance) {
            keep[worstAt] = true;
            stack.push([from, worstAt], [worstAt, to]);
        }
    }
    return points.filter((_, i) => keep[i]).map(p => ({ x: p.x, y: p.y }));
}

/** Bend handles that carry a smooth line through the points (Catmull-Rom). */
export function smoothNodes(points: Pt[], closed = false): PathNode[] {
    const n = points.length;
    const at = (i: number) => closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
    const round = (p: Pt): Pt => ({ x: roundTo(p.x), y: roundTo(p.y) });
    return points.map((p, i) => {
        const before = at(i - 1), after = at(i + 1);
        const node: PathNode = round(p);
        const tx = (after.x - before.x) / 6, ty = (after.y - before.y) / 6;
        if (closed || i > 0) node.in = round({ x: p.x - tx, y: p.y - ty });
        if (closed || i < n - 1) node.out = round({ x: p.x + tx, y: p.y + ty });
        return node;
    });
}

/**
 * A freehand stroke as a tidy path: the points simplified and smoothed. A stroke that ends where it began
 * (within `closeWithin`) closes, so it can be filled; a press with no drag is a dot.
 */
export function pencilPath(points: Pt[], tolerance: number, closeWithin: number): { nodes: PathNode[]; closed: boolean } {
    if (!points.length) return { nodes: [], closed: false };
    const length = points.slice(1).reduce((sum, p, i) => sum + distance(p, points[i]), 0);
    if (length < 0.5) {
        const p = points[0];
        return { nodes: [{ x: p.x, y: p.y }, { x: p.x + 0.01, y: p.y }], closed: false };
    }
    const closes = points.length > 4 && distance(points[0], points[points.length - 1]) <= closeWithin && length > closeWithin * 4;
    const kept = simplifyPoints(closes ? points.slice(0, -1) : points, tolerance);
    if (kept.length === 2 && !closes) return { nodes: kept.map(p => ({ x: roundTo(p.x), y: roundTo(p.y) })), closed: false };
    return closes && kept.length >= 3 ? { nodes: smoothNodes(kept, true), closed: true } : { nodes: smoothNodes(kept), closed: false };
}

// ---- marks ----------------------------------------------------------------------------------

/** The points of a curve between two nodes (straight when neither has a handle). */
function segmentPoint(a: PathNode, b: PathNode, t: number): Pt {
    if (!a.out && !b.in) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const c1 = a.out ?? a, c2 = b.in ?? b, u = 1 - t;
    return {
        x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
    };
}

const segments = (m: PathMark): [PathNode, PathNode][] => {
    const out: [PathNode, PathNode][] = [];
    for (let i = 0; i < m.nodes.length - 1; i++) out.push([m.nodes[i], m.nodes[i + 1]]);
    if (m.closed && m.nodes.length > 1) out.push([m.nodes[m.nodes.length - 1], m.nodes[0]]);
    return out;
};

/** Points along a path, close enough for its box and for finding what's near it. */
function samplePath(m: PathMark): Pt[] {
    const out: Pt[] = m.nodes.map(n => ({ x: n.x, y: n.y }));
    for (const [a, b] of segments(m)) {
        if (!a.out && !b.in) continue;
        for (let k = 1; k < 16; k++) out.push(segmentPoint(a, b, k / 16));
    }
    for (const nodes of m.more ?? []) out.push(...samplePath({ ...m, nodes, closed: true, more: undefined }));
    return out;
}

/** A mark's box, before its rotation. */
export function markBox(m: Mark): Box {
    if (m.kind === 'path') return boxOfPoints(samplePath(m));
    return { x: m.x, y: m.y, w: m.w, h: m.h };
}

/** The box of a mark as drawn: rotated, and without its line's width. */
export function markWorldBox(m: Mark): Box {
    const box = markBox(m);
    const angle = m.rotation ?? 0;
    if (!angle) return box;
    const c = boxCentre(box);
    if (m.kind === 'path') return boxOfPoints(samplePath(m).map(p => rotatePoint(p, c, angle)));
    if (m.kind === 'ellipse') {
        const r = angle * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r), a = box.w / 2, b = box.h / 2;
        const w = Math.sqrt(a * a * cos * cos + b * b * sin * sin), h = Math.sqrt(a * a * sin * sin + b * b * cos * cos);
        return { x: c.x - w, y: c.y - h, w: w * 2, h: h * 2 };
    }
    return boxOfPoints([{ x: box.x, y: box.y }, { x: box.x + box.w, y: box.y }, { x: box.x + box.w, y: box.y + box.h }, { x: box.x, y: box.y + box.h }].map(p => rotatePoint(p, c, angle)));
}

/** How far an arrowhead reaches, from the line's width. */
const arrowSize = (width: number) => Math.max(8, width * 4);

/** Everything a mark paints: its box with the line's width and any arrowhead. */
export function markPaintBox(m: Mark): Box {
    const box = markWorldBox(m);
    // A sharp corner reaches past half the width; a rounded one never does.
    const line = m.kind === 'locked' || !m.stroke ? 0 : m.sharp ? m.width * 2 : m.width / 2;
    const extra = m.kind === 'path' && m.arrow ? Math.max(line, arrowSize(m.width) / 2) : line;
    return { x: box.x - extra, y: box.y - extra, w: box.w + extra * 2, h: box.h + extra * 2 };
}

/** The box round several marks (without line widths), for the selection's handles. */
export const marksBox = (marks: Mark[]): Box => unionBoxes(marks.map(markWorldBox));

/** The same mark with `map` applied to its geometry. Boxes need an axis-aligned `map`. */
function mapMark<T extends Mark>(m: T, map: (p: Pt) => Pt): T {
    const next = cloneMark(m);
    if (next.kind === 'path') {
        const mapNode = (n: PathNode) => {
            const moved: PathNode = map(n);
            if (n.in) moved.in = map(n.in);
            if (n.out) moved.out = map(n.out);
            return moved;
        };
        next.nodes = next.nodes.map(mapNode);
        if (next.more) next.more = next.more.map(nodes => nodes.map(mapNode));
    } else {
        const a = map({ x: next.x, y: next.y }), b = map({ x: next.x + next.w, y: next.y + next.h });
        next.x = Math.min(a.x, b.x);
        next.y = Math.min(a.y, b.y);
        next.w = Math.abs(b.x - a.x);
        next.h = Math.abs(b.y - a.y);
    }
    return next;
}

export const moveMark = <T extends Mark>(m: T, dx: number, dy: number): T => mapMark(m, p => ({ x: p.x + dx, y: p.y + dy }));

/** Scaled about `anchor`, before rotation. A negative scale flips: a locked mark remembers it. */
export function scaleMark<T extends Mark>(m: T, anchor: Pt, sx: number, sy: number): T {
    const next = mapMark(m, p => ({ x: anchor.x + (p.x - anchor.x) * sx, y: anchor.y + (p.y - anchor.y) * sy }));
    if (next.kind === 'locked') {
        if (sx < 0) next.flipX = !next.flipX;
        if (sy < 0) next.flipY = !next.flipY;
    }
    return next;
}

const HandleSide: Record<Handle, [number, number]> = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };

/** Where a handle sits on a box, 0 to 1 across and down. */
export const handleSide = (h: Handle) => HandleSide[h];

/**
 * One mark, as it was when the drag began, resized by dragging `handle` to `pointer`. The opposite side stays put
 * on the page, rotated or not. `keepRatio` holds the shape's proportions, `fromCentre` grows it from the middle.
 */
export function resizeMark<T extends Mark>(start: T, handle: Handle, pointer: Pt, options: { keepRatio?: boolean; fromCentre?: boolean } = {}): T {
    const box = markBox(start);
    const centre = boxCentre(box);
    const angle = start.rotation ?? 0;
    const local = rotatePoint(pointer, centre, -angle);
    const [hx, hy] = HandleSide[handle];
    const grab = { x: box.x + box.w * hx, y: box.y + box.h * hy };
    const anchor = options.fromCentre ? centre : { x: box.x + box.w * (1 - hx), y: box.y + box.h * (1 - hy) };
    const across = hx !== 0.5, down = hy !== 0.5;
    let sx = across && grab.x !== anchor.x ? (local.x - anchor.x) / (grab.x - anchor.x) : 1;
    let sy = down && grab.y !== anchor.y ? (local.y - anchor.y) / (grab.y - anchor.y) : 1;
    if (options.keepRatio) {
        const scale = across && down ? Math.max(Math.abs(sx), Math.abs(sy)) : across ? Math.abs(sx) : Math.abs(sy);
        sx = (sx < 0 ? -1 : 1) * scale;
        sy = (sy < 0 ? -1 : 1) * scale;
    }
    // Never to nothing: a mark with no size can't be picked up again.
    const least = 0.02;
    if (Math.abs(sx) < least && box.w) sx = sx < 0 ? -least : least;
    if (Math.abs(sy) < least && box.h) sy = sy < 0 ? -least : least;
    const scaled = scaleMark(start, anchor, sx, sy);
    if (!angle) return scaled;
    // The anchor stays where it was on the page: the scaled mark's middle turns about the anchor's old place.
    const worldAnchor = rotatePoint(anchor, centre, angle);
    const nowCentre = boxCentre(markBox(scaled));
    const shouldBe = rotatePoint({ x: worldAnchor.x + nowCentre.x - anchor.x, y: worldAnchor.y + nowCentre.y - anchor.y }, worldAnchor, angle);
    return moveMark(scaled, shouldBe.x - nowCentre.x, shouldBe.y - nowCentre.y);
}

/** Several marks, as they were, fitted from the box `from` to the box `to`. A turned mark keeps its proportions. */
export function fitMarks(marks: Mark[], from: Box, to: Box): Mark[] {
    const sx = from.w ? to.w / from.w : 1, sy = from.h ? to.h / from.h : 1;
    return marks.map(m => {
        const c = boxCentre(markBox(m));
        const nc = { x: to.x + (c.x - from.x) * sx, y: to.y + (c.y - from.y) * sy };
        const turned = !!m.rotation && m.rotation % 180 !== 0;
        const even = Math.sqrt(sx * sy);
        const scaled = scaleMark(m, c, turned ? even : sx, turned ? even : sy);
        return moveMark(scaled, nc.x - c.x, nc.y - c.y);
    });
}

/** Marks turned together about `about`: each one's middle goes round it and its own rotation grows. */
export function rotateMarks(marks: Mark[], about: Pt, degrees: number): Mark[] {
    return marks.map(m => {
        const c = boxCentre(markBox(m));
        const to = rotatePoint(c, about, degrees);
        const moved = moveMark(m, to.x - c.x, to.y - c.y);
        const angle = ((moved.rotation ?? 0) + degrees) % 360;
        if (Math.abs(angle) < 0.001) delete moved.rotation; else moved.rotation = angle;
        return moved;
    });
}

/** Marks flipped together, left to right ('x') or top to bottom ('y'), about the middle of their box. */
export function flipMarks(marks: Mark[], axis: 'x' | 'y'): Mark[] {
    const about = boxCentre(marksBox(marks));
    return marks.map(m => {
        const c = boxCentre(markBox(m));
        const flipped = scaleMark(m, c, axis === 'x' ? -1 : 1, axis === 'y' ? -1 : 1);
        const to = axis === 'x' ? { x: 2 * about.x - c.x, y: c.y } : { x: c.x, y: 2 * about.y - c.y };
        const moved = moveMark(flipped, to.x - c.x, to.y - c.y);
        if (moved.rotation) moved.rotation = -moved.rotation;
        return moved;
    });
}

/** The ids that select together with `id`: its whole group, or just it. */
export function groupOf(doc: ShapeDoc, id: string): string[] {
    const mark = doc.marks.find(m => m.id === id);
    if (!mark) return [];
    return mark.group ? doc.marks.filter(m => m.group === mark.group).map(m => m.id) : [id];
}

/** Group the marks: they become one object, next to each other at the front-most one's place. */
export function groupMarks(doc: ShapeDoc, ids: string[]): ShapeDoc {
    const chosen = new Set(ids);
    if (chosen.size < 2) return doc;
    const group = freshId(doc.marks.map(m => m.group ?? ''), 'g');
    const picked = doc.marks.filter(m => chosen.has(m.id)).map(m => ({ ...cloneMark(m), group }));
    const last = doc.marks.map(m => chosen.has(m.id)).lastIndexOf(true);
    const before = doc.marks.slice(0, last + 1).filter(m => !chosen.has(m.id));
    const after = doc.marks.slice(last + 1);
    return { marks: [...before, ...picked, ...after] };
}

export function ungroupMarks(doc: ShapeDoc, ids: string[]): ShapeDoc {
    const chosen = new Set(ids);
    return { marks: doc.marks.map(m => {
        if (!chosen.has(m.id) || !m.group) return m;
        const next = cloneMark(m);
        delete next.group;
        return next;
    }) };
}

/** The picked marks moved to the front or the back, keeping their order among themselves. */
export function reorderMarks(doc: ShapeDoc, ids: string[], to: 'front' | 'back'): ShapeDoc {
    const chosen = new Set(ids);
    const picked = doc.marks.filter(m => chosen.has(m.id)), rest = doc.marks.filter(m => !chosen.has(m.id));
    return { marks: to === 'front' ? [...rest, ...picked] : [...picked, ...rest] };
}

/** Copies of marks, with new ids and new group ids, moved by the offset. */
export function copyMarks(marks: Mark[], used: string[], usedGroups: string[], offset: Pt): Mark[] {
    const ids = [...used], groups = [...usedGroups];
    const groupMap = new Map<string, string>();
    return marks.map(m => {
        const copy = moveMark(m, offset.x, offset.y);
        copy.id = freshId(ids);
        ids.push(copy.id);
        if (m.group) {
            if (!groupMap.has(m.group)) { const g = freshId(groups, 'g'); groups.push(g); groupMap.set(m.group, g); }
            copy.group = groupMap.get(m.group);
        }
        return copy;
    });
}

// ---- editing a mark's points ----------------------------------------------------------------

/** Four-point circle: how far the handles reach for a Bézier that looks round. */
const Round = 0.5523;

/**
 * A mark as a path you can edit point by point, with its rotation baked in: a rectangle becomes four corners, an
 * ellipse four rounded points. A locked mark has no points (null).
 */
export function editableMark(m: Mark): PathMark | null {
    if (m.kind === 'locked') return null;
    const { id, fill, stroke, width, dash, opacity, group } = m;
    const common = { id, fill, stroke, width, dash, opacity, ...(group ? { group } : {}) };
    let nodes: PathNode[];
    let closed = true;
    let arrow: boolean | undefined;
    let more: PathNode[][] | undefined;
    if (m.kind === 'path') {
        nodes = m.nodes.map(n => ({ ...n }));
        closed = m.closed;
        arrow = m.arrow;
        more = m.more?.map(loop => loop.map(n => ({ ...n })));
    } else {
        const { x, y, w, h } = m;
        if (m.kind === 'rect' && !m.radius) {
            nodes = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
        } else {
            const rx = m.kind === 'ellipse' ? w / 2 : Math.min(m.radius ?? 0, w / 2);
            const ry = m.kind === 'ellipse' ? h / 2 : Math.min(m.radius ?? 0, h / 2);
            const kx = rx * Round, ky = ry * Round;
            nodes = m.kind === 'ellipse' ? [
                { x: x + rx, y, in: { x: x + rx - kx, y }, out: { x: x + rx + kx, y } },
                { x: x + w, y: y + ry, in: { x: x + w, y: y + ry - ky }, out: { x: x + w, y: y + ry + ky } },
                { x: x + rx, y: y + h, in: { x: x + rx + kx, y: y + h }, out: { x: x + rx - kx, y: y + h } },
                { x, y: y + ry, in: { x, y: y + ry + ky }, out: { x, y: y + ry - ky } },
            ] : [
                { x: x + rx, y, in: { x: x + rx - kx, y } }, { x: x + w - rx, y, out: { x: x + w - rx + kx, y } },
                { x: x + w, y: y + ry, in: { x: x + w, y: y + ry - ky } }, { x: x + w, y: y + h - ry, out: { x: x + w, y: y + h - ry + ky } },
                { x: x + w - rx, y: y + h, in: { x: x + w - rx + kx, y: y + h } }, { x: x + rx, y: y + h, out: { x: x + rx - kx, y: y + h } },
                { x, y: y + h - ry, in: { x, y: y + h - ry + ky } }, { x, y: y + ry, out: { x, y: y + ry - ky } },
            ];
        }
    }
    const path: PathMark = { kind: 'path', ...common, nodes, closed, ...(arrow ? { arrow } : {}), ...(more ? { more } : {}) };
    const angle = m.rotation ?? 0;
    if (!angle) return path;
    const c = boxCentre(markBox(m));
    const turn = (p: Pt) => rotatePoint(p, c, angle);
    const turnNode = (n: PathNode): PathNode => ({ ...turn(n), ...(n.in ? { in: turn(n.in) } : {}), ...(n.out ? { out: turn(n.out) } : {}) });
    return { ...path, nodes: nodes.map(turnNode), ...(more ? { more: more.map(loop => loop.map(turnNode)) } : {}) };
}

/** Point `index` moved to `to`; its handles come with it. */
export function movePoint(m: PathMark, index: number, to: Pt): PathMark {
    const next = cloneMark(m);
    const n = next.nodes[index];
    if (!n) return next;
    const dx = to.x - n.x, dy = to.y - n.y;
    n.x = to.x; n.y = to.y;
    if (n.in) n.in = { x: n.in.x + dx, y: n.in.y + dy };
    if (n.out) n.out = { x: n.out.x + dx, y: n.out.y + dy };
    return next;
}

/** A bend handle of point `index` dragged to `to`; the opposite one mirrors it, keeping the point smooth. */
export function moveBend(m: PathMark, index: number, which: 'in' | 'out', to: Pt): PathMark {
    const next = cloneMark(m);
    const n = next.nodes[index];
    if (!n) return next;
    n[which] = { x: to.x, y: to.y };
    const other = which === 'in' ? 'out' : 'in';
    if (n[other]) n[other] = { x: 2 * n.x - to.x, y: 2 * n.y - to.y };
    return next;
}

/** Point `index` gone; false when too few would be left for the shape (2 for an open one, 3 for a closed one). */
export function removePoint(m: PathMark, index: number): PathMark | null {
    if (m.nodes.length <= (m.closed ? 3 : 2)) return null;
    const next = cloneMark(m);
    next.nodes.splice(index, 1);
    return next;
}

/** A new point on the line nearest `at`, the curve keeping its shape; null when nothing is within `within`. */
export function insertPoint(m: PathMark, at: Pt, within: number): { mark: PathMark; index: number } | null {
    let best = { d: Infinity, seg: -1, t: 0 };
    segments(m).forEach(([a, b], seg) => {
        for (let k = 0; k <= 32; k++) {
            const t = k / 32, d = distance(segmentPoint(a, b, t), at);
            if (d < best.d) best = { d, seg, t };
        }
    });
    if (best.seg < 0 || best.d > within) return null;
    const next = cloneMark(m);
    const a = next.nodes[best.seg], index = best.seg + 1, b = next.nodes[index % next.nodes.length], t = best.t;
    const mix = (p: Pt, q: Pt): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    let node: PathNode;
    if (!a.out && !b.in) node = mix(a, b);
    else {
        const c1 = a.out ?? a, c2 = b.in ?? b;
        const p1 = mix(a, c1), p2 = mix(c1, c2), p3 = mix(c2, b), p4 = mix(p1, p2), p5 = mix(p2, p3), p6 = mix(p4, p5);
        node = { ...p6, in: p4, out: p5 };
        a.out = p1;
        b.in = p3;
    }
    next.nodes.splice(index, 0, node);
    return { mark: next, index };
}

// ---- writing it ------------------------------------------------------------------------------

/** Two decimal places at most, and no `-0`. */
export function roundTo(v: number): number {
    const r = Math.round(v * 100) / 100;
    return r === 0 ? 0 : r;
}
const num = (v: number) => String(roundTo(v));
const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The `d` of a path mark: straight lines and curves, as they are. */
export function pathData(m: PathMark): string {
    if (!m.nodes.length) return '';
    let d = `M${num(m.nodes[0].x)} ${num(m.nodes[0].y)}`;
    for (const [a, b] of segments(m)) {
        if (a.out || b.in) {
            const c1 = a.out ?? a, c2 = b.in ?? b;
            d += `C${num(c1.x)} ${num(c1.y)} ${num(c2.x)} ${num(c2.y)} ${num(b.x)} ${num(b.y)}`;
        } else if (!(m.closed && b === m.nodes[0])) d += `L${num(b.x)} ${num(b.y)}`;
    }
    const own = m.closed ? `${d}Z` : d;
    return (m.more ?? []).reduce((all, nodes) => all + pathData({ ...m, nodes, closed: true, more: undefined }), own);
}

/** The arrowhead at a path's end: three points, the tip on the end point. */
export function arrowHead(m: PathMark): Pt[] {
    const last = m.nodes[m.nodes.length - 1], prev = m.nodes[m.nodes.length - 2];
    if (!last || !prev) return [];
    const from = last.in ?? prev;
    const angle = Math.atan2(last.y - from.y, last.x - from.x);
    const size = arrowSize(m.width);
    const side = (turn: number): Pt => ({ x: last.x - Math.cos(angle + turn) * size, y: last.y - Math.sin(angle + turn) * size });
    return [{ x: last.x, y: last.y }, side(0.45), side(-0.45)];
}

function styleAttrs(m: MarkStyle & { sharp?: boolean }, fillOverride?: string): string {
    const parts = [`fill="${fillOverride ?? (m.fill ? escapeAttr(m.fill) : 'none')}"`];
    if (m.stroke && m.width > 0) {
        parts.push(`stroke="${escapeAttr(m.stroke)}"`, `stroke-width="${num(m.width)}"`);
        if (!m.sharp) parts.push('stroke-linecap="round"', 'stroke-linejoin="round"');
        if (m.dash === 'dashed') parts.push(`stroke-dasharray="${num(m.width * 4)} ${num(m.width * 3)}"`);
        else if (m.dash === 'dotted') parts.push(`stroke-dasharray="0 ${num(m.width * 2)}"`);
    }
    return parts.join(' ');
}

function rotationAttr(m: Mark): string {
    if (!m.rotation) return '';
    const c = boxCentre(markBox(m));
    return ` transform="rotate(${num(m.rotation)} ${num(c.x)} ${num(c.y)})"`;
}

const opacityAttr = (m: MarkStyle) => m.opacity < 1 ? ` opacity="${num(m.opacity)}"` : '';

const straight = (m: PathMark) => m.nodes.every(n => !n.in && !n.out);

/** One mark as SVG. `extra` goes on its outer element (the editor's ids; nothing in a saved file). */
export function markMarkup(m: Mark, extra = ''): string {
    const common = `${extra}${rotationAttr(m)}${opacityAttr(m)}`;
    if (m.kind === 'rect' || m.kind === 'ellipse') {
        if (m.kind === 'ellipse') return `<ellipse cx="${num(m.x + m.w / 2)}" cy="${num(m.y + m.h / 2)}" rx="${num(m.w / 2)}" ry="${num(m.h / 2)}" ${styleAttrs(m)}${common}/>`;
        const r = m.radius ? ` rx="${num(m.radius)}" ry="${num(m.radius)}"` : '';
        return `<rect x="${num(m.x)}" y="${num(m.y)}" width="${num(m.w)}" height="${num(m.h)}"${r} ${styleAttrs(m)}${common}/>`;
    }
    if (m.kind === 'locked') {
        const n = m.natural;
        const sx = (n.w ? m.w / n.w : 1) * (m.flipX ? -1 : 1), sy = (n.h ? m.h / n.h : 1) * (m.flipY ? -1 : 1);
        // Its own box goes to the mark's box: flipped, it hangs from the far side.
        const tx = (m.flipX ? m.x + m.w : m.x) - n.x * sx, ty = (m.flipY ? m.y + m.h : m.y) - n.y * sy;
        const place = `translate(${num(tx)} ${num(ty)}) scale(${roundScale(sx)} ${roundScale(sy)})`;
        const c = boxCentre(m);
        const transform = m.rotation ? `rotate(${num(m.rotation)} ${num(c.x)} ${num(c.y)}) ${place}` : place;
        return `<g data-shape="locked" transform="${transform}"${extra}${opacityAttr(m)}>${m.markup}</g>`;
    }
    if (m.kind !== 'path') return '';
    if (m.arrow) {
        const head = arrowHead(m).map(p => `${num(p.x)},${num(p.y)}`).join(' ');
        const line = straight(m) && m.nodes.length === 2
            ? `<line x1="${num(m.nodes[0].x)}" y1="${num(m.nodes[0].y)}" x2="${num(m.nodes[1].x)}" y2="${num(m.nodes[1].y)}" ${styleAttrs(m, 'none')}/>`
            : `<path d="${pathData(m)}" ${styleAttrs(m)}/>`;
        const colour = m.stroke ? escapeAttr(m.stroke) : 'none';
        return `<g data-shape="arrow"${common}>${line}<polygon points="${head}" fill="${colour}"/></g>`;
    }
    if (m.more?.length) return `<path data-shape="holes" d="${pathData(m)}" ${styleAttrs(m)}${common}/>`;
    if (straight(m)) {
        if (!m.closed && m.nodes.length === 2) {
            return `<line x1="${num(m.nodes[0].x)}" y1="${num(m.nodes[0].y)}" x2="${num(m.nodes[1].x)}" y2="${num(m.nodes[1].y)}" ${styleAttrs(m, 'none')}${common}/>`;
        }
        if (m.closed) return `<polygon points="${m.nodes.map(p => `${num(p.x)},${num(p.y)}`).join(' ')}" ${styleAttrs(m)}${common}/>`;
    }
    return `<path d="${pathData(m)}" ${styleAttrs(m)}${common}/>`;
}

const roundScale = (v: number) => String(Math.round(v * 10000) / 10000);

/** The marks in order, each group's marks inside one `<g>`, indented for a person reading the file. */
function marksMarkup(marks: Mark[]): string[] {
    const lines: string[] = [];
    for (let i = 0; i < marks.length;) {
        const m = marks[i];
        if (!m.group) { lines.push(`  ${markMarkup(m)}`); i++; continue; }
        lines.push('  <g data-shape="group">');
        while (i < marks.length && marks[i].group === m.group) lines.push(`    ${markMarkup(marks[i++])}`);
        lines.push('  </g>');
    }
    return lines;
}

/**
 * The drawing as a normal, tidy SVG: no scripts, no outside references, the `viewBox` starting at 0 0 and trimmed to
 * what was drawn plus the line widths. The `data-shape` attributes tell this editor, when it opens the file again,
 * what was an arrow and what was grouped; everything else ignores them.
 */
export function shapeToSvg(doc: ShapeDoc): string {
    if (!doc.marks.length) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"></svg>\n';
    const paint = unionBoxes(doc.marks.map(markPaintBox));
    const moved = doc.marks.map(m => moveMark(m, -paint.x, -paint.y));
    const w = Math.max(1, Math.ceil(paint.w)), h = Math.max(1, Math.ceil(paint.h));
    return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`, ...(doc.defs ? [`  ${doc.defs}`] : []), ...marksMarkup(moved), '</svg>', ''].join('\n');
}
