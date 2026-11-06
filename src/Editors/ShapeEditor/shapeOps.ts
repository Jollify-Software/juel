// What <juel-shape-editor> does to the geometry of marks, beyond moving them. Nothing here touches the page.
//
//   rubOutPath    — the eraser's "Part of a line": a line loses what the pointer crosses and comes apart in pieces.
//   combineMarks  — Join and Cut out on closed shapes. A curve stays a curve in the result: the working copy of a shape is
//                   flat edges, but each remembers which curve it came from and where, so what's kept goes back as curves.
//   traceOutlines — the Words tool. An SVG picture can't load a font, so words go in as shapes: the editor draws them on a
//                   hidden canvas and this follows the edge of the pixels. Needs no font file, and takes any font the browser has.
//
// How Join and Cut out work: every edge is split wherever it meets another. Then each piece looks to both its sides: if
// the result is on one side and not on the other, it's part of the new outline, facing that way. Otherwise it goes.
// That one rule covers crossing, touching, shared edges and shapes that cross themselves; following the pieces round gives
// the outlines, and because they all face the same way, a hole comes out as a hole under SVG's ordinary fill rule.
import { boxOfPoints, distance, editableMark, simplifyPoints, type Box, type Mark, type PathMark, type PathNode, type Pt } from './shapeModel';

/** One bit of a path: straight (`c1` and `c2` are null) or a curve. */
interface Seg { p0: Pt; c1: Pt | null; c2: Pt | null; p3: Pt }

const asSeg = (a: PathNode, b: PathNode): Seg => a.out || b.in ? { p0: a, c1: a.out ?? a, c2: b.in ?? b, p3: b } : { p0: a, c1: null, c2: null, p3: b };

function pointOn(s: Seg, t: number): Pt {
    if (!s.c1 || !s.c2) return { x: s.p0.x + (s.p3.x - s.p0.x) * t, y: s.p0.y + (s.p3.y - s.p0.y) * t };
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return { x: a * s.p0.x + b * s.c1.x + c * s.c2.x + d * s.p3.x, y: a * s.p0.y + b * s.c1.y + c * s.c2.y + d * s.p3.y };
}

/** The part of a curve from `t0` to `t1` (either way round): its two bend handles; null for a straight one. */
function partOf(s: Seg, t0: number, t1: number): { c1: Pt; c2: Pt } | null {
    if (!s.c1 || !s.c2) return null;
    const lo = Math.min(t0, t1), hi = Math.max(t0, t1);
    const mix = (p: Pt, q: Pt, t: number): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    // Up to `hi`, then that piece from `lo / hi` on.
    const ab = mix(s.p0, s.c1, hi), bc = mix(s.c1, s.c2, hi), cd = mix(s.c2, s.p3, hi), abc = mix(ab, bc, hi), bcd = mix(bc, cd, hi), end = mix(abc, bcd, hi);
    const r = hi ? lo / hi : 0;
    const p2 = mix(ab, abc, r), c2 = mix(abc, end, r), c1 = mix(p2, c2, r);
    return t0 <= t1 ? { c1, c2 } : { c1: c2, c2: c1 };
}

const loopSegs = (nodes: PathNode[], closed: boolean): Seg[] => {
    const out: Seg[] = [];
    for (let i = 0; i < nodes.length - 1; i++) out.push(asSeg(nodes[i], nodes[i + 1]));
    if (closed && nodes.length > 1) out.push(asSeg(nodes[nodes.length - 1], nodes[0]));
    return out;
};

// ---- rubbing out part of a line ------------------------------------------------------------

function distanceToLine(p: Pt, a: Pt, b: Pt): number {
    const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** The parts of a segment outside what's rubbed, as ranges of t. */
function keptRanges(seg: Seg, rubbed: (p: Pt) => boolean): [number, number][] {
    const Steps = 48;
    const kept: [number, number][] = [];
    const edge = (inT: number, outT: number) => {
        let a = inT, b = outT; // `a` is rubbed, `b` isn't.
        for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (rubbed(pointOn(seg, m))) a = m; else b = m; }
        return b;
    };
    let start: number | null = rubbed(pointOn(seg, 0)) ? null : 0;
    let before = 0;
    for (let k = 1; k <= Steps; k++) {
        const t = k / Steps, hit = rubbed(pointOn(seg, t));
        if (hit && start !== null) { kept.push([start, edge(t, before)]); start = null; }
        else if (!hit && start === null) start = edge(before, t);
        before = t;
    }
    if (start !== null) kept.push([start, 1]);
    return kept;
}

const lengthOf = (nodes: PathNode[]) => loopSegs(nodes, false).reduce((sum, s) => {
    let at = s.p0, len = 0;
    for (let k = 1; k <= 8; k++) { const p = pointOn(s, k / 8); len += distance(at, p); at = p; }
    return sum + len;
}, 0);

/**
 * A line with what lies within `radius` of the stroke from `from` to `to` rubbed out: the pieces left, in order, the first keeping
 * the mark's id. Null when the stroke touched nothing. Empty when none of it is left. The pieces are open lines, so have no fill.
 * `newId(i)` names piece `i` (1 up). Pieces shorter than a dot's worth go too.
 */
export function rubOutPath(m: PathMark, from: Pt, to: Pt, radius: number, newId: (index: number) => string): PathMark[] | null {
    const rubbed = (p: Pt) => distanceToLine(p, from, to) <= radius;
    const segs = loopSegs(m.nodes, m.closed);
    const pieces: PathNode[][] = [];
    let current: PathNode[] | null = null, touched = false, startsAtBegin = false, endsAtEnd = false;
    for (const [index, seg] of segs.entries()) {
        const ranges = keptRanges(seg, rubbed);
        if (ranges.length !== 1 || ranges[0][0] !== 0 || ranges[0][1] !== 1) touched = true;
        if (!ranges.length) current = null;
        for (const [t0, t1] of ranges) {
            const part = partOf(seg, t0, t1), a = pointOn(seg, t0), b = pointOn(seg, t1);
            if (current && t0 === 0) {
                if (part) current[current.length - 1].out = part.c1;
            } else {
                current = [{ x: a.x, y: a.y, ...(part ? { out: part.c1 } : {}) }];
                pieces.push(current);
                if (index === 0 && t0 === 0) startsAtBegin = true;
            }
            current.push({ x: b.x, y: b.y, ...(part ? { in: part.c2 } : {}) });
            if (t1 !== 1) current = null;
            else if (index === segs.length - 1) endsAtEnd = true;
        }
    }
    if (!touched) return null;
    // A closed shape started somewhere on its way round: its last piece runs on into its first.
    if (m.closed && startsAtBegin && endsAtEnd && pieces.length > 1) {
        const first = pieces.shift()!, last = pieces.pop()!;
        const join = last[last.length - 1];
        pieces.push([...last.slice(0, -1), { ...first[0], ...(join.in ? { in: join.in } : {}) }, ...first.slice(1)]);
    }
    const least = Math.max(0.5, radius * 0.2);
    const kept = pieces.filter(p => lengthOf(p) >= least);
    const { more: _more, arrow: _arrow, ...rest } = m;
    return kept.map((nodes, i) => ({
        ...rest, id: i ? newId(i) : m.id, fill: null, closed: false, nodes,
        // The arrowhead stays on the piece that still has the line's end.
        ...(m.arrow && endsAtEnd && i === kept.length - 1 ? { arrow: true } : {}),
    }));
}

// ---- words as outlines ---------------------------------------------------------------------

/** Each point of a closed loop moved to the average of itself and `by` neighbours either side. */
function softenLoop(loop: Pt[], by: number): Pt[] {
    const n = loop.length, count = by * 2 + 1;
    if (n < count) return loop;
    let sumX = 0, sumY = 0;
    for (let i = -by; i <= by; i++) { const p = loop[(i + n) % n]; sumX += p.x; sumY += p.y; }
    return loop.map((_, i) => {
        const here = { x: sumX / count, y: sumY / count };
        const leaves = loop[(i - by + n) % n], comes = loop[(i + by + 1) % n];
        sumX += comes.x - leaves.x;
        sumY += comes.y - leaves.y;
        return here;
    });
}

/**
 * The outlines round what's solid in a bitmap (`alpha`, one value per pixel, `w` wide), straightened to within `tolerance`
 * pixels. Inside is always on the same side, so a letter's hole faces the other way and paints as a hole. `soften` evens out
 * the pixels' staircase first (how many pixels either side to average over): without it, straightening follows the steps and
 * a curve comes out with uneven flat sides. It rounds a corner by about that much, so it's for bitmaps much bigger than they'll be seen.
 */
export function traceOutlines(alpha: ArrayLike<number>, w: number, h: number, tolerance = 1, soften = 0, threshold = 128): Pt[][] {
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x] >= threshold;
    const across = w + 1;
    const key = (x: number, y: number) => y * across + x;
    const leaving = new Map<number, number[]>();
    const edge = (x0: number, y0: number, x1: number, y1: number) => {
        const from = key(x0, y0), list = leaving.get(from);
        if (list) list.push(key(x1, y1)); else leaving.set(from, [key(x1, y1)]);
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!solid(x, y)) continue;
        if (!solid(x, y - 1)) edge(x, y, x + 1, y);
        if (!solid(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
        if (!solid(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
        if (!solid(x - 1, y)) edge(x, y + 1, x, y);
    }
    const loops: Pt[][] = [];
    for (const start of [...leaving.keys()]) {
        while (leaving.get(start)?.length) {
            const chain: Pt[] = [];
            let at = start;
            do {
                chain.push({ x: at % across, y: Math.floor(at / across) });
                const out = leaving.get(at)!;
                at = out.pop()!;
            } while (at !== start && leaving.get(at)?.length);
            const even = soften ? softenLoop(softenLoop(chain, soften), soften) : chain;
            const kept = simplifyPoints([...even, even[0]], tolerance).slice(0, -1);
            if (kept.length >= 3) loops.push(kept);
        }
    }
    return loops;
}

/** Outlines stood in `box`, keeping their proportions, as one closed shape: the biggest outline first, the rest with it. */
export function outlinesToNodes(loops: Pt[][], box: Box): { nodes: PathNode[]; more?: PathNode[][] } {
    const all = boxOfPoints(loops.flat());
    const scale = Math.min(all.w ? box.w / all.w : 1, all.h ? box.h / all.h : 1);
    const placed = [...loops].sort((a, b) => Math.abs(areaOf(b)) - Math.abs(areaOf(a)))
        .map(loop => loop.map(p => ({ x: box.x + (p.x - all.x) * scale, y: box.y + (p.y - all.y) * scale })));
    const [nodes, ...more] = placed;
    return more.length ? { nodes, more } : { nodes };
}

// ---- join and cut out --------------------------------------------------------------------

export type CombineOp = 'join' | 'cut';

/** Can it be joined or cut? A closed shape that isn't locked. */
export const isClosedShape = (m: Mark): boolean => m.kind === 'rect' || m.kind === 'ellipse' || (m.kind === 'path' && m.closed);

/** How finely a curve is flattened to work on it. The result's curves are the real ones, not these. */
const FlatSteps = 24;
/** How far to each side a piece of edge looks. A feature thinner than twice this can't be told apart. */
const LookAside = 0.02;
const SameSpot = 0.01;

interface Edge { a: Pt; b: Pt; seg: Seg; t0: number; t1: number }

function edgesOf(m: PathMark): Edge[][] {
    return [m.nodes, ...(m.more ?? [])].map(nodes => loopSegs(nodes, true).flatMap(seg => {
        const steps = seg.c1 ? FlatSteps : 1;
        const out: Edge[] = [];
        for (let k = 0; k < steps; k++) out.push({ a: pointOn(seg, k / steps), b: pointOn(seg, (k + 1) / steps), seg, t0: k / steps, t1: (k + 1) / steps });
        return out;
    }));
}

/** Non-zero winding, as SVG fills it. */
function insideEdges(p: Pt, edges: Edge[]): boolean {
    let winding = 0;
    for (const { a, b } of edges) {
        if (a.y <= p.y) { if (b.y > p.y && (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y) > 0) winding++; }
        else if (b.y <= p.y && (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y) < 0) winding--;
    }
    return winding !== 0;
}

/** Every point stands for all the points about the same place, so pieces of different edges meet exactly. */
class Spots {
    private cells = new Map<string, Pt[]>();
    get(p: Pt): Pt {
        const cx = Math.floor(p.x / (SameSpot * 2)), cy = Math.floor(p.y / (SameSpot * 2));
        for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) {
            for (const q of this.cells.get(`${x},${y}`) ?? []) if (distance(p, q) <= SameSpot) return q;
        }
        const key = `${cx},${cy}`, spot = { x: p.x, y: p.y };
        const list = this.cells.get(key);
        if (list) list.push(spot); else this.cells.set(key, [spot]);
        return spot;
    }
}

/** Where along each of two edges they meet: crossing, one ending on the other, or lying along each other. */
function meetings(e: Edge, f: Edge, onE: number[], onF: number[]) {
    if (Math.max(e.a.x, e.b.x) + SameSpot < Math.min(f.a.x, f.b.x) || Math.max(f.a.x, f.b.x) + SameSpot < Math.min(e.a.x, e.b.x)
        || Math.max(e.a.y, e.b.y) + SameSpot < Math.min(f.a.y, f.b.y) || Math.max(f.a.y, f.b.y) + SameSpot < Math.min(e.a.y, e.b.y)) return;
    const rx = e.b.x - e.a.x, ry = e.b.y - e.a.y, sx = f.b.x - f.a.x, sy = f.b.y - f.a.y;
    const cross = rx * sy - ry * sx, qx = f.a.x - e.a.x, qy = f.a.y - e.a.y;
    const eLen = Math.hypot(rx, ry) || 1, fLen = Math.hypot(sx, sy) || 1;
    if (Math.abs(cross) > 1e-9 * eLen * fLen) {
        const u = (qx * sy - qy * sx) / cross, v = (qx * ry - qy * rx) / cross;
        const slackE = SameSpot / eLen, slackF = SameSpot / fLen;
        if (u >= -slackE && u <= 1 + slackE && v >= -slackF && v <= 1 + slackF) {
            onE.push(Math.max(0, Math.min(1, u)));
            onF.push(Math.max(0, Math.min(1, v)));
        }
    }
    // Ends lying on the other edge also catch the parallel case.
    const project = (p: Pt, from: Pt, dx: number, dy: number, len: number) => ((p.x - from.x) * dx + (p.y - from.y) * dy) / (len * len);
    for (const p of [f.a, f.b]) if (distanceToLine(p, e.a, e.b) <= SameSpot) onE.push(Math.max(0, Math.min(1, project(p, e.a, rx, ry, eLen))));
    for (const p of [e.a, e.b]) if (distanceToLine(p, f.a, f.b) <= SameSpot) onF.push(Math.max(0, Math.min(1, project(p, f.a, sx, sy, fLen))));
}

const areaOf = (loop: Pt[]) => loop.reduce((sum, p, i) => { const q = loop[(i + 1) % loop.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2;

/** The outlines of two shapes put together. Null when they couldn't be followed round: nothing is changed then. */
function combineLoops(a: PathMark, b: PathMark, op: CombineOp): Edge[][] | null {
    const aEdges = edgesOf(a).flat(), bEdges = edgesOf(b).flat();
    const all = [...aEdges, ...bEdges];
    const params: number[][] = all.map(() => []);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) meetings(all[i], all[j], params[i], params[j]);
    const spots = new Spots();
    const pieces: Edge[] = [];
    all.forEach((edge, i) => {
        const cuts = [0, ...params[i], 1].sort((x, y) => x - y);
        for (let k = 0; k < cuts.length - 1; k++) {
            const u = cuts[k], v = cuts[k + 1];
            if (v - u < 1e-9) continue;
            const at = (w: number): Pt => ({ x: edge.a.x + (edge.b.x - edge.a.x) * w, y: edge.a.y + (edge.b.y - edge.a.y) * w });
            const from = spots.get(at(u)), to = spots.get(at(v));
            if (from === to) continue;
            pieces.push({ a: from, b: to, seg: edge.seg, t0: edge.t0 + (edge.t1 - edge.t0) * u, t1: edge.t0 + (edge.t1 - edge.t0) * v });
        }
    });
    const inResult = (p: Pt) => op === 'join' ? insideEdges(p, aEdges) || insideEdges(p, bEdges) : insideEdges(p, aEdges) && !insideEdges(p, bEdges);
    const facing = new Set<string>();
    const ids = new Map<Pt, number>();
    const idOf = (p: Pt) => { let n = ids.get(p); if (n === undefined) { n = ids.size; ids.set(p, n); } return n; };
    const leaving = new Map<Pt, Edge[]>();
    let count = 0;
    for (const piece of pieces) {
        const dx = piece.b.x - piece.a.x, dy = piece.b.y - piece.a.y, len = Math.hypot(dx, dy);
        const mid = { x: (piece.a.x + piece.b.x) / 2, y: (piece.a.y + piece.b.y) / 2 };
        const side = { x: -dy / len * LookAside, y: dx / len * LookAside };
        const one = inResult({ x: mid.x + side.x, y: mid.y + side.y }), other = inResult({ x: mid.x - side.x, y: mid.y - side.y });
        if (one === other) continue;
        const kept = one ? piece : { a: piece.b, b: piece.a, seg: piece.seg, t0: piece.t1, t1: piece.t0 };
        // The same bit of edge from both shapes counts once.
        const key = `${idOf(kept.a)}>${idOf(kept.b)}`;
        if (facing.has(key)) continue;
        facing.add(key);
        const list = leaving.get(kept.a);
        if (list) list.push(kept); else leaving.set(kept.a, [kept]);
        count++;
    }
    const loops: Edge[][] = [];
    while (count > 0) {
        const first = [...leaving.values()].find(list => list.length)!;
        const begin = first[0].a;
        const loop: Edge[] = [];
        let at = begin;
        do {
            const out = leaving.get(at);
            if (!out?.length) return null;
            // Where outlines touch at a point, carry on along the one that came in: straightest way on.
            let pick = 0;
            const last = loop[loop.length - 1];
            if (last && out.length > 1) {
                const inX = last.b.x - last.a.x, inY = last.b.y - last.a.y;
                let best = -Infinity;
                out.forEach((e, i) => {
                    const dot = (inX * (e.b.x - e.a.x) + inY * (e.b.y - e.a.y)) / (Math.hypot(inX, inY) * Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y) || 1);
                    if (dot > best) { best = dot; pick = i; }
                });
            }
            const edge = out.splice(pick, 1)[0];
            loop.push(edge);
            count--;
            at = edge.b;
        } while (at !== begin);
        loops.push(loop);
    }
    return loops;
}

/** Runs of edges from one stretch of one curve go back as that curve. */
function loopNodes(loop: Edge[]): PathNode[] {
    const continues = (p: Edge, q: Edge) => p.seg === q.seg && Math.abs(p.t1 - q.t0) < 1e-9;
    let start = 0;
    while (start < loop.length && continues(loop[(start + loop.length - 1) % loop.length], loop[start])) start++;
    if (start === loop.length) start = 0;
    const ordered = [...loop.slice(start), ...loop.slice(0, start)];
    const runs: { from: Pt; part: { c1: Pt; c2: Pt } | null }[] = [];
    for (let i = 0; i < ordered.length;) {
        let j = i;
        while (j + 1 < ordered.length && continues(ordered[j], ordered[j + 1])) j++;
        runs.push({ from: ordered[i].a, part: partOf(ordered[i].seg, ordered[i].t0, ordered[j].t1) });
        i = j + 1;
    }
    return runs.map((run, i) => {
        const before = runs[(i + runs.length - 1) % runs.length].part;
        return { x: run.from.x, y: run.from.y, ...(before ? { in: before.c2 } : {}), ...(run.part ? { out: run.part.c1 } : {}) };
    });
}

const outlineArea = (loop: Edge[]) => areaOf(loop.map(e => e.a));

export interface CombineResult {
    ok: boolean;
    mark?: PathMark;
    /** Why not: `nothing-left` (a Cut out takes all of it), `not-touching` (a Cut out misses it), `failed` (not closed shapes, or their outlines couldn't be followed). */
    reason?: 'nothing-left' | 'not-touching' | 'failed';
}

/**
 * Closed shapes put together, in order, back to front: Join makes them one outline; Cut out takes the later ones out of the first.
 * The result has the first one's id and look. A join of shapes that don't touch is one mark in separate parts.
 */
export function combineMarks(marks: Mark[], op: CombineOp): CombineResult {
    if (marks.length < 2 || !marks.every(isClosedShape)) return { ok: false, reason: 'failed' };
    const paths = marks.map(m => editableMark(m)!);
    let result = paths[0];
    let cutSomething = false;
    for (const next of paths.slice(1)) {
        const before = edgesOf(result).reduce((sum, loop) => sum + outlineArea(loop), 0);
        const loops = combineLoops(result, next, op);
        if (!loops) return { ok: false, reason: 'failed' };
        const real = loops.filter(loop => Math.abs(outlineArea(loop)) > 0.05);
        if (!real.length) return { ok: false, reason: 'nothing-left' };
        // Biggest first: it's the one whose points can be changed.
        real.sort((p, q) => Math.abs(outlineArea(q)) - Math.abs(outlineArea(p)));
        const [main, ...others] = real.map(loopNodes);
        const after: PathMark = { ...result, nodes: main, closed: true };
        delete after.more;
        if (others.length) after.more = others;
        const area = real.reduce((sum, loop) => sum + outlineArea(loop), 0);
        if (Math.abs(Math.abs(area) - Math.abs(before)) > 0.05) cutSomething = true;
        result = after;
    }
    if (op === 'cut' && !cutSomething) return { ok: false, reason: 'not-touching' };
    const { group, ...rest } = result;
    const sameGroup = !!marks[0].group && marks.every(m => m.group === marks[0].group);
    return { ok: true, mark: { ...rest, ...(sameGroup ? { group } : {}) } };
}
