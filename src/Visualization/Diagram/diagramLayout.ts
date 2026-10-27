// Layout, as pure functions: a Diagram in, boxes and edges in diagram units (px at scale 1) out.
// `<juel-diagram>` draws the result as SVG and scales it to its box; the editor reads it to know
// what was clicked. Text is measured by an average character width (there's no DOM here), which
// is why boxes carry their wrapped lines: the drawing uses the same lines, so nothing overflows.
//
//   process  — a row (or column) of equal steps with arrows, wrapping past `options.wrap` per row
//   org      — a tidy tree: children centred under their parent, siblings apart, a long row of
//              leaves stacked in a column; `direction: across` turns it on its side
//   timeline — a line with markers, labels alternating above and below
//   flowchart — the nodes where they are, links as orthogonal elbows between the nearest sides
import type { Diagram, DiagramNode, DiagramType, FlowShape } from './diagramModel';

export interface Point { x: number; y: number }

export interface DiagramBox {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    /** The text, wrapped to the box; then the detail, smaller. */
    lines: string[];
    detailLines: string[];
    shape: FlowShape;
    /** The node's own colour, else undefined (the drawing picks by `depth`). */
    colour?: string;
    icon?: string;
    /** org: 0 at the top; process / timeline: the index; flowchart: 0. */
    depth: number;
    /** timeline: the marker's label. */
    date?: string;
}

export interface DiagramEdge {
    from: string;
    to: string;
    /** A polyline, first point on `from`'s edge, last on `to`'s. */
    points: Point[];
    label?: string;
    /** Where the label sits (the middle of the longest segment). */
    labelAt?: Point;
    arrow: boolean;
}

export interface DiagramLayout {
    type: DiagramType;
    width: number;
    height: number;
    boxes: DiagramBox[];
    edges: DiagramEdge[];
    /** timeline: the axis line. */
    axis?: { x1: number; y1: number; x2: number; y2: number };
    /** timeline: a marker on the axis per node, with the node's id. */
    markers?: { id: string; x: number; y: number }[];
    title?: string;
    /** Where the title is drawn (above everything). */
    titleAt?: Point;
}

/** What the layout assumes about the drawing: tweak through `layoutDiagram`'s second argument. */
export interface LayoutMetrics {
    fontSize: number;
    detailFontSize: number;
    /** Average glyph width as a fraction of the font size. */
    charWidth: number;
    lineHeight: number;
    padding: number;
    gap: number;
    minBoxWidth: number;
    maxBoxWidth: number;
    margin: number;
    titleHeight: number;
}

export const DefaultMetrics: LayoutMetrics = {
    fontSize: 15, detailFontSize: 12, charWidth: 0.56, lineHeight: 1.3, padding: 12, gap: 36,
    minBoxWidth: 110, maxBoxWidth: 200, margin: 16, titleHeight: 36,
};

/** Wraps `text` to lines of at most `maxChars` characters (a longer word is cut). */
export function wrapText(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/)) {
        let line = '';
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            let w = word;
            while (w.length > maxChars) { if (line) { lines.push(line); line = ''; } lines.push(w.slice(0, maxChars)); w = w.slice(maxChars); }
            if (line && line.length + 1 + w.length > maxChars) { lines.push(line); line = w; }
            else line = line ? `${line} ${w}` : w;
        }
        lines.push(line);
    }
    while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines;
}

/** The width `text` takes at `fontSize`, by the average glyph width. */
export function textWidth(text: string, fontSize: number, m: LayoutMetrics = DefaultMetrics): number {
    return text.length * fontSize * m.charWidth;
}

/** The box a node needs: its text wrapped to the widest line allowed, the detail under it. */
export function measureNode(node: DiagramNode, m: LayoutMetrics = DefaultMetrics, fixed?: { w?: number; h?: number }): { w: number; h: number; lines: string[]; detailLines: string[] } {
    const inner = (fixed?.w ?? m.maxBoxWidth) - 2 * m.padding;
    const maxChars = Math.max(4, Math.floor(inner / (m.fontSize * m.charWidth)));
    const maxDetailChars = Math.max(4, Math.floor(inner / (m.detailFontSize * m.charWidth)));
    const lines = wrapText(node.text || ' ', maxChars);
    const detailLines = node.detail ? wrapText(node.detail, maxDetailChars) : [];
    const widest = Math.max(...lines.map(l => textWidth(l, m.fontSize, m)), ...detailLines.map(l => textWidth(l, m.detailFontSize, m)), 0);
    const iconWidth = node.icon ? m.fontSize * 1.4 : 0;
    const w = fixed?.w ?? Math.min(m.maxBoxWidth, Math.max(m.minBoxWidth, Math.ceil(widest + iconWidth + 2 * m.padding)));
    const h = fixed?.h ?? Math.ceil(lines.length * m.fontSize * m.lineHeight + detailLines.length * m.detailFontSize * m.lineHeight + 2 * m.padding + (detailLines.length ? 4 : 0));
    return { w, h, lines, detailLines };
}

/** The layout for `diagram`. Never throws on a valid diagram (see `parseDiagram`). */
export function layoutDiagram(diagram: Diagram, metrics: Partial<LayoutMetrics> = {}): DiagramLayout {
    const m: LayoutMetrics = { ...DefaultMetrics, ...metrics };
    let layout: DiagramLayout;
    switch (diagram.type) {
        case 'process': layout = layoutProcess(diagram, m); break;
        case 'org': layout = layoutOrg(diagram, m); break;
        case 'timeline': layout = layoutTimeline(diagram, m); break;
        case 'flowchart': layout = layoutFlowchart(diagram, m); break;
    }
    return finish(layout, diagram, m);
}

/** Shifts everything inside the margin (and under the title), and sets the size. */
function finish(layout: DiagramLayout, diagram: Diagram, m: LayoutMetrics): DiagramLayout {
    const top = diagram.title ? m.titleHeight : 0;
    const xs = layout.boxes.flatMap(b => [b.x, b.x + b.w]).concat(layout.edges.flatMap(e => e.points.map(p => p.x)), layout.axis ? [layout.axis.x1, layout.axis.x2] : []);
    const ys = layout.boxes.flatMap(b => [b.y, b.y + b.h]).concat(layout.edges.flatMap(e => e.points.map(p => p.y)), layout.axis ? [layout.axis.y1, layout.axis.y2] : []);
    const minX = Math.min(...xs, 0), minY = Math.min(...ys, 0);
    const dx = m.margin - minX, dy = m.margin + top - minY;
    const shift = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy });
    for (const b of layout.boxes) { b.x += dx; b.y += dy; }
    for (const e of layout.edges) { e.points = e.points.map(shift); if (e.labelAt) e.labelAt = shift(e.labelAt); }
    if (layout.axis) layout.axis = { x1: layout.axis.x1 + dx, y1: layout.axis.y1 + dy, x2: layout.axis.x2 + dx, y2: layout.axis.y2 + dy };
    if (layout.markers) layout.markers = layout.markers.map(k => ({ id: k.id, ...shift(k) }));
    const maxX = Math.max(...xs) + dx, maxY = Math.max(...ys) + dy;
    layout.width = Math.ceil(maxX + m.margin);
    layout.height = Math.ceil(maxY + m.margin);
    if (diagram.title) { layout.title = diagram.title; layout.titleAt = { x: layout.width / 2, y: m.margin + m.titleHeight / 2 }; }
    return layout;
}

function box(node: DiagramNode, x: number, y: number, size: ReturnType<typeof measureNode>, depth: number, shape: FlowShape = 'box'): DiagramBox {
    const b: DiagramBox = { id: node.id, x, y, w: size.w, h: size.h, lines: size.lines, detailLines: size.detailLines, shape, depth };
    if (node.colour) b.colour = node.colour;
    if (node.icon) b.icon = node.icon;
    if (node.date !== undefined) b.date = node.date;
    return b;
}

const centre = (b: DiagramBox): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** The middle of the longest segment: where a label goes. */
function labelPoint(points: Point[]): Point {
    let best = points[0], length = -1;
    for (let i = 1; i < points.length; i++) {
        const l = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        if (l > length) { length = l; best = { x: (points[i].x + points[i - 1].x) / 2, y: (points[i].y + points[i - 1].y) / 2 }; }
    }
    return best;
}

function edge(from: string, to: string, points: Point[], label?: string): DiagramEdge {
    const e: DiagramEdge = { from, to, points, arrow: true };
    if (label) { e.label = label; e.labelAt = labelPoint(points); }
    return e;
}

// ---- process ------------------------------------------------------------------------------

function layoutProcess(d: Diagram, m: LayoutMetrics): DiagramLayout {
    const across = (d.options?.direction ?? 'across') === 'across';
    const perRow = across ? Math.max(1, d.options?.wrap ?? 5) : Number.MAX_SAFE_INTEGER;
    const sizes = d.nodes.map(n => measureNode(n, m));
    // Equal steps: every box the size of the biggest.
    const w = Math.max(...sizes.map(s => s.w)), h = Math.max(...sizes.map(s => s.h));
    const boxes: DiagramBox[] = [];
    d.nodes.forEach((n, i) => {
        const row = Math.floor(i / perRow), col = i % perRow;
        const x = across ? col * (w + m.gap) : 0;
        const y = across ? row * (h + m.gap * 1.5) : i * (h + m.gap);
        boxes.push(box(n, x, y, { ...sizes[i], w, h }, i, 'rounded'));
    });
    const edges: DiagramEdge[] = [];
    for (let i = 1; i < boxes.length; i++) {
        const a = boxes[i - 1], b = boxes[i];
        if (!across) edges.push(edge(a.id, b.id, [{ x: a.x + a.w / 2, y: a.y + a.h }, { x: b.x + b.w / 2, y: b.y }]));
        else if (a.y === b.y) edges.push(edge(a.id, b.id, [{ x: a.x + a.w, y: a.y + a.h / 2 }, { x: b.x, y: b.y + b.h / 2 }]));
        else {
            // A row break: down from the last step, back along the gap, down into the first of the next row.
            const midY = a.y + a.h + m.gap * 0.75;
            edges.push(edge(a.id, b.id, [{ x: a.x + a.w / 2, y: a.y + a.h }, { x: a.x + a.w / 2, y: midY }, { x: b.x + b.w / 2, y: midY }, { x: b.x + b.w / 2, y: b.y }]));
        }
    }
    for (const l of d.links ?? []) edges.push(extraLink(boxes, l.from, l.to, l.label));
    return { type: 'process', width: 0, height: 0, boxes, edges };
}

/** An extra `links` entry on a type that lays itself out: routed like a flowchart link. */
function extraLink(boxes: DiagramBox[], from: string, to: string, label?: string): DiagramEdge {
    const a = boxes.find(b => b.id === from)!, b = boxes.find(b => b.id === to)!;
    return edge(from, to, routeOrthogonal(a, b), label);
}

// ---- org ----------------------------------------------------------------------------------

interface TreeNode { node: DiagramNode; children: TreeNode[]; size: ReturnType<typeof measureNode>; span: number; stacked: boolean }

function layoutOrg(d: Diagram, m: LayoutMetrics): DiagramLayout {
    const across = d.options?.direction === 'across';
    const byId = new Map<string, TreeNode>();
    for (const n of d.nodes) byId.set(n.id, { node: n, children: [], size: measureNode(n, m), span: 0, stacked: false });
    const roots: TreeNode[] = [];
    for (const n of d.nodes) {
        const t = byId.get(n.id)!;
        if (n.parent !== undefined && byId.has(n.parent)) byId.get(n.parent)!.children.push(t); else roots.push(t);
    }
    // Equal boxes per depth look tidier: every box the widest of the chart. On its side
    // (`across`), the tree is laid out in a transposed space (a box "wide" by its real
    // height) and the swap at the end puts every box back at its real size.
    const realW = Math.max(...d.nodes.map(n => byId.get(n.id)!.size.w)), realH = Math.max(...d.nodes.map(n => byId.get(n.id)!.size.h));
    const w = across ? realH : realW, h = across ? realW : realH;
    const stackGap = m.gap * 0.4, stackIndent = m.gap * 0.6;
    const measure = (t: TreeNode): number => {
        if (!t.children.length) { t.span = w; return t.span; }
        // Many leaves under one manager stack in a column (a long row would push everything apart).
        t.stacked = t.children.length > 4 && t.children.every(c => !c.children.length);
        if (t.stacked) { t.span = w + stackIndent; return t.span; }
        t.span = t.children.reduce((s, c) => s + measure(c), 0) + m.gap * (t.children.length - 1);
        t.span = Math.max(t.span, w);
        return t.span;
    };
    const boxes: DiagramBox[] = [], edges: DiagramEdge[] = [];
    const levelGap = m.gap * 1.4;
    const place = (t: TreeNode, left: number, top: number, depth: number): { box: DiagramBox; used: number } => {
        // Returns the box and the height used below `top` (stacked columns run deeper than one level).
        if (!t.children.length) {
            const b = box(t.node, left + (t.span - w) / 2, top, { ...t.size, w, h }, depth, 'box');
            boxes.push(b);
            return { box: b, used: h };
        }
        if (t.stacked) {
            const x = left;
            const b = box(t.node, x, top, { ...t.size, w, h }, depth, 'box');
            boxes.push(b);
            let y = top + h + stackGap * 1.5;
            const trunkX = x + stackIndent / 2;
            for (const c of t.children) {
                const cb = box(c.node, x + stackIndent, y, { ...c.size, w, h }, depth + 1, 'box');
                boxes.push(cb);
                edges.push({ from: t.node.id, to: c.node.id, points: [{ x: trunkX, y: top + h }, { x: trunkX, y: y + h / 2 }, { x: cb.x, y: y + h / 2 }], arrow: false });
                y += h + stackGap;
            }
            return { box: b, used: y - stackGap - top };
        }
        // The children first (each in its own span), then the parent centred between the first and last.
        const childTop = top + h + levelGap;
        const busY = top + h + levelGap / 2;
        let cx = left + (t.span - (t.children.reduce((s, c) => s + c.span, 0) + m.gap * (t.children.length - 1))) / 2;
        let deepest = h;
        const placed: DiagramBox[] = [];
        for (const c of t.children) {
            const r = place(c, cx, childTop, depth + 1);
            placed.push(r.box);
            deepest = Math.max(deepest, h + levelGap + r.used);
            cx += c.span + m.gap;
        }
        const first = placed[0], last = placed[placed.length - 1];
        const x = Math.min(Math.max((first.x + first.w / 2 + last.x + last.w / 2) / 2 - w / 2, left), left + t.span - w);
        const b = box(t.node, x, top, { ...t.size, w, h }, depth, 'box');
        boxes.push(b);
        for (const cb of placed)
            edges.push({ from: t.node.id, to: cb.id, points: [{ x: x + w / 2, y: top + h }, { x: x + w / 2, y: busY }, { x: cb.x + cb.w / 2, y: busY }, { x: cb.x + cb.w / 2, y: cb.y }], arrow: false });
        return { box: b, used: deepest };
    };
    let left = 0;
    for (const r of roots) { measure(r); place(r, left, 0, 0); left += r.span + m.gap * 2; }
    for (const l of d.links ?? []) edges.push(extraLink(boxes, l.from, l.to, l.label));
    if (across) {
        // On its side: swap x and y (the tree then reads left to right).
        for (const b of boxes) { [b.x, b.y, b.w, b.h] = [b.y, b.x, b.h, b.w]; }
        for (const e of edges) { e.points = e.points.map(p => ({ x: p.y, y: p.x })); if (e.labelAt) e.labelAt = { x: e.labelAt.y, y: e.labelAt.x }; }
    }
    return { type: 'org', width: 0, height: 0, boxes, edges };
}

// ---- timeline -----------------------------------------------------------------------------

function layoutTimeline(d: Diagram, m: LayoutMetrics): DiagramLayout {
    const sizes = d.nodes.map(n => measureNode(n, m));
    const w = Math.max(...sizes.map(s => s.w)), h = Math.max(...sizes.map(s => s.h));
    // Markers every `step` along the line; labels alternate above and below, so neighbours
    // never touch even when the boxes are wider than the step.
    const step = Math.max(w / 2 + m.gap / 2, m.gap * 2.5);
    const lineY = h + m.gap + m.fontSize; // room above for the first (top) label and its date
    const boxes: DiagramBox[] = [], markers: { id: string; x: number; y: number }[] = [], edges: DiagramEdge[] = [];
    d.nodes.forEach((n, i) => {
        const x = m.gap + i * step;
        const above = i % 2 === 0;
        const y = above ? lineY - m.gap - h : lineY + m.gap;
        boxes.push(box(n, x - w / 2, y, { ...sizes[i], w, h }, i, 'box'));
        markers.push({ id: n.id, x, y: lineY });
        edges.push({ from: n.id, to: n.id, points: [{ x, y: lineY }, { x, y: above ? y + h : y }], arrow: false });
    });
    const last = m.gap + (d.nodes.length - 1) * step;
    const axis = { x1: 0, y1: lineY, x2: last + m.gap, y2: lineY };
    for (const l of d.links ?? []) edges.push(extraLink(boxes, l.from, l.to, l.label));
    return { type: 'timeline', width: 0, height: 0, boxes, edges, axis, markers };
}

// ---- flowchart ----------------------------------------------------------------------------

/** Default sizes per shape (a decision's diamond needs more room for the same text). */
export const FlowDefaults: Record<FlowShape, { w: number; h: number }> = {
    'box': { w: 150, h: 60 }, 'rounded': { w: 150, h: 60 }, 'decision': { w: 160, h: 90 }, 'start-end': { w: 140, h: 50 },
};

function layoutFlowchart(d: Diagram, m: LayoutMetrics): DiagramLayout {
    const boxes: DiagramBox[] = [];
    let autoX = 0, autoY = 0, autoRow = 0;
    d.nodes.forEach(n => {
        const shape = n.shape ?? 'box';
        const dflt = FlowDefaults[shape];
        const w = n.w ?? dflt.w, h = n.h ?? dflt.h;
        // A decision's text sits in the diamond's middle half; a start-end pill loses its round ends.
        const inner = shape === 'decision' ? { w: w * 0.6, h: h * 0.5 } : shape === 'start-end' ? { w: w - h / 2, h } : { w, h };
        const size = measureNode(n, { ...m, padding: m.padding * 0.75 }, { w: inner.w, h: inner.h });
        let x = n.x, y = n.y;
        if (x === undefined || y === undefined) {
            // Not placed: a grid, four to a row, under anything placed.
            const placedBottom = boxes.reduce((b, p) => Math.max(b, p.y + p.h), 0);
            x = autoX; y = Math.max(autoY, placedBottom + (boxes.length ? m.gap : 0));
            autoX += FlowDefaults.box.w + m.gap; autoRow++;
            if (autoRow === 4) { autoRow = 0; autoX = 0; autoY = y + FlowDefaults.decision.h + m.gap; }
        }
        boxes.push(box(n, x, y, { ...size, w, h }, 0, shape));
    });
    const edges: DiagramEdge[] = [];
    for (const l of d.links ?? []) {
        const a = boxes.find(b => b.id === l.from)!, b = boxes.find(b => b.id === l.to)!;
        edges.push(edge(l.from, l.to, a === b ? selfLoop(a, m) : routeOrthogonal(a, b), l.label));
    }
    return { type: 'flowchart', width: 0, height: 0, boxes, edges };
}

/** A link from a node to itself: out of the right side, round, into the top. */
function selfLoop(a: DiagramBox, m: LayoutMetrics): Point[] {
    const r = m.gap / 2;
    return [{ x: a.x + a.w, y: a.y + a.h / 2 }, { x: a.x + a.w + r, y: a.y + a.h / 2 }, { x: a.x + a.w + r, y: a.y - r }, { x: a.x + a.w * 0.75, y: a.y - r }, { x: a.x + a.w * 0.75, y: a.y }];
}

/**
 * An orthogonal route between the nearest sides of two boxes: straight when they line up,
 * else an elbow (two bends) through the middle of the gap between them.
 */
export function routeOrthogonal(a: DiagramBox, b: DiagramBox): Point[] {
    const ca = centre(a), cb = centre(b);
    const dx = cb.x - ca.x, dy = cb.y - ca.y;
    const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
    const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
    const horizontal = gapX >= 0 && (gapY < 0 || gapX >= gapY);
    if (horizontal) {
        const right = dx > 0;
        const x1 = right ? a.x + a.w : a.x, x2 = right ? b.x : b.x + b.w;
        if (Math.abs(dy) < 1) return [{ x: x1, y: ca.y }, { x: x2, y: cb.y }];
        const midX = (x1 + x2) / 2;
        return [{ x: x1, y: ca.y }, { x: midX, y: ca.y }, { x: midX, y: cb.y }, { x: x2, y: cb.y }];
    }
    const down = dy > 0;
    const y1 = down ? a.y + a.h : a.y, y2 = down ? b.y : b.y + b.h;
    if (gapY < 0) {
        // Overlapping in both axes (or touching): leave by the side facing the other box.
        const right = dx >= 0;
        return [{ x: right ? a.x + a.w : a.x, y: ca.y }, { x: cb.x, y: ca.y }, { x: cb.x, y: down ? b.y : b.y + b.h }];
    }
    if (Math.abs(dx) < 1) return [{ x: ca.x, y: y1 }, { x: cb.x, y: y2 }];
    const midY = (y1 + y2) / 2;
    return [{ x: ca.x, y: y1 }, { x: ca.x, y: midY }, { x: cb.x, y: midY }, { x: cb.x, y: y2 }];
}

/** True when two boxes overlap (touching edges don't count). */
export function boxesOverlap(a: DiagramBox, b: DiagramBox): boolean {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
