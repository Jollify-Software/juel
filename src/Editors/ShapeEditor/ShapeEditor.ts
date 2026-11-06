// <juel-shape-editor>: draw a shape the way you would in Paint, and get a real SVG. Press, drag, there's your
// shape. Every mark stays a separate object you can select and change later, so the fill tool recolours the
// mark you click and the eraser removes whole marks, or, if asked, part of a line. See the README beside this file.
//
// `value` is an SVG file's text in ('' starts a blank drawing); `svg` is the drawing as a tidy file; `shape-changed`
// ({ reason }) reports every edit; `notes` says what opening `value` had to leave out. Undo/redo is HistoryController with
// no limit, one entry per gesture. Pointer Events throughout, so mouse, pen and touch all work.
import { CSSResultGroup, html, LitElement, nothing, svg, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import Styles from 'bundle-text:./ShapeEditor.less';
import { HistoryController } from '../../_Base/HistoryController';
import { trackDrag } from '../Handles/handleShared';
import '../../Buttons/Button/Button';
import '../Colour/Colour';
import '../Number/Number';
import '../Select/Select';
import '../Text/Text';
import {
    boxCentre, boxesTouch, boxFromDrag, boxOfPoints, cloneDoc, copyMarks, DefaultStyle, distance, editableMark, emptyDoc, fitMarks, flipMarks, freshId, groupMarks, groupOf,
    handleSide, Handles, insertPoint, lockAngle, markBox, markMarkup, markPaintBox, marksBox, markWorldBox, movePoint, moveBend, moveMark, pencilPath,
    pathData, polygonPoints, removePoint, reorderMarks, resizeMark, rotateMarks, rotatePoint, shapeToSvg, starPoints, trianglePoints, ungroupMarks, unionBoxes,
    type Box, type Dash, type Handle, type Mark, type MarkStyle, type PathMark, type PathNode, type Pt, type ShapeDoc,
} from './shapeModel';
import { combineMarks, isClosedShape, outlinesToNodes, rubOutPath, traceOutlines, type CombineOp } from './shapeOps';
import { presetNodes, Presets } from './shapePresets';
import { parseShapeSvg } from './shapeSvg';

export type ShapeTool = 'select' | 'points' | 'pencil' | 'line' | 'arrow' | 'rect' | 'rounded' | 'ellipse' | 'triangle' | 'polygon' | 'star' | 'preset' | 'words' | 'curve' |'fill' | 'dropper' | 'eraser' | 'hand';

interface ToolInfo { tool: ShapeTool; glyph: string; key: string; title: string; hint: string }

/** The tools, in the rail's order. The tooltip names the key; the hint is what the status line says while it's on. */
const Tools: ToolInfo[] = [
    { tool: 'select', glyph: 'lucide-mouse-pointer-2', key: 'v', title: 'Select', hint: 'Click a mark to pick it, or drag across several. Drag to move it, use the handles to resize or turn it. Double-click to change its points.' },
    { tool: 'points', glyph: 'lucide-waypoints', key: 'n', title: 'Change points', hint: 'Click a mark, then drag its points. Double-click its line to add a point; Delete removes the picked point.' },
    { tool: 'pencil', glyph: 'lucide-pencil', key: 'p', title: 'Pencil', hint: 'Press and draw. Finish where you started and it closes, so you can fill it.' },
    { tool: 'line', glyph: 'lucide-minus', key: 'l', title: 'Line', hint: 'Press and drag. Hold Shift for straight or at 45°.' },
    { tool: 'arrow', glyph: 'lucide-arrow-up-right', key: 'a', title: 'Arrow', hint: 'Press and drag from tail to tip. Hold Shift for straight or at 45°.' },
    { tool: 'rect', glyph: 'lucide-square', key: 'r', title: 'Rectangle', hint: 'Press and drag. Hold Shift for a square, Alt to draw from the middle.' },
    { tool: 'rounded', glyph: 'lucide-square-round-corner', key: 'u', title: 'Rounded rectangle', hint: 'Press and drag. Hold Shift for a square, Alt to draw from the middle.' },
    { tool: 'ellipse', glyph: 'lucide-circle', key: 'e', title: 'Circle or oval', hint: 'Press and drag. Hold Shift for a circle, Alt to draw from the middle.' },
    { tool: 'triangle', glyph: 'lucide-triangle', key: 't', title: 'Triangle', hint: 'Press and drag. Hold Shift to keep it even, Alt to draw from the middle.' },
    { tool: 'polygon', glyph: 'lucide-hexagon', key: 'y', title: 'Many-sided shape', hint: 'Press and drag. Choose how many sides above. Hold Shift to keep it even, Alt to draw from the middle.' },
    { tool: 'star', glyph: 'lucide-star', key: 's', title: 'Star', hint: 'Press and drag. Choose how many points above. Hold Shift to keep it even, Alt to draw from the middle.' },
    { tool: 'preset', glyph: 'lucide-shapes', key: 'k', title: 'Ready-made shapes', hint: 'Choose a shape above: a heart, a speech bubble, arrows and more. Press and drag. Hold Shift to keep it even, Alt to draw from the middle.' },
    { tool: 'words', glyph: 'lucide-type', key: 'w', title: 'Words', hint: 'Type your words above, then click where they go, or drag to set their size. They become a shape: you can colour them, but not retype them.' },
    { tool: 'curve', glyph: 'lucide-spline', key: 'c', title: 'Curve', hint: 'Click for each point, drag for a bend. Double-click or Enter to finish; click the first point to close it. Backspace takes the last point off.' },
    { tool: 'fill', glyph: 'lucide-paint-bucket', key: 'f', title: 'Fill', hint: 'Click a mark to give it the fill colour (a line takes the line colour).' },
    { tool: 'dropper', glyph: 'lucide-pipette', key: 'i', title: 'Copy colours', hint: 'Click a mark to copy its colours and line.' },
    { tool: 'eraser', glyph: 'lucide-eraser', key: 'x', title: 'Eraser', hint: 'Click or drag over a mark to remove the whole mark. To rub out only part of a line, choose that above.' },
    { tool: 'hand', glyph: 'lucide-hand', key: 'h', title: 'Move the view', hint: 'Drag to move the view. Hold Space to do this with any tool; Ctrl and the mouse wheel zoom.' },
];
const DrawTools = new Set<ShapeTool>(['line', 'arrow', 'rect', 'rounded', 'ellipse', 'triangle', 'polygon', 'star', 'preset', 'words']);
const WordFonts: Record<string, string> = {
    plain: 'system-ui, sans-serif', 'plain-bold': 'bold system-ui, sans-serif', book: 'Georgia, serif', 'book-bold': 'bold Georgia, serif',
    typewriter: 'ui-monospace, monospace', handwriting: 'cursive',
};
const WordFontChoices = [
    { text: 'Plain', value: 'plain' }, { text: 'Plain, bold', value: 'plain-bold' }, { text: 'Book', value: 'book' }, { text: 'Book, bold', value: 'book-bold' },
    { text: 'Typewriter', value: 'typewriter' }, { text: 'Handwriting', value: 'handwriting' },
];
/** Words are drawn this tall to follow their edges: bigger is smoother, and they'd rarely be shown bigger. */
const WordPixels = 480;
/** How tall words are when you click rather than drag. */
const WordsClickHeight = 60;
const DashChoices = [{ text: 'Solid', value: 'solid' }, { text: 'Dashed', value: 'dashed' }, { text: 'Dotted', value: 'dotted' }];
const PresetChoices = Presets.map(p => ({ text: p.name, value: p.id }));
const EraseChoices = [{ text: 'Whole marks', value: 'whole' }, { text: 'Part of a line', value: 'part' }];
const RubHint = 'Drag along a line to rub out what you cross: the rest stays, in pieces. A filled shape stays whole: take its fill away first, or use Cut out.';
const GridStep = 10;
const MinZoom = 0.1, MaxZoom = 8;
const RecentCount = 8;
/** A second press this soon and this near is a double-click (ours, so a pen and a finger get one too). */
const DoubleMs = 500, DoublePx = 6;
const fatHit = 12;
const HandleCursors: Record<Handle, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

@customElement('juel-shape-editor')
export class JuelShapeEditor extends LitElement {
    static styles?: CSSResultGroup = unsafeCSS(Styles);

    /** An SVG file's text to open ('' or unset: a blank drawing). */
    @property({ attribute: false }) value?: string;
    /** The tool in use. */
    @property({ reflect: true }) tool: ShapeTool = 'pencil';

    @state() private doc: ShapeDoc = emptyDoc();
    @state() private selected: string[] = [];
    @state() private pen: MarkStyle = { ...DefaultStyle };
    @state() private sides = 6;
    @state() private points = 5;
    @state() private preset = Presets[0].id;
    @state() private words = '';
    @state() private wordFont = 'plain';
    /** The eraser takes part of a line, not the whole mark. */
    @state() private rubPart = false;
    @state() private rubSize = 20;
    /** Where the eraser's circle is, while it takes part of a line. */
    @state() private rubAt: Pt | null = null;
    @state() private draft: Mark | null = null;
    @state() private marquee: Box | null = null;
    /** The curve being placed, and where the pointer is for the line to the next point. */
    @state() private curve: { nodes: PathNode[]; hover: Pt | null } | null = null;
    @state() private pointsId: string | null = null;
    @state() private pointIndex: number | null = null;
    @state() private grid = false;
    @state() private zoom = 1;
    @state() private panX = 0;
    @state() private panY = 0;
    @state() private size = { w: 800, h: 500 };
    @state() private recent: string[] = [];
    @state() private spaceDown = false;
    @state() private panning = false;
    @state() private notice = '';
    @query('svg.canvas') private canvas?: SVGSVGElement;
    @query('.stage') private stage?: HTMLElement;

    private history?: HistoryController<ShapeDoc>;
    private adopted?: string;
    private observer?: ResizeObserver;
    private clipboard: Mark[] = [];
    private pasteCount = 0;
    private styleTimer?: ReturnType<typeof setTimeout>;
    private lastDown: { at: number; x: number; y: number } | null = null;
    private lastFill = DefaultStyle.fill!;
    private lastStroke = DefaultStyle.stroke!;
    private toolBeforeDropper: ShapeTool = 'select';
    /** Shift or Alt changing during a drag: redraw with the pointer where it is. */
    private redraw?: (shift: boolean, alt: boolean) => void;
    private fitPending = false;
    private openNotes: string[] = [];
    private frozenHits: string | null = null;
    private traced?: { key: string; loops: Pt[][] };

    /** The drawing as a tidy SVG file. */
    get svg(): string { this.flushStyle(); return shapeToSvg(this.doc); }
    /** The marks as they stand (a copy). */
    get drawing(): ShapeDoc { return cloneDoc(this.doc); }
    /** Nothing drawn yet. */
    get empty(): boolean { return !this.doc.marks.length; }
    /** What opening `value` had to leave out, in plain words; empty when nothing. */
    get notes(): string[] { return [...this.openNotes]; }
    /** The keys work from the drawing area, so focus goes there (a modal's `autofocus` calls this). */
    override focus(options?: FocusOptions) { this.stage?.focus(options); }

    /**
     * The drawing as a PNG with a see-through background, for somewhere an SVG won't go. `scale` is how many pixels to one
     * drawing unit; the long side stops at 4096. Rejects if the browser can't draw it.
     */
    async toPng(scale = 2): Promise<Blob> {
        const text = this.svg;
        const size = text.match(/width="(\d+)" height="(\d+)"/);
        const w = Number(size?.[1] ?? 100), h = Number(size?.[2] ?? 100);
        const k = Math.min(scale, 4096 / Math.max(w, h));
        const image = new Image();
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * k));
        canvas.height = Math.max(1, Math.round(h * k));
        canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
        return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The picture could not be made.')), 'image/png'));
    }

    override connectedCallback() {
        super.connectedCallback();
        if (!this.history) this.history = new HistoryController<ShapeDoc>(this, cloneDoc(this.doc), { limit: 0, apply: v => this.applyHistory(v), equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
    }

    override disconnectedCallback() {
        this.observer?.disconnect();
        this.observer = undefined;
        clearTimeout(this.styleTimer);
        super.disconnectedCallback();
    }

    override firstUpdated() { this.watchSize(); }

    private watchSize() {
        if (!this.stage || this.observer) return;
        this.observer = new ResizeObserver(() => {
            // Inside its border: the same size as the canvas, so one unit is one pixel at 100%.
            const { clientWidth: w, clientHeight: h } = this.stage!;
            if (!w || !h) return;
            this.size = { w, h };
            if (this.fitPending) { this.fitPending = false; this.fit(); }
        });
        this.observer.observe(this.stage);
    }

    override willUpdate(changed: Map<string, unknown>) {
        if (changed.has('value') && this.value !== this.adopted) {
            this.adopted = this.value;
            this.open(this.value ?? '');
        }
    }

    override updated() { if (this.isConnected) this.watchSize(); }

    /** Starts again on a file's text: nothing to undo. */
    private open(text: string) {
        const read = text.trim() ? parseShapeSvg(text) : { doc: emptyDoc(), notes: [] };
        this.doc = read.doc;
        this.openNotes = read.notes;
        this.selected = [];
        this.pointsId = null;
        this.pointIndex = null;
        this.draft = null;
        this.curve = null;
        this.history?.reseed(cloneDoc(read.doc));
        if (read.doc.marks.length) { this.tool = 'select'; this.fitPending = true; this.fit(); }
    }

    // ---- the model ----------------------------------------------------------------------

    private applyHistory(v: ShapeDoc) {
        this.doc = cloneDoc(v);
        const ids = new Set(this.doc.marks.map(m => m.id));
        this.selected = this.selected.filter(id => ids.has(id));
        if (this.pointsId && !ids.has(this.pointsId)) { this.pointsId = null; this.pointIndex = null; }
        this.pointIndex = null;
        this.fire('history');
    }

    /** One gesture: the drawing changes and one history entry is written. */
    private commit(next: ShapeDoc, reason: string) {
        this.flushStyle();
        this.doc = this.keepDefs(next);
        this.history?.record(cloneDoc(this.doc));
        this.fire(reason);
    }

    /** During a gesture: the drawing changes, the history doesn't yet. */
    private preview(next: ShapeDoc) {
        this.doc = this.keepDefs(next);
        this.history?.preview(cloneDoc(this.doc));
    }

    /** Every edit passes marks only: an opened file's gradients and styles stay, or the locked parts using them would lose them. */
    private keepDefs(next: ShapeDoc): ShapeDoc {
        return this.doc.defs && !next.defs ? { ...next, defs: this.doc.defs } : next;
    }

    /** A gesture given up (a pointer cancelled): back to the last entry. */
    private cancelPreview() {
        this.history?.discardPreview();
        if (this.history) this.doc = cloneDoc(this.history.present);
    }

    private fire(reason: string) {
        this.dispatchEvent(new CustomEvent('shape-changed', { detail: { reason }, bubbles: true, composed: true }));
    }

    undo() { this.flushStyle(); this.finishCurve(false); if (this.history?.canUndo) this.history.undo(); }
    redo() { this.flushStyle(); if (this.history?.canRedo) this.history.redo(); }

    private markById(id: string | null): Mark | undefined { return id ? this.doc.marks.find(m => m.id === id) : undefined; }
    private get selectedMarks(): Mark[] { const set = new Set(this.selected); return this.doc.marks.filter(m => set.has(m.id)); }
    private usedIds() { return this.doc.marks.map(m => m.id); }
    private usedGroups() { return this.doc.marks.map(m => m.group ?? '').filter(Boolean); }

    /** Style for a new mark, or for what's picked. Colours and line changes are one undo step until a short pause. */
    private setStyle(patch: Partial<MarkStyle>) {
        this.pen = { ...this.pen, ...patch };
        if (patch.fill) this.lastFill = patch.fill;
        if (patch.stroke) this.lastStroke = patch.stroke;
        for (const colour of [patch.fill, patch.stroke]) if (colour) this.recent = [colour, ...this.recent.filter(c => c !== colour)].slice(0, RecentCount);
        if (!this.selected.length) return;
        const set = new Set(this.selected);
        const next = cloneDoc(this.doc);
        next.marks = next.marks.map(m => {
            if (!set.has(m.id)) return m;
            if (m.kind !== 'locked') return { ...m, ...patch };
            return patch.opacity === undefined ? m : { ...m, opacity: patch.opacity };
        });
        this.preview(next);
        clearTimeout(this.styleTimer);
        this.styleTimer = setTimeout(() => this.flushStyle(), 350);
    }

    private styleDirty() { return this.styleTimer !== undefined; }

    private flushStyle() {
        if (!this.styleDirty()) return;
        clearTimeout(this.styleTimer);
        this.styleTimer = undefined;
        this.history?.record(cloneDoc(this.doc));
        this.fire('style');
    }

    /** The style to show: what's picked, or what the next mark will have. */
    private get shownStyle(): MarkStyle {
        const m = this.selectedMarks.find(x => x.kind !== 'locked');
        return m ? { fill: m.fill, stroke: m.stroke, width: m.width, dash: m.dash, opacity: m.opacity } : this.pen;
    }

    // ---- the view ----------------------------------------------------------------------

    private world(e: { clientX: number; clientY: number }): Pt {
        const ctm = this.canvas?.getScreenCTM();
        if (!ctm) return { x: e.clientX, y: e.clientY };
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    }

    private snap(p: Pt): Pt {
        if (!this.grid) return p;
        return { x: Math.round(p.x / GridStep) * GridStep, y: Math.round(p.y / GridStep) * GridStep };
    }

    private setZoom(zoom: number, about?: { clientX: number; clientY: number }) {
        const next = Math.max(MinZoom, Math.min(MaxZoom, zoom));
        const box = this.canvas?.getBoundingClientRect();
        const client = about ?? (box ? { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 } : { clientX: 0, clientY: 0 });
        const before = this.world(client);
        const px = client.clientX - (box?.left ?? 0), py = client.clientY - (box?.top ?? 0);
        this.zoom = next;
        this.panX = before.x - px / next;
        this.panY = before.y - py / next;
    }

    /** The whole drawing in view, no bigger than 100% unless it's tiny. */
    fit() {
        if (!this.doc.marks.length) { this.zoom = 1; this.panX = 0; this.panY = 0; return; }
        const b = unionBoxes(this.doc.marks.map(markPaintBox));
        const margin = 40;
        const zoom = Math.max(MinZoom, Math.min(2, (this.size.w - margin * 2) / (b.w || 1), (this.size.h - margin * 2) / (b.h || 1)));
        this.zoom = zoom;
        this.panX = b.x + b.w / 2 - this.size.w / zoom / 2;
        this.panY = b.y + b.h / 2 - this.size.h / zoom / 2;
    }

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) this.setZoom(this.zoom * Math.exp(-e.deltaY * 0.002), e);
        else { this.panX += (e.shiftKey ? e.deltaY : e.deltaX) / this.zoom; this.panY += (e.shiftKey ? 0 : e.deltaY) / this.zoom; }
    };

    private startPan(e: PointerEvent) {
        e.preventDefault();
        const start = { x: e.clientX, y: e.clientY, panX: this.panX, panY: this.panY };
        this.panning = true;
        trackDrag(e, this.stage!, m => {
            this.panX = start.panX - (m.clientX - start.x) / this.zoom;
            this.panY = start.panY - (m.clientY - start.y) / this.zoom;
        }, () => { this.panning = false; });
    }

    // ---- choosing a tool ---------------------------------------------------------------

    /** Changes tool: a curve in progress is finished, and picks don't carry into a drawing tool. */
    setTool(tool: ShapeTool) {
        if (tool === this.tool) return;
        this.finishCurve(true);
        this.flushStyle();
        if (tool === 'dropper') this.toolBeforeDropper = this.tool;
        this.tool = tool;
        this.notice = '';
        this.rubAt = null;
        if (tool !== 'points') { this.pointsId = null; this.pointIndex = null; }
        if (tool !== 'select' && tool !== 'points') this.selected = [];
        if (tool === 'points' && this.selected.length === 1) { this.pointsId = this.selected[0]; this.pointIndex = null; }
        // The keyboard goes to the words: letters would otherwise choose tools.
        if (tool === 'words') void this.updateComplete.then(() => (this.renderRoot.querySelector('juel-text.words-text') as HTMLElement | null)?.shadowRoot?.querySelector('input')?.focus());
    }

    /** The words as outlines, from a hidden canvas; none when there are no words, or nothing to see in them. */
    private wordOutlines(): Pt[][] {
        const text = this.words.trim();
        if (!text) return [];
        const key = `${this.wordFont}|${text}`;
        if (this.traced?.key === key) return this.traced.loops;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        const font = WordFonts[this.wordFont] ?? WordFonts.plain;
        const fontAt = (px: number) => { const bold = font.startsWith('bold '); return `${bold ? 'bold ' : ''}${px}px ${bold ? font.slice(5) : font}`; };
        context.font = fontAt(WordPixels);
        // A long line is drawn smaller rather than past what a canvas can hold.
        const px = Math.min(WordPixels, Math.floor(WordPixels * 12000 / Math.max(1, context.measureText(text).width)));
        const pad = Math.ceil(px * 0.3);
        context.font = fontAt(px);
        canvas.width = Math.ceil(context.measureText(text).width) + pad * 2;
        canvas.height = Math.ceil(px * 1.6);
        context.font = fontAt(px); // Setting a canvas's size clears its settings.
        context.textBaseline = 'alphabetic';
        context.fillText(text, pad, Math.ceil(px * 1.15));
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const alpha = new Uint8Array(canvas.width * canvas.height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
        const loops = traceOutlines(alpha, canvas.width, canvas.height, 0.4, 2);
        this.traced = { key, loops };
        return loops;
    }

    /** A closed mark of the words, in the box. They take the fill colour (or the line's, with no fill), and no line of their own. */
    private wordsMark(box: Box, loops = this.wordOutlines()): PathMark {
        return { id: freshId(this.usedIds()), ...this.pen, fill: this.pen.fill ?? this.pen.stroke ?? DefaultStyle.fill, stroke: null, kind: 'path', closed: true, ...outlinesToNodes(loops, box) };
    }

    // ---- pointer gestures --------------------------------------------------------------

    private hitAt(target: EventTarget | null): string | null {
        return (target as Element | null)?.closest?.('[data-id]')?.getAttribute('data-id') ?? null;
    }

    private onDown = (e: PointerEvent) => {
        if (e.button === 1 || (e.button === 0 && (this.spaceDown || this.tool === 'hand'))) { this.startPan(e); return; }
        if (e.button !== 0) return;
        e.preventDefault();
        this.stage?.focus({ preventScroll: true });
        this.flushStyle();
        this.notice = '';
        this.freezeHits(e);
        const again = !!this.lastDown && Date.now() - this.lastDown.at < DoubleMs && Math.hypot(e.clientX - this.lastDown.x, e.clientY - this.lastDown.y) < DoublePx;
        this.lastDown = again ? null : { at: Date.now(), x: e.clientX, y: e.clientY };
        const t = this.tool;
        if (t === 'pencil') this.startPencil(e);
        else if (DrawTools.has(t)) this.startDraw(e);
        else if (t === 'curve') this.curveDown(e, again);
        else if (t === 'select') this.selectDown(e, again);
        else if (t === 'points') this.pointsDown(e, again);
        else if (t === 'fill') this.fillAt(this.hitAt(e.target));
        else if (t === 'dropper') this.dropperAt(this.hitAt(e.target));
        else if (t === 'eraser') { if (this.rubPart) this.startRub(e); else this.startErase(e); }
    };

    /**
     * The invisible marks the pointer finds stay as they are until it's let go. A finger's events belong to the element it
     * pressed: redrawn under it mid-drag, that element would be gone and the browser would call the drag off.
     */
    private freezeHits(e: PointerEvent) {
        this.frozenHits = this.doc.marks.map(m => this.hitMarkup(m)).join('');
        const release = (u: PointerEvent) => {
            if (u.pointerId !== e.pointerId) return;
            window.removeEventListener('pointerup', release, true);
            window.removeEventListener('pointercancel', release, true);
            this.frozenHits = null;
            this.requestUpdate();
        };
        window.addEventListener('pointerup', release, true);
        window.addEventListener('pointercancel', release, true);
    }

    private onMove = (e: PointerEvent) => {
        if (this.curve) this.curve = { ...this.curve, hover: this.snap(this.world(e)) };
        if (this.tool === 'eraser' && this.rubPart) this.rubAt = this.world(e);
    };

    /** The mark a drawing tool makes for a drag from `a` to `b`. */
    private markFor(tool: ShapeTool, a: Pt, b: Pt, shift: boolean, alt: boolean): Mark {
        const base = { id: freshId(this.usedIds()), ...this.pen };
        if (tool === 'line' || tool === 'arrow') {
            const end = shift ? lockAngle(a, b) : b;
            return { ...base, kind: 'path', nodes: [{ x: a.x, y: a.y }, { x: end.x, y: end.y }], closed: false, ...(tool === 'arrow' ? { arrow: true } : {}), fill: null };
        }
        const box = boxFromDrag(a, b, { square: shift, fromCentre: alt });
        if (tool === 'preset') return { ...base, kind: 'path', nodes: presetNodes(this.preset, box), closed: true };
        if (tool === 'words') return this.wordsMark(box);
        if (tool === 'rect') return { ...base, kind: 'rect', ...box };
        if (tool === 'rounded') return { ...base, kind: 'rect', ...box, radius: Math.round(Math.min(box.w, box.h) * 0.18) };
        if (tool === 'ellipse') return { ...base, kind: 'ellipse', ...box };
        const pts = tool === 'triangle' ? trianglePoints(box) : tool === 'polygon' ? polygonPoints(box, this.sides) : starPoints(box, this.points);
        return { ...base, kind: 'path', nodes: pts, closed: true };
    }

    /** Line, arrow and the shapes: press, drag, there's your shape. */
    private startDraw(e: PointerEvent) {
        const tool = this.tool;
        const a = this.snap(this.world(e));
        if (tool === 'words') {
            const loops = this.wordOutlines();
            if (!loops.length) { this.notice = 'Type your words in the box above first.'; return; }
            const size = boxOfPoints(loops.flat());
            const click: Box = { x: a.x, y: a.y, w: size.w * WordsClickHeight / size.h, h: WordsClickHeight };
            let far = a;
            trackDrag(e, this.stage!, m => {
                far = this.snap(this.world(m));
                if (distance(a, far) * this.zoom >= 3) this.draft = this.wordsMark(boxFromDrag(a, far, { fromCentre: m.altKey }), loops);
            }, up => {
                const dragged = this.draft;
                this.draft = null;
                if (up.type === 'pointercancel') return;
                this.commit({ marks: [...this.doc.marks, (dragged as PathMark | null) ?? this.wordsMark(click, loops)] }, 'draw');
            }, 'crosshair');
            return;
        }
        let b = a, shift = e.shiftKey, alt = e.altKey;
        const build = () => { this.draft = this.markFor(tool, a, b, shift, alt); };
        this.redraw = (s, al) => { shift = s; alt = al; build(); };
        trackDrag(e, this.stage!, m => {
            b = this.snap(this.world(m));
            shift = m.shiftKey;
            alt = m.altKey;
            build();
        }, up => {
            this.redraw = undefined;
            const mark = this.draft;
            this.draft = null;
            // A press with no drag makes nothing: there's no size to give it.
            if (!mark || up.type === 'pointercancel' || distance(a, b) * this.zoom < 3) return;
            this.commit({ marks: [...this.doc.marks, mark] }, 'draw');
        }, 'crosshair');
    }

    private startPencil(e: PointerEvent) {
        const points: Pt[] = [this.world(e)];
        const show = () => {
            this.draft = { id: 'draft', ...this.pen, fill: null, kind: 'path', nodes: points, closed: false };
        };
        show();
        trackDrag(e, this.stage!, m => {
            const events = m.getCoalescedEvents?.() ?? [];
            for (const c of events.length ? events : [m]) points.push(this.world(c));
            show();
        }, up => {
            this.draft = null;
            if (up.type === 'pointercancel') return;
            const { nodes, closed } = pencilPath(points, 1.2 / this.zoom, 10 / this.zoom);
            if (!nodes.length) return;
            const mark: PathMark = { id: freshId(this.usedIds()), ...this.pen, fill: closed ? this.pen.fill : null, kind: 'path', nodes, closed };
            this.commit({ marks: [...this.doc.marks, mark] }, 'draw');
        }, 'crosshair');
    }

    // ---- the curve --------------------------------------------------------------------

    private curveDown(e: PointerEvent, again: boolean) {
        const at = this.snap(this.world(e));
        const nodes = this.curve?.nodes ?? [];
        if (again && nodes.length >= 2) { this.finishCurve(true); return; }
        if (nodes.length >= 2 && distance(at, nodes[0]) * this.zoom < 10) { this.finishCurve(true, true); return; }
        const index = nodes.length;
        this.curve = { nodes: [...nodes, { x: at.x, y: at.y }], hover: at };
        // Drag from here for a bend: the handle follows the pointer and its twin mirrors it.
        trackDrag(e, this.stage!, m => {
            const p = this.world(m);
            if (distance(p, at) * this.zoom < 4 || !this.curve) return;
            const next = [...this.curve.nodes];
            next[index] = { x: at.x, y: at.y, out: { x: p.x, y: p.y }, in: { x: 2 * at.x - p.x, y: 2 * at.y - p.y } };
            this.curve = { nodes: next, hover: p };
        }, () => { /* the point stays; the next press carries on */ }, 'crosshair');
    }

    /** Ends the curve: as a mark (`keep`, with 2 points or more), or dropped. */
    private finishCurve(keep: boolean, close = false) {
        const curve = this.curve;
        if (!curve) return;
        this.curve = null;
        if (!keep || curve.nodes.length < 2) return;
        const mark: PathMark = { id: freshId(this.usedIds()), ...this.pen, fill: close ? this.pen.fill : null, kind: 'path', nodes: curve.nodes, closed: close };
        this.commit({ marks: [...this.doc.marks, mark] }, 'draw');
    }

    // ---- select, move, resize, turn -----------------------------------------------------

    private selectDown(e: PointerEvent, again: boolean) {
        const target = e.target as Element;
        const handle = target.closest?.('[data-handle]')?.getAttribute('data-handle') as Handle | null;
        if (handle) { this.startResize(e, handle); return; }
        if (target.closest?.('[data-rotate]')) { this.startRotate(e); return; }
        const id = this.hitAt(target);
        if (!id) {
            if (!e.shiftKey) this.selected = [];
            this.startMarquee(e);
            return;
        }
        const whole = groupOf(this.doc, id);
        const already = this.selected.includes(id);
        if (e.shiftKey) {
            this.selected = already ? this.selected.filter(s => !whole.includes(s)) : [...this.selected, ...whole];
            if (already) return;
        } else if (!already) this.selected = whole;
        this.startMove(e, id, already && !e.shiftKey, again && !e.shiftKey);
    }

    /** A double-click on a mark goes to its points. Only once the second press is let go without moving: a quick click and drag is a move. */
    private openPoints(id: string) {
        const mark = this.markById(id);
        if (mark?.kind === 'locked') { this.notice = 'This part of the file can\'t be changed point by point: it moves and resizes as a whole.'; return; }
        this.selected = [id];
        this.setTool('points');
    }

    private startMove(e: PointerEvent, id: string, reduceOnClick: boolean, again: boolean) {
        const set = new Set(this.selected);
        const start = cloneDoc(this.doc);
        const box = marksBox(start.marks.filter(m => set.has(m.id)));
        const from = this.world(e);
        let moved = false;
        trackDrag(e, this.stage!, m => {
            const p = this.world(m);
            let dx = p.x - from.x, dy = p.y - from.y;
            if (!moved && Math.hypot(dx, dy) * this.zoom < 3) return;
            moved = true;
            if (m.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
            if (this.grid) {
                const corner = this.snap({ x: box.x + dx, y: box.y + dy });
                dx = corner.x - box.x;
                dy = corner.y - box.y;
            }
            this.preview({ marks: start.marks.map(k => set.has(k.id) ? moveMark(k, dx, dy) : k) });
        }, up => {
            if (up.type === 'pointercancel') { if (moved) this.cancelPreview(); return; }
            if (moved) this.commit(this.doc, 'move');
            else if (again) this.openPoints(id);
            else if (reduceOnClick) this.selected = groupOf(this.doc, id);
        });
    }

    private startMarquee(e: PointerEvent) {
        const from = this.world(e);
        const base = [...this.selected];
        trackDrag(e, this.stage!, m => {
            const p = this.world(m);
            this.marquee = boxFromDrag(from, p);
        }, up => {
            const box = this.marquee;
            this.marquee = null;
            if (!box || up.type === 'pointercancel') return;
            const hits = this.doc.marks.filter(k => boxesTouch(box, markWorldBox(k))).flatMap(k => groupOf(this.doc, k.id));
            this.selected = [...new Set([...base, ...hits])];
        }, 'crosshair');
    }

    private startResize(e: PointerEvent, handle: Handle) {
        const set = new Set(this.selected);
        const start = cloneDoc(this.doc);
        const marks = start.marks.filter(m => set.has(m.id));
        const single = marks.length === 1 ? marks[0] : null;
        const box = marksBox(marks);
        const [hx, hy] = handleSide(handle);
        let changed = false;
        const apply = (pointer: Pt, shift: boolean, alt: boolean) => {
            changed = true;
            if (single) {
                const next = resizeMark(single, handle, pointer, { keepRatio: shift, fromCentre: alt });
                this.preview({ marks: start.marks.map(k => k.id === single.id ? next : k) });
                return;
            }
            // Several: the far side of their box stays put, and they fit into the new box.
            const anchor = { x: box.x + box.w * (1 - hx), y: box.y + box.h * (1 - hy) };
            let w = hx === 0.5 ? box.w : Math.max(1, Math.abs(pointer.x - anchor.x));
            let h = hy === 0.5 ? box.h : Math.max(1, Math.abs(pointer.y - anchor.y));
            if (shift && box.w && box.h) { const s = Math.max(w / box.w, h / box.h); w = box.w * s; h = box.h * s; }
            const to: Box = { x: hx === 0 ? anchor.x - w : hx === 1 ? anchor.x : box.x + (box.w - w) / 2, y: hy === 0 ? anchor.y - h : hy === 1 ? anchor.y : box.y + (box.h - h) / 2, w, h };
            const fitted = new Map(fitMarks(marks, box, to).map(k => [k.id, k]));
            this.preview({ marks: start.marks.map(k => fitted.get(k.id) ?? k) });
        };
        let last = this.world(e);
        this.redraw = (s, a) => apply(last, s, a);
        trackDrag(e, this.stage!, m => {
            last = this.snap(this.world(m));
            apply(last, m.shiftKey, m.altKey);
        }, up => {
            this.redraw = undefined;
            if (up.type === 'pointercancel') { if (changed) this.cancelPreview(); return; }
            if (changed) this.commit(this.doc, 'resize');
        }, HandleCursors[handle]);
    }

    private startRotate(e: PointerEvent) {
        const set = new Set(this.selected);
        const start = cloneDoc(this.doc);
        const marks = start.marks.filter(m => set.has(m.id));
        const about = marks.length === 1 ? boxCentre(markBox(marks[0])) : boxCentre(marksBox(marks));
        const angleOf = (p: Pt) => Math.atan2(p.y - about.y, p.x - about.x) * 180 / Math.PI;
        const from = angleOf(this.world(e));
        let changed = false;
        trackDrag(e, this.stage!, m => {
            let by = angleOf(this.world(m)) - from;
            if (m.shiftKey) by = Math.round(by / 15) * 15;
            changed = true;
            const turned = new Map(rotateMarks(marks, about, by).map(k => [k.id, k]));
            this.preview({ marks: start.marks.map(k => turned.get(k.id) ?? k) });
        }, up => {
            if (up.type === 'pointercancel') { if (changed) this.cancelPreview(); return; }
            if (changed) this.commit(this.doc, 'rotate');
        });
    }

    // ---- points -------------------------------------------------------------------------

    private pointsDown(e: PointerEvent, again: boolean) {
        const target = e.target as Element;
        const current = this.pointsId ? this.markById(this.pointsId) : undefined;
        const editable = current ? editableMark(current) : null;
        const pointAt = target.closest?.('[data-point]')?.getAttribute('data-point');
        const bendAt = target.closest?.('[data-bend]');
        if (editable && bendAt) {
            this.startBend(e, editable, Number(bendAt.getAttribute('data-node')), bendAt.getAttribute('data-bend') as 'in' | 'out');
            return;
        }
        if (editable && pointAt !== undefined && pointAt !== null) {
            const index = Number(pointAt);
            this.pointIndex = index;
            this.startPoint(e, editable, index);
            return;
        }
        if (editable && again) {
            const added = insertPoint(editable, this.world(e), 12 / this.zoom);
            if (added) {
                this.commit({ marks: this.doc.marks.map(m => m.id === added.mark.id ? added.mark : m) }, 'add-point');
                this.pointIndex = added.index;
                return;
            }
        }
        const id = this.hitAt(target);
        if (!id) { this.pointsId = null; this.pointIndex = null; this.selected = []; return; }
        const mark = this.markById(id);
        if (mark?.kind === 'locked') { this.notice = 'This part of the file can\'t be changed point by point: it moves and resizes as a whole.'; return; }
        this.pointsId = id;
        this.pointIndex = null;
        this.selected = [id];
    }

    private startPoint(e: PointerEvent, start: PathMark, index: number) {
        const before = cloneDoc(this.doc);
        let changed = false;
        trackDrag(e, this.stage!, m => {
            changed = true;
            const next = movePoint(start, index, this.snap(this.world(m)));
            this.preview({ marks: before.marks.map(k => k.id === start.id ? next : k) });
        }, up => {
            if (up.type === 'pointercancel') { if (changed) this.cancelPreview(); return; }
            if (changed) this.commit(this.doc, 'move-point');
        }, 'crosshair');
    }

    private startBend(e: PointerEvent, start: PathMark, index: number, which: 'in' | 'out') {
        const before = cloneDoc(this.doc);
        let changed = false;
        trackDrag(e, this.stage!, m => {
            changed = true;
            const next = moveBend(start, index, which, this.world(m));
            this.preview({ marks: before.marks.map(k => k.id === start.id ? next : k) });
        }, up => {
            if (up.type === 'pointercancel') { if (changed) this.cancelPreview(); return; }
            if (changed) this.commit(this.doc, 'bend');
        }, 'crosshair');
    }

    private removePickedPoint(): boolean {
        const mark = this.markById(this.pointsId);
        const editable = mark ? editableMark(mark) : null;
        if (!editable || this.pointIndex === null) return false;
        const next = removePoint(editable, this.pointIndex);
        if (!next) { this.notice = 'A shape needs at least this many points. To remove it all, use the eraser.'; return true; }
        this.commit({ marks: this.doc.marks.map(m => m.id === next.id ? next : m) }, 'remove-point');
        this.pointIndex = null;
        return true;
    }

    // ---- fill, copy colours, eraser ------------------------------------------------------

    private fillAt(id: string | null) {
        const mark = this.markById(id);
        if (!mark) return;
        if (mark.kind === 'locked') { this.notice = 'This part of the file keeps its own colours.'; return; }
        const closed = mark.kind !== 'path' || mark.closed;
        const patch: Partial<MarkStyle> = closed ? { fill: this.pen.fill } : { stroke: this.pen.stroke };
        this.commit({ marks: this.doc.marks.map(m => m.id === mark.id ? { ...m, ...patch } as Mark : m) }, 'fill');
    }

    private dropperAt(id: string | null) {
        const mark = this.markById(id);
        if (!mark) return;
        if (mark.kind === 'locked') { this.notice = 'This part of the file keeps its own colours.'; return; }
        this.pen = { fill: mark.fill, stroke: mark.stroke, width: mark.width, dash: mark.dash, opacity: mark.opacity };
        if (mark.fill) this.lastFill = mark.fill;
        if (mark.stroke) this.lastStroke = mark.stroke;
        this.setTool(this.toolBeforeDropper === 'dropper' ? 'select' : this.toolBeforeDropper);
    }

    /** Press and drag: every mark the pointer crosses goes (a grouped one takes its group). One undo step. */
    private startErase(e: PointerEvent) {
        const root = this.renderRoot as ShadowRoot;
        const gone = new Set<string>();
        const rub = (c: { clientX: number; clientY: number }) => {
            // The top mark here that's still there (the ones already rubbed out still answer until the pointer lets go).
            const under = root.elementsFromPoint?.(c.clientX, c.clientY) ?? [];
            const id = under.map(el => this.hitAt(el)).find(found => found && !gone.has(found));
            if (!id) return;
            for (const g of groupOf(this.doc, id)) gone.add(g);
            this.preview({ marks: this.doc.marks.filter(m => !gone.has(m.id)) });
        };
        rub(e);
        // No cover here: it would stand between the pointer and the marks it needs to find.
        try { this.stage?.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer */ }
        const move = (m: PointerEvent) => { if (m.pointerId === e.pointerId) rub(m); };
        const up = (u: PointerEvent) => {
            if (u.pointerId !== e.pointerId) return;
            window.removeEventListener('pointermove', move, true);
            window.removeEventListener('pointerup', up, true);
            window.removeEventListener('pointercancel', up, true);
            if (!gone.size) return;
            if (u.type === 'pointercancel') this.cancelPreview(); else this.commit(this.doc, 'erase');
        };
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', up, true);
    }

    /** Part of a line: press and drag, and lines lose what the circle crosses, coming apart in pieces. One undo step. */
    private startRub(e: PointerEvent) {
        const radius = this.rubSize / 2;
        let last = this.world(e), changed = false, refused = false;
        const rub = (to: Pt) => {
            const reach: Box = { x: Math.min(last.x, to.x) - radius, y: Math.min(last.y, to.y) - radius, w: Math.abs(to.x - last.x) + radius * 2, h: Math.abs(to.y - last.y) + radius * 2 };
            const used = this.usedIds();
            const newId = () => { const id = freshId(used); used.push(id); return id; };
            let touched = false;
            const marks = this.doc.marks.flatMap(m => {
                if (!boxesTouch(reach, markWorldBox(m))) return [m];
                // Rubbing a line off a filled shape would have to change what's filled: left alone, and said.
                const line = m.kind === 'locked' || m.fill ? null : editableMark(m);
                if (!line || line.more?.length) { refused = true; return [m]; }
                const pieces = rubOutPath(line, last, to, radius, newId);
                if (!pieces) return [m];
                touched = true;
                return pieces;
            });
            last = to;
            this.rubAt = to;
            if (!touched) return;
            changed = true;
            this.selected = [];
            this.preview({ marks });
        };
        rub(last);
        trackDrag(e, this.stage!, m => {
            const events = m.getCoalescedEvents?.() ?? [];
            for (const c of events.length ? events : [m]) rub(this.world(c));
        }, up => {
            if (up.type === 'pointercancel') { if (changed) this.cancelPreview(); return; }
            if (changed) this.commit(this.doc, 'erase');
            else if (refused) this.notice = 'Only lines can be rubbed out in part. Take this shape\'s fill away first, or use Cut out.';
        }, 'crosshair');
    }

    // ---- what the buttons and keys do to the picked marks ----------------------------------

    /** Join or Cut out the picked shapes, back to front. The result takes the place and look of the one furthest back. */
    private combine(op: CombineOp) {
        const marks = this.selectedMarks;
        if (marks.length < 2) { this.notice = op === 'join' ? 'Pick two or more shapes to join.' : 'Pick a shape and the shape to cut out of it, on top of it.'; return; }
        const result = combineMarks(marks, op);
        if (!result.ok) {
            this.notice = !marks.every(isClosedShape) ? 'Only closed shapes can be joined or cut, not lines or parts of an opened file that move as a whole. Nothing has changed.'
                : result.reason === 'nothing-left' ? 'That would leave nothing of the shape underneath. Nothing has changed.'
                    : result.reason === 'not-touching' ? 'The top shape doesn\'t touch the one underneath, so there is nothing to cut out.'
                        : 'These shapes couldn\'t be put together. Nothing has changed.';
            return;
        }
        const gone = new Set(marks.map(m => m.id));
        const first = marks[0].id;
        this.pointsId = null;
        this.pointIndex = null;
        this.selected = [first];
        this.commit({ marks: this.doc.marks.flatMap(m => m.id === first ? [result.mark!] : gone.has(m.id) ? [] : [m]) }, op);
    }

    private removeSelected() {
        if (!this.selected.length) return;
        const set = new Set(this.selected);
        this.selected = [];
        this.pointsId = null;
        this.pointIndex = null;
        this.commit({ marks: this.doc.marks.filter(m => !set.has(m.id)) }, 'remove');
    }

    private duplicate() {
        if (!this.selected.length) return;
        const copies = copyMarks(this.selectedMarks, this.usedIds(), this.usedGroups(), { x: 20, y: 20 });
        this.selected = copies.map(c => c.id);
        this.commit({ marks: [...this.doc.marks, ...copies] }, 'duplicate');
    }

    private copy() {
        if (!this.selected.length) return;
        this.clipboard = JSON.parse(JSON.stringify(this.selectedMarks));
        this.pasteCount = 0;
    }

    private paste() {
        if (!this.clipboard.length) return;
        this.pasteCount++;
        const copies = copyMarks(this.clipboard, this.usedIds(), this.usedGroups(), { x: 20 * this.pasteCount, y: 20 * this.pasteCount });
        this.setTool('select');
        this.selected = copies.map(c => c.id);
        this.commit({ marks: [...this.doc.marks, ...copies] }, 'paste');
    }

    private flip(axis: 'x' | 'y') {
        if (!this.selected.length) return;
        const flipped = new Map(flipMarks(this.selectedMarks, axis).map(m => [m.id, m]));
        this.commit({ marks: this.doc.marks.map(m => flipped.get(m.id) ?? m) }, 'flip');
    }

    private reorder(to: 'front' | 'back') {
        if (this.selected.length) this.commit(reorderMarks(this.doc, this.selected, to), 'order');
    }

    private group() {
        if (this.selected.length > 1) this.commit(groupMarks(this.doc, this.selected), 'group');
    }

    private ungroup() {
        if (this.selectedMarks.some(m => m.group)) this.commit(ungroupMarks(this.doc, this.selected), 'ungroup');
    }

    private nudge(dx: number, dy: number) {
        const set = new Set(this.selected);
        if (set.size) this.commit({ marks: this.doc.marks.map(m => set.has(m.id) ? moveMark(m, dx, dy) : m) }, 'nudge');
    }

    private selectAll() {
        this.setTool('select');
        this.selected = this.usedIds();
    }

    // ---- keys ---------------------------------------------------------------------------

    private onKeyDown = (e: KeyboardEvent) => {
        const ctrl = e.ctrlKey || e.metaKey;
        // Keys typed into a field are the field's. A slider or a colour takes none but its own, so undo still works from one.
        const path = e.composedPath();
        const typing = path.some(t => t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type !== 'range' && t.type !== 'color'));
        if (typing || (!ctrl && path.some(t => t instanceof HTMLInputElement))) return;
        const key = e.key.toLowerCase();
        // While drawing, Shift and Alt change the mark without waiting for the pointer to move.
        if (e.key === 'Alt') e.preventDefault();
        if ((e.key === 'Shift' || e.key === 'Alt') && this.redraw) { this.redraw(e.shiftKey, e.altKey); return; }
        const done = () => { e.preventDefault(); e.stopPropagation(); };
        if (ctrl) {
            if (key === 'z') { done(); if (e.shiftKey) this.redo(); else this.undo(); }
            else if (key === 'y') { done(); this.redo(); }
            else if (key === 'd') { done(); this.duplicate(); }
            else if (key === 'c') { done(); this.copy(); }
            else if (key === 'x') { done(); this.copy(); this.removeSelected(); }
            else if (key === 'v') { done(); this.paste(); }
            else if (key === 'a') { done(); this.selectAll(); }
            else if (key === 'g') { done(); if (e.shiftKey) this.ungroup(); else this.group(); }
            else if (e.key === ']') { done(); this.reorder('front'); }
            else if (e.key === '[') { done(); this.reorder('back'); }
            return;
        }
        if (e.key === ' ') { done(); this.spaceDown = true; return; }
        if (e.key === 'Enter' && this.curve) { done(); this.finishCurve(true); return; }
        if (e.key === 'Escape') {
            if (this.curve) { done(); this.finishCurve(false); return; }
            if (this.pointIndex !== null) { done(); this.pointIndex = null; return; }
            if (this.selected.length) { done(); this.selected = []; this.pointsId = null; }
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.curve) {
                done();
                const nodes = this.curve.nodes.slice(0, -1);
                this.curve = nodes.length ? { ...this.curve, nodes } : null;
                return;
            }
            if (this.tool === 'points' && this.removePickedPoint()) { done(); return; }
            if (this.selected.length) { done(); this.removeSelected(); }
            return;
        }
        if (e.key.startsWith('Arrow') && this.selected.length) {
            done();
            const by = e.shiftKey ? 10 : this.grid ? GridStep : 1;
            this.nudge(e.key === 'ArrowLeft' ? -by : e.key === 'ArrowRight' ? by : 0, e.key === 'ArrowUp' ? -by : e.key === 'ArrowDown' ? by : 0);
            return;
        }
        if (e.key === '+' || e.key === '=') { done(); this.setZoom(this.zoom * 1.25); return; }
        if (e.key === '-') { done(); this.setZoom(this.zoom / 1.25); return; }
        if (e.key === '0') { done(); this.fit(); return; }
        if (e.shiftKey && key === 'h') { done(); this.flip('x'); return; }
        if (e.shiftKey && key === 'v') { done(); this.flip('y'); return; }
        if (e.shiftKey && key === 'j') { done(); this.combine('join'); return; }
        if (e.shiftKey && key === 'k') { done(); this.combine('cut'); return; }
        if (key === 'g') { done(); this.grid = !this.grid; return; }
        if (e.altKey || e.shiftKey) return;
        const info = Tools.find(t => t.key === key);
        if (info) { done(); this.setTool(info.tool); }
    };

    private onKeyUp = (e: KeyboardEvent) => {
        if (e.key === ' ') this.spaceDown = false;
        if ((e.key === 'Shift' || e.key === 'Alt') && this.redraw) this.redraw(e.shiftKey, e.altKey);
    };

    // ---- drawing it ---------------------------------------------------------------------

    /** The invisible twin of a mark that the pointer finds: inside when closed, and a generous reach along its line. */
    private hitMarkup(m: Mark): string {
        const reach = Math.max(fatHit / this.zoom, (m.kind === 'locked' ? 0 : m.width));
        const id = ` data-id="${m.id}"`;
        const plain = { dash: 'solid' as Dash, opacity: 1, stroke: 'transparent', width: reach };
        if (m.kind === 'locked') return markMarkup({ ...m, ...plain, kind: 'rect', fill: 'transparent', markup: undefined } as unknown as Mark, id);
        const closed = m.kind !== 'path' || m.closed;
        return markMarkup({ ...m, ...plain, fill: closed ? 'transparent' : null, ...(m.kind === 'path' ? { arrow: false } : {}) } as Mark, id);
    }

    private renderSelection(): TemplateResult | typeof nothing {
        const marks = this.selectedMarks;
        if (!marks.length || this.tool !== 'select') return marks.length && this.tool === 'points' && !this.pointsId ? this.renderBoxes(marks) : nothing;
        const single = marks.length === 1 ? marks[0] : null;
        const box = single ? markBox(single) : marksBox(marks);
        const u = 1 / this.zoom;
        const c = boxCentre(box);
        const turn = single?.rotation ? `rotate(${single.rotation} ${c.x} ${c.y})` : '';
        const size = 9 * u, grab = 22 * u, top = box.y - 26 * u;
        return svg`${marks.length > 1 ? this.renderBoxes(marks) : nothing}
            <g class="selection" transform=${turn}>
                <rect class="frame" x=${box.x} y=${box.y} width=${box.w} height=${box.h}></rect>
                <line class="stem" x1=${c.x} y1=${box.y} x2=${c.x} y2=${top}></line>
                ${Handles.map(h => {
                    const [hx, hy] = handleSide(h);
                    const x = box.x + box.w * hx, y = box.y + box.h * hy;
                    return svg`<rect class="handle" x=${x - size / 2} y=${y - size / 2} width=${size} height=${size}></rect>
                        <rect class="grab" data-handle=${h} x=${x - grab / 2} y=${y - grab / 2} width=${grab} height=${grab} style="cursor: ${HandleCursors[h]}"><title>Drag to resize. Hold Shift to keep its proportions, Alt to resize from the middle.</title></rect>`;
                })}
                <circle class="handle turn" cx=${c.x} cy=${top} r=${size * 0.6}></circle>
                <circle class="grab turn-grab" data-rotate="1" cx=${c.x} cy=${top} r=${grab / 2}><title>Drag to turn it. Hold Shift for steps of 15°.</title></circle>
            </g>`;
    }

    private renderBoxes(marks: Mark[]): TemplateResult {
        return svg`${marks.map(m => { const b = markWorldBox(m); return svg`<rect class="frame thin" x=${b.x} y=${b.y} width=${b.w} height=${b.h}></rect>`; })}`;
    }

    private renderPoints(): TemplateResult | typeof nothing {
        const mark = this.tool === 'points' ? this.markById(this.pointsId) : undefined;
        const editable = mark ? editableMark(mark) : null;
        if (!editable) return nothing;
        const u = 1 / this.zoom, r = 5 * u, grab = 12 * u;
        const picked = this.pointIndex !== null ? editable.nodes[this.pointIndex] : undefined;
        return svg`<g class="points">
            <path class="points-line" d=${pathData(editable)}></path>
            ${picked ? (['in', 'out'] as const).map(which => picked[which] ? svg`
                <line class="bend-line" x1=${picked.x} y1=${picked.y} x2=${picked[which]!.x} y2=${picked[which]!.y}></line>
                <circle class="bend" cx=${picked[which]!.x} cy=${picked[which]!.y} r=${r * 0.8}></circle>
                <circle class="grab" data-bend=${which} data-node=${this.pointIndex!} cx=${picked[which]!.x} cy=${picked[which]!.y} r=${grab}><title>Drag to change the bend</title></circle>` : nothing) : nothing}
            ${editable.nodes.map((n, i) => svg`<circle class="point" ?data-on=${i === this.pointIndex} data-on-point=${i === this.pointIndex ? '1' : '0'} cx=${n.x} cy=${n.y} r=${r}></circle>
                <circle class="grab" data-point=${i} cx=${n.x} cy=${n.y} r=${grab}><title>Drag this point</title></circle>`)}
        </g>`;
    }

    private renderCurve(): TemplateResult | typeof nothing {
        const curve = this.curve;
        if (!curve) return nothing;
        const u = 1 / this.zoom;
        const line: PathMark = { id: 'curve', ...this.pen, fill: null, kind: 'path', nodes: curve.nodes, closed: false };
        const last = curve.nodes[curve.nodes.length - 1];
        return svg`${unsafeSVG(markMarkup(line))}
            ${curve.hover ? svg`<line class="stretch" x1=${last.x} y1=${last.y} x2=${curve.hover.x} y2=${curve.hover.y}></line>` : nothing}
            ${curve.nodes.map((n, i) => svg`<circle class="point" data-on-point=${i === 0 ? '1' : '0'} cx=${n.x} cy=${n.y} r=${(i === 0 ? 6 : 4) * u}></circle>`)}`;
    }

    private renderTool(t: ToolInfo) {
        return html`<juel-button type="plain" toggle class="tool" data-tool=${t.tool} glyph=${t.glyph} button-label=${t.title}
            title=${`${t.title} (${t.key.toUpperCase()}). ${t.hint}`} ?pressed=${this.tool === t.tool} @click=${() => this.setTool(t.tool)}></juel-button>`;
    }

    /** A button that has just switched itself off (Delete, Join, Undo at the end) takes the keyboard with it, so Ctrl+Z would do nothing: back to the drawing. */
    private onBarClick = async (e: Event) => {
        const button = (e.target as Element).closest?.('juel-button');
        if (!button) return;
        await this.updateComplete;
        if (button.hasAttribute('disabled')) this.focus({ preventScroll: true });
    };

    private renderBar() {
        const some = this.selected.length > 0, many = this.selected.length > 1;
        const grouped = this.selectedMarks.some(m => m.group);
        return html`<div class="bar" role="toolbar" aria-label="Drawing actions" @click=${this.onBarClick}>
            <juel-button type="plain" glyph="lucide-undo-2" button-label="Undo" title="Undo (Ctrl+Z)" ?disabled=${!this.history?.canUndo} @click=${() => this.undo()}></juel-button>
            <juel-button type="plain" glyph="lucide-redo-2" button-label="Redo" title="Redo (Ctrl+Y)" ?disabled=${!this.history?.canRedo} @click=${() => this.redo()}></juel-button>
            <span class="sep"></span>
            <juel-button type="plain" class="duplicate" glyph="lucide-copy-plus" button-label="Duplicate" title="Duplicate (Ctrl+D)" ?disabled=${!some} @click=${() => this.duplicate()}></juel-button>
            <juel-button type="plain" action="remove" class="delete" glyph="lucide-trash-2" button-label="Delete" title="Delete (Delete)" ?disabled=${!some} @click=${() => this.removeSelected()}></juel-button>
            <juel-button type="plain" class="flip-x" glyph="lucide-flip-horizontal-2" button-label="Flip left to right" title="Flip left to right (Shift+H)" ?disabled=${!some} @click=${() => this.flip('x')}></juel-button>
            <juel-button type="plain" class="flip-y" glyph="lucide-flip-vertical-2" button-label="Flip top to bottom" title="Flip top to bottom (Shift+V)" ?disabled=${!some} @click=${() => this.flip('y')}></juel-button>
            <juel-button type="plain" class="front" glyph="lucide-bring-to-front" button-label="Bring to front" title="Bring to front (Ctrl+])" ?disabled=${!some} @click=${() => this.reorder('front')}></juel-button>
            <juel-button type="plain" class="back" glyph="lucide-send-to-back" button-label="Send to back" title="Send to back (Ctrl+[)" ?disabled=${!some} @click=${() => this.reorder('back')}></juel-button>
            <juel-button type="plain" class="group" glyph="lucide-group" button-label="Group" title="Group, so they move as one (Ctrl+G)" ?disabled=${!many} @click=${() => this.group()}></juel-button>
            <juel-button type="plain" class="ungroup" glyph="lucide-ungroup" button-label="Ungroup" title="Ungroup (Ctrl+Shift+G)" ?disabled=${!grouped} @click=${() => this.ungroup()}></juel-button>
            <juel-button type="plain" class="join" glyph="lucide-squares-unite" button-label="Join" title="Join: the picked shapes become one shape (Shift+J)" ?disabled=${!many} @click=${() => this.combine('join')}></juel-button>
            <juel-button type="plain" class="cut-out" glyph="lucide-squares-subtract" button-label="Cut out" title="Cut out: the shapes on top cut their outline out of the one underneath (Shift+K)" ?disabled=${!many} @click=${() => this.combine('cut')}></juel-button>
            <span class="sep"></span>
            <juel-button type="plain" class="zoom-out" glyph="lucide-zoom-out" button-label="Zoom out" title="Zoom out (-)" @click=${() => this.setZoom(this.zoom / 1.25)}></juel-button>
            <span class="zoom-level" aria-live="polite">${Math.round(this.zoom * 100)}%</span>
            <juel-button type="plain" class="zoom-in" glyph="lucide-zoom-in" button-label="Zoom in" title="Zoom in (+)" @click=${() => this.setZoom(this.zoom * 1.25)}></juel-button>
            <juel-button type="plain" class="zoom-fit" glyph="lucide-maximize" button-label="See it all" title="See the whole drawing (0)" @click=${() => this.fit()}></juel-button>
            <juel-button type="plain" toggle class="grid-toggle" glyph="lucide-grid-3x3" button-label="Grid" title="Grid: show it, and line marks up with it (G)" ?pressed=${this.grid} @click=${() => { this.grid = !this.grid; }}></juel-button>
        </div>`;
    }

    private renderPen() {
        const s = this.shownStyle;
        return html`<div class="options" role="group" aria-label="Colours and line">
            <label class="field"><span>Fill</span>
                <juel-colour class="fill" .value=${s.fill ?? ''} .recent=${this.recent} title="Fill colour" @value-changed=${(e: CustomEvent) => this.setStyle({ fill: e.detail.value })}></juel-colour>
                <juel-button type="plain" toggle class="no-fill" glyph="lucide-ban" button-label="No fill" title="No fill" ?pressed=${!s.fill} @click=${() => this.setStyle({ fill: s.fill ? null : this.lastFill })}></juel-button>
            </label>
            <label class="field"><span>Line</span>
                <juel-colour class="stroke" .value=${s.stroke ?? ''} .recent=${this.recent} title="Line colour" @value-changed=${(e: CustomEvent) => this.setStyle({ stroke: e.detail.value })}></juel-colour>
                <juel-button type="plain" toggle class="no-stroke" glyph="lucide-ban" button-label="No line" title="No line" ?pressed=${!s.stroke} @click=${() => this.setStyle({ stroke: s.stroke ? null : this.lastStroke })}></juel-button>
            </label>
            <label class="field"><span>Width</span>
                <juel-number class="width" hide-label label="Line width" min="0" max="100" .value=${s.width} @value-changed=${(e: CustomEvent) => { const v = Number(e.detail.value); if (Number.isFinite(v) && v >= 0) this.setStyle({ width: v }); }}></juel-number>
            </label>
            <label class="field"><span>Line style</span>
                <juel-select class="dash" .data=${DashChoices} .value=${s.dash} placeholder="" @value-changed=${(e: CustomEvent) => { const v = e.detail.value as Dash; if (v && v !== s.dash) this.setStyle({ dash: v }); }}></juel-select>
            </label>
            <label class="field"><span>See-through</span>
                <juel-number class="opacity" hide-label label="See-through" slider min="0" max="100" .value=${Math.round((1 - s.opacity) * 100)} title="0 is solid, 100 can't be seen" @value-changed=${(e: CustomEvent) => { const v = Number(e.detail.value); if (Number.isFinite(v)) this.setStyle({ opacity: Math.max(0, Math.min(1, 1 - v / 100)) }); }}></juel-number>
            </label>
            ${this.tool === 'polygon' ? html`<label class="field"><span>Sides</span>
                <juel-number class="sides" hide-label label="Sides" min="3" max="24" .value=${this.sides} @value-changed=${(e: CustomEvent) => { const v = Number(e.detail.value); if (v >= 3) this.sides = Math.min(24, Math.round(v)); }}></juel-number></label>` : nothing}
            ${this.tool === 'star' ? html`<label class="field"><span>Points</span>
                <juel-number class="star-points" hide-label label="Points" min="3" max="24" .value=${this.points} @value-changed=${(e: CustomEvent) => { const v = Number(e.detail.value); if (v >= 3) this.points = Math.min(24, Math.round(v)); }}></juel-number></label>` : nothing}
            ${this.tool === 'preset' ? html`<label class="field"><span>Shape</span>
                <juel-select class="preset-kind" .data=${PresetChoices} .value=${this.preset} placeholder="" @value-changed=${(e: CustomEvent) => { const v = e.detail.value as string; if (v) this.preset = v; }}></juel-select></label>` : nothing}
            ${this.tool === 'words' ? html`<label class="field"><span>Words</span>
                    <juel-text class="words-text" aria-label="Your words" placeholder="Type here" .value=${this.words} @value-changed=${(e: CustomEvent) => { this.words = String(e.detail.value ?? ''); this.notice = ''; }}></juel-text></label>
                <label class="field"><span>Font</span>
                    <juel-select class="words-font" .data=${WordFontChoices} .value=${this.wordFont} placeholder="" @value-changed=${(e: CustomEvent) => { const v = e.detail.value as string; if (v) this.wordFont = v; }}></juel-select></label>` : nothing}
            ${this.tool === 'eraser' ? html`<label class="field"><span>Rub out</span>
                <juel-select class="erase-mode" .data=${EraseChoices} .value=${this.rubPart ? 'part' : 'whole'} placeholder="" @value-changed=${(e: CustomEvent) => { const v = e.detail.value as string; if (v) { this.rubPart = v === 'part'; this.rubAt = null; } }}></juel-select></label>
                ${this.rubPart ? html`<label class="field"><span>Size</span>
                    <juel-number class="erase-size" hide-label label="Eraser size" min="2" max="200" .value=${this.rubSize} @value-changed=${(e: CustomEvent) => { const v = Number(e.detail.value); if (v >= 2) this.rubSize = Math.min(200, v); }}></juel-number></label>` : nothing}` : nothing}
        </div>`;
    }

    override render() {
        const w = this.size.w / this.zoom, h = this.size.h / this.zoom;
        const gridStep = this.zoom < 0.6 ? GridStep * 5 : GridStep;
        const u = 1 / this.zoom;
        const info = Tools.find(t => t.tool === this.tool);
        const drawing = this.doc.marks.map(m => markMarkup(m)).join('');
        const hits = this.frozenHits ?? this.doc.marks.map(m => this.hitMarkup(m)).join('');
        const cursor = this.spaceDown || this.tool === 'hand' ? (this.panning ? 'grabbing' : 'grab') : this.tool === 'select' ? 'default' : this.tool === 'points' ? 'default' : 'crosshair';
        return html`<div class="shape-editor" @keydown=${this.onKeyDown} @keyup=${this.onKeyUp}>
            ${this.renderBar()}
            ${this.renderPen()}
            <div class="main">
                <div class="tools" role="toolbar" aria-label="Tools" aria-orientation="vertical">${Tools.map(t => this.renderTool(t))}</div>
                <div class="stage" tabindex="0" aria-label="Drawing area" style="cursor: ${cursor}">
                    <svg class="canvas" xmlns="http://www.w3.org/2000/svg" viewBox="${this.panX} ${this.panY} ${w} ${h}" preserveAspectRatio="xMinYMin meet"
                        @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerleave=${() => { this.rubAt = null; }} @wheel=${this.onWheel}>
                        ${this.grid ? svg`<defs><pattern id="shape-grid" width=${gridStep} height=${gridStep} patternUnits="userSpaceOnUse"><path class="grid-line" d="M${gridStep} 0H0V${gridStep}" stroke-width=${u}></path></pattern></defs>
                            <rect class="grid" x=${this.panX} y=${this.panY} width=${w} height=${h} fill="url(#shape-grid)"></rect>` : nothing}
                        <g class="drawing">${unsafeSVG(`${this.doc.defs ?? ''}${drawing}`)}</g>
                        <g class="hits">${unsafeSVG(hits)}</g>
                        ${this.draft ? svg`<g class="draft">${unsafeSVG(markMarkup(this.draft))}</g>` : nothing}
                        ${this.renderCurve()}
                        ${this.renderSelection()}
                        ${this.renderPoints()}
                        ${this.marquee ? svg`<rect class="marquee" x=${this.marquee.x} y=${this.marquee.y} width=${this.marquee.w} height=${this.marquee.h}></rect>` : nothing}
                        ${this.rubAt && this.tool === 'eraser' && this.rubPart ? svg`<circle class="rub-brush" cx=${this.rubAt.x} cy=${this.rubAt.y} r=${this.rubSize / 2}></circle>` : nothing}
                    </svg>
                    ${this.doc.marks.length || this.draft || this.curve ? nothing : html`<p class="start">Choose a tool on the left, then press and drag here.</p>`}
                </div>
            </div>
            <p class="hint" role="status">${this.notice || (this.tool === 'eraser' && this.rubPart ? RubHint : info?.hint) || ''}</p>
        </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-shape-editor': JuelShapeEditor }
}
