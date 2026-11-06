// Opening an SVG file in <juel-shape-editor>. Two jobs:
//
// 1. Make it safe (`sanitiseSvg`): the editor draws the file inside the page, so anything that could run or fetch is
//    taken out and named: scripts, event attributes, links to outside files, embedded web content. Elements are checked
//    against a list of what's known to be only drawing.
// 2. Make it editable (`parseShapeSvg`): basic shapes and paths become marks. Whatever a mark can't say exactly (text,
//    pictures, filters, gradient fills, a path with holes) is kept word for word as a locked mark that moves as a whole,
//    so nothing in the file is lost without saying so.
import { editableMark, type Box, type Mark, type MarkStyle, type PathMark, type PathNode, type Pt, type ShapeDoc, type Dash } from './shapeModel';

export interface ShapeRead {
    doc: ShapeDoc;
    /** What was left out, in plain words; empty when nothing was. */
    notes: string[];
}

const SvgNs = 'http://www.w3.org/2000/svg';
const Drawn = new Set(['g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'tspan', 'textPath', 'image', 'use', 'svg', 'symbol']);
const Hoisted = new Set(['defs', 'style', 'linearGradient', 'radialGradient', 'pattern', 'clipPath', 'mask', 'marker', 'filter']);
const Parts = new Set(['stop', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);
const HiddenNotes = new Set(['title', 'desc', 'metadata']);
const Risky: Record<string, string> = { script: 'a script', foreignObject: 'embedded web content', iframe: 'embedded web content', object: 'embedded web content', embed: 'embedded web content', audio: 'embedded sound or video', video: 'embedded sound or video', animate: 'an animation', animateMotion: 'an animation', animateTransform: 'an animation', set: 'an animation' };

const SafeImage = /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i;
/** A `url(...)` that points at an outside file; `#id` and pictures in the file are fine. */
const OutsideUrl = /url\(\s*(['"]?)\s*(?!#|data:image\/)[^)]*\)/gi;

/** Takes out everything that could run or fetch, in place; returns what went, in plain words. */
export function sanitiseSvg(root: Element): string[] {
    const counts = { events: 0, outside: 0 };
    const named = new Set<string>();
    let hidden = false;
    const visit = (el: Element, isRoot = false) => {
        if (!isRoot) {
            const name = el.localName;
            if (el.namespaceURI !== SvgNs) {
                // Another program's own notes (Inkscape's and so on) draw nothing. An HTML element is named.
                if (el.namespaceURI === 'http://www.w3.org/1999/xhtml') named.add('embedded web content'); else hidden = true;
                el.remove();
                return;
            }
            if (name === 'a') {
                // A link around a drawing: the drawing stays, the link goes.
                counts.outside++;
                const g = el.ownerDocument.createElementNS(SvgNs, 'g');
                while (el.firstChild) g.appendChild(el.firstChild);
                el.replaceWith(g);
                visit(g);
                return;
            }
            if (HiddenNotes.has(name)) { hidden = true; el.remove(); return; }
            if (!Drawn.has(name) && !Hoisted.has(name) && !Parts.has(name)) {
                named.add(Risky[name] ?? `a part this editor doesn't know (${name})`);
                el.remove();
                return;
            }
        }
        for (const attr of [...el.attributes]) {
            const key = attr.name.toLowerCase();
            const value = attr.value.trim();
            if (key.startsWith('on')) { el.removeAttributeNode(attr); counts.events++; continue; }
            if (key === 'href' || key === 'xlink:href') {
                const fine = value.startsWith('#') || (el.localName === 'image' && SafeImage.test(value));
                if (!fine) { el.removeAttributeNode(attr); counts.outside++; }
                continue;
            }
            if (key === 'src' || key === 'action' || key === 'formaction' || key === 'xml:base') { el.removeAttributeNode(attr); counts.outside++; continue; }
            if (OutsideUrl.test(attr.value)) {
                OutsideUrl.lastIndex = 0;
                if (key === 'style') attr.value = attr.value.replace(OutsideUrl, () => { counts.outside++; return 'none'; });
                else { el.removeAttributeNode(attr); counts.outside++; }
            }
            OutsideUrl.lastIndex = 0;
            if (key === 'style' && /javascript:|expression\(|@import/i.test(attr.value)) { el.removeAttributeNode(attr); counts.events++; }
        }
        if (el.localName === 'style') {
            let css = el.textContent ?? '';
            css = css.replace(/@import[^;]*;?/gi, () => { counts.outside++; return ''; }).replace(OutsideUrl, () => { counts.outside++; return 'none'; });
            el.textContent = css;
        }
        for (const child of [...el.children]) visit(child);
    };
    visit(root, true);
    const notes = [...named].map(n => `Removed ${n}.`);
    if (counts.events) notes.push(`Removed ${counts.events === 1 ? 'an action' : `${counts.events} actions`} that would run on a click or on loading.`);
    if (counts.outside) notes.push(`Removed ${counts.outside === 1 ? 'a link' : `${counts.outside} links`} to outside files.`);
    if (hidden) notes.push('Left out its hidden title and notes, which don\'t show in the picture.');
    return notes;
}

// ---- transforms --------------------------------------------------------------------------

type Matrix = [number, number, number, number, number, number];
const Identity: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (m: Matrix, n: Matrix): Matrix => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, p: Pt): Pt => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });

export function parseTransform(text: string | null): Matrix {
    let out = Identity;
    if (!text) return out;
    for (const match of text.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)) {
        const v = match[2].trim().split(/[\s,]+/).map(Number);
        let m: Matrix = Identity;
        switch (match[1]) {
            case 'matrix': m = [v[0], v[1], v[2], v[3], v[4], v[5]]; break;
            case 'translate': m = [1, 0, 0, 1, v[0], v[1] ?? 0]; break;
            case 'scale': m = [v[0], 0, 0, v[1] ?? v[0], 0, 0]; break;
            case 'rotate': {
                const r = v[0] * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
                const turn: Matrix = [c, s, -s, c, 0, 0];
                m = v.length >= 3 ? multiply(multiply([1, 0, 0, 1, v[1], v[2]], turn), [1, 0, 0, 1, -v[1], -v[2]]) : turn;
                break;
            }
            case 'skewX': m = [1, 0, Math.tan(v[0] * Math.PI / 180), 1, 0, 0]; break;
            case 'skewY': m = [1, Math.tan(v[0] * Math.PI / 180), 0, 1, 0, 0]; break;
        }
        out = multiply(out, m);
    }
    return out;
}

// ---- path data -----------------------------------------------------------------------------

interface SubPath { nodes: PathNode[]; closed: boolean }

/** An arc as cubic curves (the SVG spec's endpoint-to-centre conversion). */
function arcToCubics(from: Pt, rxIn: number, ryIn: number, rotation: number, large: boolean, sweep: boolean, to: Pt): { c1: Pt; c2: Pt; end: Pt }[] {
    let rx = Math.abs(rxIn), ry = Math.abs(ryIn);
    if (!rx || !ry || (from.x === to.x && from.y === to.y)) return [{ c1: from, c2: to, end: to }];
    const phi = rotation * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
    const dx = (from.x - to.x) / 2, dy = (from.y - to.y) / 2;
    const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
    const lambda = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry);
    if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
    const sign = large === sweep ? -1 : 1;
    const top = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
    const co = sign * Math.sqrt(Math.max(0, top / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
    const cxp = co * rx * y1 / ry, cyp = -co * ry * x1 / rx;
    const cx = cos * cxp - sin * cyp + (from.x + to.x) / 2, cy = sin * cxp + cos * cyp + (from.y + to.y) / 2;
    const angle = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const start = angle(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
    let delta = angle((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
    if (!sweep && delta > 0) delta -= 2 * Math.PI;
    if (sweep && delta < 0) delta += 2 * Math.PI;
    const count = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
    const step = delta / count, k = 4 / 3 * Math.tan(step / 4);
    const point = (a: number, ox: number, oy: number): Pt => {
        const px = rx * (Math.cos(a) + ox), py = ry * (Math.sin(a) + oy);
        return { x: cx + cos * px - sin * py, y: cy + sin * px + cos * py };
    };
    const out: { c1: Pt; c2: Pt; end: Pt }[] = [];
    for (let i = 0; i < count; i++) {
        const a = start + i * step, b = a + step;
        out.push({ c1: point(a, -k * Math.sin(a), k * Math.cos(a)), c2: point(b, k * Math.sin(b), -k * Math.cos(b)), end: point(b, 0, 0) });
    }
    if (out.length) out[out.length - 1].end = to;
    return out;
}

/** A path's `d` as sub-paths of nodes; null when it can't be read. */
export function parsePathData(d: string): SubPath[] | null {
    const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
    if (!tokens) return null;
    const subs: SubPath[] = [];
    let current: SubPath | null = null;
    let at: Pt = { x: 0, y: 0 }, begin: Pt = { x: 0, y: 0 };
    let lastControl: Pt | null = null, lastCommand = '';
    let i = 0, command = '';
    const isCommand = (t: string | undefined) => !!t && /^[a-zA-Z]$/.test(t);
    const read = () => Number(tokens[i++]);
    // Arc flags can be written with no space after them ("a1 1 0 01.5 2"); the tokeniser reads those as one number.
    const readFlag = () => {
        const t = tokens[i];
        if (t === '0' || t === '1') { i++; return t === '1'; }
        if (t && /^[01]/.test(t)) { tokens[i] = t.slice(1); return t[0] === '1'; }
        i++;
        return false;
    };
    const ensure = () => { if (!current) { current = { nodes: [{ ...at }], closed: false }; subs.push(current); } return current; };
    const lineTo = (p: Pt) => { ensure().nodes.push({ ...p }); at = p; };
    const curveTo = (c1: Pt, c2: Pt, p: Pt) => {
        const sub = ensure();
        sub.nodes[sub.nodes.length - 1].out = { ...c1 };
        sub.nodes.push({ ...p, in: { ...c2 } });
        at = p;
    };
    while (i < tokens.length) {
        if (isCommand(tokens[i])) command = tokens[i++];
        else if (!command) return null;
        const rel = command === command.toLowerCase();
        const off = rel ? at : { x: 0, y: 0 };
        const type = command.toUpperCase();
        if (type !== 'Z' && i >= tokens.length) return null;
        switch (type) {
            case 'M': {
                const p = { x: read() + off.x, y: read() + off.y };
                current = { nodes: [{ ...p }], closed: false };
                subs.push(current);
                at = p; begin = p;
                command = rel ? 'l' : 'L';
                break;
            }
            case 'L': lineTo({ x: read() + off.x, y: read() + off.y }); break;
            case 'H': lineTo({ x: read() + off.x, y: at.y }); break;
            case 'V': lineTo({ x: at.x, y: read() + off.y }); break;
            case 'C': {
                const c1 = { x: read() + off.x, y: read() + off.y }, c2 = { x: read() + off.x, y: read() + off.y }, p = { x: read() + off.x, y: read() + off.y };
                curveTo(c1, c2, p);
                lastControl = c2;
                break;
            }
            case 'S': {
                const c1 = lastControl && /[CS]/.test(lastCommand) ? { x: 2 * at.x - lastControl.x, y: 2 * at.y - lastControl.y } : { ...at };
                const c2 = { x: read() + off.x, y: read() + off.y }, p = { x: read() + off.x, y: read() + off.y };
                curveTo(c1, c2, p);
                lastControl = c2;
                break;
            }
            case 'Q': case 'T': {
                const q = type === 'Q' ? { x: read() + off.x, y: read() + off.y }
                    : lastControl && /[QT]/.test(lastCommand) ? { x: 2 * at.x - lastControl.x, y: 2 * at.y - lastControl.y } : { ...at };
                const p = { x: read() + off.x, y: read() + off.y };
                curveTo({ x: at.x + 2 / 3 * (q.x - at.x), y: at.y + 2 / 3 * (q.y - at.y) }, { x: p.x + 2 / 3 * (q.x - p.x), y: p.y + 2 / 3 * (q.y - p.y) }, p);
                lastControl = q;
                break;
            }
            case 'A': {
                const rx = read(), ry = read(), rot = read(), large = readFlag(), sweep = readFlag();
                const p = { x: read() + off.x, y: read() + off.y };
                for (const c of arcToCubics(at, rx, ry, rot, large, sweep, p)) curveTo(c.c1, c.c2, c.end);
                break;
            }
            case 'Z': {
                if (current) {
                    const sub: SubPath = current;
                    sub.closed = true;
                    const first = sub.nodes[0], last = sub.nodes[sub.nodes.length - 1];
                    // Drawn back to its start: that point is the first one, not a second one on top of it.
                    if (sub.nodes.length > 1 && Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6) {
                        if (last.in) first.in = last.in;
                        sub.nodes.pop();
                    }
                }
                at = begin;
                current = null;
                break;
            }
            default: return null;
        }
        // A command cut short reads as not-a-number: the whole path is refused, not drawn wrong.
        if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) return null;
        lastCommand = type;
    }
    return subs;
}

// ---- reading the file ------------------------------------------------------------------------

/** How big a locked part draws. The browser can say; with no browser (tests), the caller's fallback. */
export type Measure = (markup: string, defs: string) => Box | null;

/** Draws it unseen for a moment and asks the browser its box. */
export const browserMeasure: Measure = (markup, defs) => {
    if (typeof document === 'undefined') return null;
    const host = document.createElementNS(SvgNs, 'svg') as SVGSVGElement;
    host.setAttribute('style', 'position:absolute;left:-99999px;top:0;width:10px;height:10px;visibility:hidden');
    host.innerHTML = `${defs}<g>${markup}</g>`;
    document.body.appendChild(host);
    try {
        const g = host.lastElementChild as SVGGElement | null;
        const box = g?.getBBox?.();
        return box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null;
    } catch { return null; } finally { host.remove(); }
};

interface Inherited { fill: string | null; stroke: string | null; width: string; dash: string | null; cap: string | null; join: string | null }
const DefaultInherited: Inherited = { fill: '#000000', stroke: null, width: '1', dash: null, cap: null, join: null };

/** A presentation property we can say exactly; anything else makes the part locked. */
const Harmless: Record<string, RegExp> = {
    'fill-rule': /^nonzero$/, 'fill-opacity': /^1(\.0*)?$/, 'stroke-opacity': /^1(\.0*)?$/, 'stroke-dashoffset': /^0(px)?$/, 'stroke-miterlimit': /./,
    'display': /^inline$/, 'visibility': /^visible$/, 'overflow': /./, 'paint-order': /^normal$/, 'vector-effect': /^none$/, 'mix-blend-mode': /^normal$/, 'clip-rule': /./, 'font-family': /./, 'font-size': /./, 'font-weight': /./,
};
const Geometry = new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points', 'd', 'pathLength']);
const Painted = new Set(['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity']);

/** The element's presentation, attributes and `style` together; null when something in it isn't simple. */
function presentation(el: Element, hasStyles: boolean): Record<string, string> | null {
    const out: Record<string, string> = {};
    for (const attr of [...el.attributes]) {
        const name = attr.name;
        if (name === 'class') { if (hasStyles) return null; continue; }
        if (name === 'id' || name === 'style' || name === 'transform' || name === 'version' || name === 'viewBox' || name === 'preserveAspectRatio' || name.startsWith('data-') || name.startsWith('xmlns') || name.includes(':') || Geometry.has(name)) continue;
        if (Painted.has(name)) { out[name] = attr.value.trim(); continue; }
        if (!Harmless[name]?.test(attr.value.trim())) return null;
    }
    const style = el.getAttribute('style');
    if (style) {
        for (const part of style.split(';')) {
            const at = part.indexOf(':');
            if (at < 0) continue;
            const key = part.slice(0, at).trim().toLowerCase(), value = part.slice(at + 1).trim();
            if (!key) continue;
            if (Painted.has(key)) out[key] = value;
            else if (key.startsWith('-') || !Harmless[key]?.test(value)) return null;
        }
    }
    return out;
}

function inherit(from: Inherited, p: Record<string, string>): Inherited | null {
    const paint = (v: string | undefined, was: string | null): string | null | undefined => {
        if (v === undefined || v === 'inherit') return was;
        if (v === 'none') return null;
        return /url\(/i.test(v) ? undefined : v;
    };
    const fill = paint(p['fill'], from.fill), stroke = paint(p['stroke'], from.stroke);
    if (fill === undefined || stroke === undefined) return null;
    return { fill, stroke, width: p['stroke-width'] ?? from.width, dash: p['stroke-dasharray'] ?? from.dash, cap: p['stroke-linecap'] ?? from.cap, join: p['stroke-linejoin'] ?? from.join };
}

const number = (el: Element, name: string, fallback = 0) => {
    const v = parseFloat(el.getAttribute(name) ?? '');
    return Number.isFinite(v) ? v : fallback;
};
const percentAttr = (el: Element, names: string[]) => names.some(n => /%|[a-df-z]$/i.test((el.getAttribute(n) ?? '').trim().replace(/px$/, '')));

/** The mark's style, in our terms; null when a mark couldn't draw it exactly. */
function markStyle(p: Inherited, opacityText: string | undefined, scale: number): (MarkStyle & { sharp?: boolean }) | null {
    const width = parseFloat(p.width);
    if (!/^[-+.\d]+(px)?$/.test(p.width.trim()) || !Number.isFinite(width)) return null;
    const opacity = opacityText === undefined ? 1 : parseFloat(opacityText);
    if (!Number.isFinite(opacity)) return null;
    let dash: Dash = 'solid';
    if (p.dash && p.dash !== 'none') {
        const parts = p.dash.trim().split(/[\s,]+/).map(Number);
        const near = (a: number, b: number) => Math.abs(a - b) < 0.01;
        if (parts.length === 2 && near(parts[0], width * 4) && near(parts[1], width * 3)) dash = 'dashed';
        else if (parts.length === 2 && near(parts[0], 0) && near(parts[1], width * 2)) dash = 'dotted';
        else return null;
    }
    const round = p.cap === 'round' && p.join === 'round';
    const plain = (p.cap === null || p.cap === 'butt') && (p.join === null || p.join === 'miter');
    if (p.stroke && !round && !plain) return null;
    return { fill: p.fill, stroke: p.stroke, width: Math.round(width * scale * 1000) / 1000, dash, opacity, ...(p.stroke && !round ? { sharp: true } : {}) };
}

/** Is this a turn and an even scale, nothing skewed or mirrored? */
function similarity(m: Matrix): { scale: number; angle: number } | null {
    const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
    if (Math.abs(sx - sy) > 1e-3 * Math.max(sx, 1) || Math.abs(m[0] * m[2] + m[1] * m[3]) > 1e-3 || m[0] * m[3] - m[1] * m[2] <= 0) return null;
    return { scale: sx, angle: Math.atan2(m[1], m[0]) * 180 / Math.PI };
}

const clean = (markup: string) => markup.replace(/ xmlns(:\w+)?="[^"]*"/g, '');

const applyToNode = (matrix: Matrix) => (n: PathNode): PathNode => ({ ...apply(matrix, n), ...(n.in ? { in: apply(matrix, n.in) } : {}), ...(n.out ? { out: apply(matrix, n.out) } : {}) });

const applyToPath = (m: PathMark, matrix: Matrix): PathMark => ({
    ...m,
    nodes: m.nodes.map(applyToNode(matrix)),
    ...(m.more ? { more: m.more.map(nodes => nodes.map(applyToNode(matrix))) } : {}),
});

/**
 * Reads an SVG file: safe, with its shapes as marks and the rest locked. `measure` says how big a locked part draws
 * (the browser's own measure by default). A file that can't be read as SVG comes back empty with a note saying so.
 */
export function parseShapeSvg(text: string, measure: Measure = browserMeasure): ShapeRead {
    const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
    const root = parsed.documentElement;
    if (!root || root.localName !== 'svg' || parsed.querySelector('parsererror')) return { doc: { marks: [] }, notes: ['This file couldn\'t be read as a drawing.'] };
    const notes = sanitiseSvg(root);
    const marks: Mark[] = [];
    const defs: string[] = [];
    const hasStyles = !!root.querySelector('style');
    let nextId = 1, nextGroup = 1;
    const id = () => `m${nextId++}`;
    const serialise = (el: Element) => clean(new XMLSerializer().serializeToString(el));
    const fileBox = (): Box => {
        const v = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
        if (v.length === 4 && v.every(Number.isFinite)) return { x: v[0], y: v[1], w: v[2], h: v[3] };
        return { x: 0, y: 0, w: number(root, 'width', 100), h: number(root, 'height', 100) };
    };

    /** Word for word, moving as a whole, with what it was inheriting and its parents' transform around it. */
    const lock = (el: Element, matrix: Matrix, from: Inherited, group?: string) => {
        const attrs: string[] = [];
        if (matrix !== Identity && matrix.some((v, i) => v !== Identity[i])) attrs.push(`transform="matrix(${matrix.join(' ')})"`);
        if (from.fill !== DefaultInherited.fill) attrs.push(`fill="${from.fill ?? 'none'}"`);
        if (from.stroke) attrs.push(`stroke="${from.stroke}"`, `stroke-width="${from.width}"`);
        const inner = serialise(el);
        const markup = attrs.length ? `<g ${attrs.join(' ')}>${inner}</g>` : inner;
        const box = measure(markup, defs.join('')) ?? fileBox();
        const natural = box.w > 0 && box.h > 0 ? box : { x: box.x, y: box.y, w: Math.max(box.w, 1), h: Math.max(box.h, 1) };
        marks.push({ kind: 'locked', id: id(), fill: null, stroke: null, width: 0, dash: 'solid', opacity: 1, markup, natural, ...natural, ...(group ? { group } : {}) });
    };

    /** A locked part this editor wrote: its box is in its transform, so it doesn't nest deeper with every save. */
    const readLocked = (el: Element, group?: string): boolean => {
        const t = el.getAttribute('transform') ?? '';
        const found = t.match(/^(?:rotate\(([-\d.e]+) [-\d.e]+ [-\d.e]+\) )?translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+) ([-\d.e]+)\)$/);
        if (!found) return false;
        const markup = [...el.childNodes].map(n => new XMLSerializer().serializeToString(n)).map(clean).join('');
        const natural = measure(markup, defs.join(''));
        if (!natural) return false;
        const [rot, tx, ty, sx, sy] = [found[1] ?? '0', found[2], found[3], found[4], found[5]].map(Number);
        const w = Math.abs(sx) * natural.w, h = Math.abs(sy) * natural.h;
        const originX = tx + natural.x * sx, originY = ty + natural.y * sy;
        const opacity = parseFloat(el.getAttribute('opacity') ?? '1');
        marks.push({
            kind: 'locked', id: id(), fill: null, stroke: null, width: 0, dash: 'solid', opacity: Number.isFinite(opacity) ? opacity : 1, markup, natural,
            x: sx < 0 ? originX - w : originX, y: sy < 0 ? originY - h : originY, w, h,
            ...(rot ? { rotation: rot } : {}), ...(sx < 0 ? { flipX: true } : {}), ...(sy < 0 ? { flipY: true } : {}), ...(group ? { group } : {}),
        });
        return true;
    };

    /** A basic shape or path as marks; false when it has to be locked instead. */
    const readShape = (el: Element, matrix: Matrix, style: MarkStyle & { sharp?: boolean }, group: string | undefined, arrow = false): boolean => {
        const common = { ...style, ...(group ? { group } : {}) };
        const name = el.localName;
        const push = (mark: Mark) => { marks.push(mark); };
        const path = (nodes: PathNode[], closed: boolean) => push(applyToPath({ kind: 'path', id: id(), ...common, nodes, closed, ...(arrow ? { arrow } : {}) }, matrix));
        if (name === 'rect' || name === 'circle' || name === 'ellipse') {
            if (percentAttr(el, ['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r'])) return false;
            const isRect = name === 'rect';
            const box: Box = isRect ? { x: number(el, 'x'), y: number(el, 'y'), w: number(el, 'width'), h: number(el, 'height') }
                : name === 'circle' ? { x: number(el, 'cx') - number(el, 'r'), y: number(el, 'cy') - number(el, 'r'), w: number(el, 'r') * 2, h: number(el, 'r') * 2 }
                    : { x: number(el, 'cx') - number(el, 'rx'), y: number(el, 'cy') - number(el, 'ry'), w: number(el, 'rx') * 2, h: number(el, 'ry') * 2 };
            let radius = 0;
            if (isRect && (el.hasAttribute('rx') || el.hasAttribute('ry'))) {
                const rx = number(el, 'rx', number(el, 'ry')), ry = number(el, 'ry', number(el, 'rx'));
                if (Math.abs(rx - ry) > 1e-6) return false;
                radius = rx;
            }
            const base: Mark = { kind: isRect ? 'rect' : 'ellipse', id: id(), ...common, ...box, ...(radius ? { radius } : {}) };
            const even = similarity(matrix);
            if (even) {
                const c = apply(matrix, { x: box.x + box.w / 2, y: box.y + box.h / 2 });
                const w = box.w * even.scale, h = box.h * even.scale;
                const out: Mark = { ...base, x: c.x - w / 2, y: c.y - h / 2, w, h, ...(radius ? { radius: radius * even.scale } : {}), ...(Math.abs(even.angle) > 1e-3 ? { rotation: even.angle } : {}) } as Mark;
                push(out);
                return true;
            }
            const asPath = editableMark(base)!;
            push(applyToPath(asPath, matrix));
            return true;
        }
        if (name === 'line') {
            if (percentAttr(el, ['x1', 'y1', 'x2', 'y2'])) return false;
            path([{ x: number(el, 'x1'), y: number(el, 'y1') }, { x: number(el, 'x2'), y: number(el, 'y2') }], false);
            return true;
        }
        if (name === 'polyline' || name === 'polygon') {
            const v = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number);
            if (v.length < 4 || v.some(n => !Number.isFinite(n))) return false;
            const nodes: PathNode[] = [];
            for (let i = 0; i + 1 < v.length; i += 2) nodes.push({ x: v[i], y: v[i + 1] });
            path(nodes, name === 'polygon');
            return true;
        }
        if (name === 'path') {
            const subs = (parsePathData(el.getAttribute('d') ?? '') ?? []).filter(s => s.nodes.length > 1);
            if (!subs.length) return false;
            // This editor's own Join or Cut out: one mark with several outlines.
            if (subs.length > 1 && el.getAttribute('data-shape') === 'holes' && subs.every(s => s.closed)) {
                push(applyToPath({ kind: 'path', id: id(), ...common, nodes: subs[0].nodes, closed: true, more: subs.slice(1).map(s => s.nodes) }, matrix));
                return true;
            }
            // Several pieces can only come apart when no fill depends on them together (holes).
            if (subs.length > 1 && style.fill) return false;
            const together = subs.length > 1 && !group ? `g-p${nextGroup++}` : group;
            for (const s of subs) push(applyToPath({ kind: 'path', id: id(), ...common, ...(together ? { group: together } : {}), nodes: s.nodes, closed: s.closed, ...(arrow ? { arrow } : {}) }, matrix));
            return true;
        }
        return false;
    };

    const walk = (el: Element, matrix: Matrix, from: Inherited, group?: string) => {
        for (const child of [...el.children]) {
            const name = child.localName;
            if (Hoisted.has(name)) { if (name === 'defs') { if (child.children.length) defs.push(serialise(child)); } else defs.push(`<defs>${serialise(child)}</defs>`); continue; }
            if (name === 'symbol') { defs.push(`<defs>${serialise(child)}</defs>`); continue; }
            const shape = child.getAttribute('data-shape');
            if (shape === 'locked' && readLocked(child, group)) continue;
            const here = presentation(child, hasStyles);
            const next = here && inherit(from, here);
            if (!here || !next) { lock(child, matrix, from, group); continue; }
            const own = multiply(matrix, parseTransform(child.getAttribute('transform')));
            if (name === 'g') {
                if (shape === 'arrow') {
                    const line = [...child.children].find(c => c.localName === 'line' || c.localName === 'path');
                    const linePres = line && presentation(line, hasStyles);
                    const lineFrom = linePres && inherit(next, linePres);
                    const style = lineFrom && markStyle(lineFrom, here['opacity'], Math.sqrt(Math.abs(own[0] * own[3] - own[1] * own[2])));
                    if (line && style && readShape(line, own, { ...style, fill: null }, group, true)) continue;
                    lock(child, matrix, from, group);
                    continue;
                }
                // Opacity on a group is the group's own: spreading it over overlapping parts would change the look.
                if (here['opacity'] !== undefined && parseFloat(here['opacity']) !== 1) { lock(child, matrix, from, group); continue; }
                walk(child, own, next, shape === 'group' && !group ? `g-f${nextGroup++}` : group);
                continue;
            }
            if (name === 'text' || name === 'image' || name === 'use' || name === 'svg' || !Drawn.has(name)) { lock(child, matrix, from, group); continue; }
            const scaleX = Math.hypot(own[0], own[1]), scaleY = Math.hypot(own[2], own[3]);
            const uneven = Math.abs(scaleX - scaleY) > 1e-3 * Math.max(scaleX, 1);
            const style = markStyle(next, here['opacity'], Math.sqrt(scaleX * scaleY));
            if (!style || (uneven && next.stroke) || !readShape(child, own, style, group)) lock(child, matrix, from, group);
        }
    };

    const rootPres = presentation(root, hasStyles) ?? {};
    const rootFrom = inherit(DefaultInherited, rootPres) ?? DefaultInherited;
    walk(root, Identity, rootFrom);
    return { doc: { marks, ...(defs.length ? { defs: defs.join('') } : {}) }, notes };
}
