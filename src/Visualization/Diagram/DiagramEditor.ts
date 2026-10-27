// <juel-diagram-editor>: edits a diagram model visually, with a live <juel-diagram> beside it and
// its own undo/redo. No syntax anywhere (README). Two ways of working, by the diagram's type:
//
//   process, org, timeline — an OUTLINE of the nodes: type the text, Enter adds the next one,
//     Tab / Shift+Tab put it under a manager (org) or back, Alt+↑/↓ reorder, Backspace on an
//     empty one removes it; a date (timeline), a colour and an icon per node; clicking a node
//     in the drawing picks its row.
//   flowchart — a CANVAS: add a box / rounded / decision / start-end from the bar, drag to move
//     (snapped to a grid), drag from a picked node's port to another node to link, double-click
//     to edit the text, Delete removes; a picked link's label is editable below.
//
// `value` is the model in; `diagram-changed` ({ diagram, reason }) reports every edit, and
// `diagram` is the model as it stands. Undo/redo is HistoryController (one entry per gesture).
import { CSSResultGroup, html, LitElement, nothing, svg, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import Styles from 'bundle-text:./DiagramEditor.less';
import { HistoryController } from '../../_Base/HistoryController';
import { trackDrag } from '../../Editors/Handles/handleShared';
import { DiagramTypes, FlowShapes, type Diagram, type DiagramLink, type DiagramNode, type DiagramType, type FlowShape } from './diagramModel';
import { FlowDefaults, layoutDiagram, type DiagramBox, type DiagramLayout } from './diagramLayout';
import './Diagram';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const Grid = 10;
const snap = (v: number) => Math.round(v / Grid) * Grid;
const ShapeLabels: Record<FlowShape, string> = { 'box': 'Box', 'rounded': 'Rounded box', 'decision': 'Decision', 'start-end': 'Start or end' };
const ShapeGlyphs: Record<FlowShape, string> = { 'box': 'lucide-square', 'rounded': 'lucide-rectangle-horizontal', 'decision': 'lucide-diamond', 'start-end': 'lucide-pill' };
const NodeWord: Record<DiagramType, string> = { process: 'step', org: 'person', timeline: 'milestone', flowchart: 'box' };

type Side = 'top' | 'right' | 'bottom' | 'left';

@customElement('juel-diagram-editor')
export class JuelDiagramEditor extends LitElement {
    static styles?: CSSResultGroup = unsafeCSS(Styles);

    /** The model to edit (copied: the editor never changes the object it was given). */
    @property({ attribute: false }) value?: Diagram;

    /** The model as it stands. */
    get diagram(): Diagram { return clone(this.model); }

    @state() private model: Diagram = { type: 'process', nodes: [] };
    @state() private selected: string | null = null;
    @state() private selectedLink: number | null = null;
    @state() private editing: string | null = null;
    @state() private linking: { from: string; x: number; y: number; over: string | null } | null = null;
    @state() private dragging = false;
    @query('.overlay') private overlay?: SVGSVGElement;
    private history?: HistoryController<Diagram>;
    private adopted?: Diagram;
    private focusNext: string | null = null;
    /** A field edited live (previewed) and not yet recorded. */
    private typing = false;

    override connectedCallback() {
        super.connectedCallback();
        // Snapshots are clones: compare them by content, or every record would be a new entry.
        if (!this.history) this.history = new HistoryController<Diagram>(this, clone(this.model), { apply: v => this.applyHistory(v), equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
    }

    override willUpdate(changed: Map<string, unknown>) {
        if (changed.has('value') && this.value && this.value !== this.adopted) {
            this.adopted = this.value;
            const next = clone(this.value);
            next.nodes = this.treeOrdered(next.nodes, next.type); // the array is the outline's order
            this.selected = null;
            this.selectedLink = null;
            this.editing = null;
            this.model = next;
            this.history?.reseed(clone(next)); // the new model is the one committed state: nothing to undo
        }
    }

    override updated() {
        if (this.focusNext) {
            const id = this.focusNext;
            this.focusNext = null;
            this.focusRow(id);
        }
    }

    // ---- the model ----------------------------------------------------------------------

    /** Only undo / redo / reset: adopt the value. */
    private applyHistory(v: Diagram) {
        this.model = clone(v);
        if (this.selected && !this.model.nodes.some(n => n.id === this.selected)) this.selected = null;
        if (this.selectedLink !== null && !(this.model.links ?? [])[this.selectedLink]) this.selectedLink = null;
        this.fire('history');
    }

    /** One gesture: the model changes and one history entry is written. */
    private commit(next: Diagram, reason: string) {
        this.model = next;
        this.history?.record(clone(next));
        this.fire(reason);
    }

    /** During a gesture (typing, a drag): the model changes, the history doesn't yet. */
    private preview(next: Diagram) {
        this.model = next;
        this.history?.preview(clone(next));
    }

    /** Typing so far becomes one history entry and is reported (a field left, a structural change coming, undo). */
    private flushTyping(reason = 'text') {
        if (!this.typing) return;
        this.typing = false;
        this.history?.record(clone(this.model));
        this.fire(reason);
    }

    private fire(reason: string) {
        this.dispatchEvent(new CustomEvent('diagram-changed', { detail: { diagram: clone(this.model), reason }, bubbles: true, composed: true }));
    }

    private node(id: string | null): DiagramNode | undefined { return id === null ? undefined : this.model.nodes.find(n => n.id === id); }

    private newId(): string {
        const used = new Set(this.model.nodes.map(n => n.id));
        let i = this.model.nodes.length + 1;
        while (used.has(`n${i}`)) i++;
        return `n${i}`;
    }

    /** A field still being typed in is an entry first, so undo takes the typing back, not something older. */
    undo() { this.flushTyping(); if (this.history?.canUndo) this.history.undo(); }
    redo() { this.flushTyping(); if (this.history?.canRedo) this.history.redo(); }

    private onKeyDown = (e: KeyboardEvent) => {
        // Ctrl+Z / Ctrl+Y (not inside a text field: it has its own).
        const inField = e.composedPath().some(t => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement);
        if ((e.ctrlKey || e.metaKey) && !inField && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
            e.preventDefault();
            if (e.key.toLowerCase() === 'z' && !e.shiftKey) this.undo(); else this.redo();
        }
    };

    // ---- the outline (process, org, timeline) -------------------------------------------

    /** The rows in tree order (org: depth first), each with its depth. */
    private rows(): { node: DiagramNode; depth: number }[] {
        if (this.model.type !== 'org') return this.model.nodes.map(node => ({ node, depth: 0 }));
        const out: { node: DiagramNode; depth: number }[] = [];
        const ids = new Set(this.model.nodes.map(n => n.id));
        const children = (id: string | undefined) => this.model.nodes.filter(n => (n.parent !== undefined && ids.has(n.parent) ? n.parent : undefined) === id);
        const walk = (id: string | undefined, depth: number) => { for (const c of children(id)) { out.push({ node: c, depth }); walk(c.id, depth + 1); } };
        walk(undefined, 0);
        return out;
    }

    /** The nodes reordered to tree order (org), so the array stays the outline. */
    private treeOrdered(nodes: DiagramNode[], type: DiagramType = this.model.type): DiagramNode[] {
        if (type !== 'org') return nodes;
        const ids = new Set(nodes.map(n => n.id));
        const out: DiagramNode[] = [];
        const walk = (id: string | undefined) => { for (const c of nodes.filter(n => (n.parent !== undefined && ids.has(n.parent) ? n.parent : undefined) === id)) { out.push(c); walk(c.id); } };
        walk(undefined);
        return out;
    }

    private setField(id: string, key: 'text' | 'detail' | 'date' | 'colour' | 'icon', value: string, live: boolean) {
        const current = this.node(id);
        if (!current || (key === 'text' ? current.text : current[key] ?? '') === value) return; // a field reporting what it already had
        const next = clone(this.model);
        const n = next.nodes.find(n => n.id === id)!;
        if (key === 'text') n.text = value;
        else if (value.trim()) n[key] = value; else delete n[key];
        if (live) { this.typing = true; this.preview(next); } else this.commit(next, key);
    }

    /** A new node after `afterId` (org: a sibling, or the first child when the row has children). */
    private addAfter(afterId: string | null) {
        const next = clone(this.model);
        const id = this.newId();
        const node: DiagramNode = { id, text: '' };
        if (afterId === null) next.nodes.push(node);
        else {
            const after = next.nodes.find(n => n.id === afterId)!;
            if (next.type === 'org' && after.parent !== undefined) node.parent = after.parent;
            if (next.type === 'org' && next.nodes.some(n => n.parent === afterId)) node.parent = afterId;
            const index = next.nodes.indexOf(after);
            // After the row's subtree (org), else right after it.
            let at = index + 1;
            if (next.type === 'org' && node.parent !== afterId) {
                const inside = (n: DiagramNode): boolean => n.parent === afterId || (n.parent !== undefined && n.parent !== n.id && inside(next.nodes.find(p => p.id === n.parent) ?? { id: '', text: '' }));
                while (at < next.nodes.length && inside(next.nodes[at])) at++;
            }
            next.nodes.splice(at, 0, node);
        }
        next.nodes = this.treeOrdered(next.nodes);
        this.commit(next, 'add');
        this.selected = id;
        this.focusNext = id;
    }

    private removeNode(id: string) {
        if (this.model.nodes.length <= 1) return;
        const next = clone(this.model);
        const rows = this.rows();
        const at = rows.findIndex(r => r.node.id === id);
        // Children move up to the removed node's parent.
        const removed = next.nodes.find(n => n.id === id)!;
        for (const n of next.nodes) if (n.parent === id) { if (removed.parent !== undefined) n.parent = removed.parent; else delete n.parent; }
        next.nodes = next.nodes.filter(n => n.id !== id);
        next.links = (next.links ?? []).filter(l => l.from !== id && l.to !== id);
        if (!next.links.length) delete next.links;
        this.commit(next, 'remove');
        const neighbour = rows[at - 1]?.node.id ?? rows[at + 1]?.node.id ?? null;
        this.selected = neighbour;
        this.focusNext = neighbour;
    }

    /** org: Tab puts the row under the sibling above it; Shift+Tab lifts it to its grandparent. */
    private indent(id: string, deeper: boolean) {
        if (this.model.type !== 'org') return;
        const next = clone(this.model);
        const n = next.nodes.find(n => n.id === id)!;
        if (deeper) {
            const siblings = next.nodes.filter(s => s.parent === n.parent);
            const above = siblings[siblings.indexOf(n) - 1];
            if (!above) return;
            n.parent = above.id;
        } else {
            if (n.parent === undefined) return;
            const parent = next.nodes.find(p => p.id === n.parent)!;
            if (parent.parent !== undefined) n.parent = parent.parent; else delete n.parent;
            // Goes after its old parent, as its next sibling.
            next.nodes.splice(next.nodes.indexOf(n), 1);
            const pi = next.nodes.indexOf(parent);
            next.nodes.splice(pi + 1, 0, n);
        }
        next.nodes = this.treeOrdered(next.nodes);
        if (next.nodes.every(x => x.parent !== undefined)) return; // no top left: not allowed
        this.commit(next, 'indent');
        this.focusNext = id;
    }

    /** Alt+↑/↓: among its siblings (org) or in the list. */
    private move(id: string, delta: -1 | 1) {
        const next = clone(this.model);
        const n = next.nodes.find(n => n.id === id)!;
        const group = next.type === 'org' ? next.nodes.filter(s => s.parent === n.parent) : next.nodes;
        const at = group.indexOf(n), to = at + delta;
        if (to < 0 || to >= group.length) return;
        const other = group[to];
        const i = next.nodes.indexOf(n), j = next.nodes.indexOf(other);
        if (next.type === 'org') {
            // Swap the two subtrees' order: simplest is to swap the siblings in the array and re-walk.
            next.nodes[i] = other; next.nodes[j] = n;
            next.nodes = this.treeOrdered(next.nodes);
        } else { next.nodes[i] = other; next.nodes[j] = n; }
        this.commit(next, 'move');
        this.focusNext = id;
    }

    private onRowKey(e: KeyboardEvent, id: string) {
        const input = e.composedPath().find(t => t instanceof HTMLInputElement) as HTMLInputElement | undefined;
        const field = e.composedPath().find(t => t instanceof HTMLElement && t.localName === 'juel-text') as HTMLElement | undefined;
        if (e.key === 'Enter') { e.preventDefault(); this.flushRow(id); this.addAfter(id); }
        else if (e.key === 'Tab' && this.model.type === 'org') { e.preventDefault(); this.flushRow(id); this.indent(id, !e.shiftKey); }
        else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); this.flushRow(id); this.move(id, e.key === 'ArrowUp' ? -1 : 1); }
        else if (e.key === 'Backspace' && input && input.value === '' && field?.classList.contains('text') && !this.node(id)?.text) { e.preventDefault(); this.removeNode(id); }
    }

    /** A field edited live (preview): write the entry now, before a structural change. */
    private flushRow(id: string) {
        this.flushTyping();
        void id;
    }

    private focusRow(id: string) {
        const field = this.renderRoot.querySelector<LitElement>(`.row[data-id="${CSS.escape(id)}"] juel-text.text`);
        if (!field) return;
        // A row just added: its field renders its input a tick later.
        void (field.updateComplete ?? Promise.resolve()).then(() => {
            const input = field.shadowRoot?.querySelector<HTMLInputElement>('input') ?? field.querySelector('input');
            input?.focus();
            input?.select();
        });
    }

    private renderOutline() {
        const type = this.model.type;
        const rows = this.rows();
        return html`<div class="outline" @keydown=${this.onKeyDown}>
            ${rows.length ? repeat(rows, r => r.node.id, ({ node, depth }) => html`
                <div class="row ${type}" data-id=${node.id} ?data-selected=${this.selected === node.id} style="--depth: ${depth}"
                    @focusin=${() => { this.selected = node.id; }}
                    @focusout=${() => this.flushTyping()}
                    @keydown=${(e: KeyboardEvent) => this.onRowKey(e, node.id)}>
                    <span class="grip" aria-hidden="true">⋮</span>
                    ${type === 'timeline' ? html`<juel-text class="date" placeholder="Date" aria-label="Date" .value=${node.date ?? ''}
                        @value-changed=${(e: CustomEvent) => this.setField(node.id, 'date', e.detail.value, true)}></juel-text>` : nothing}
                    <juel-text class="text" placeholder=${type === 'org' ? 'Name' : type === 'timeline' ? 'What happens' : 'Step'} aria-label="Text" .value=${node.text}
                        @value-changed=${(e: CustomEvent) => this.setField(node.id, 'text', e.detail.value, true)}></juel-text>
                    <juel-text class="detail" placeholder=${type === 'org' ? 'Role' : 'Detail'} aria-label="Detail" .value=${node.detail ?? ''}
                        @value-changed=${(e: CustomEvent) => this.setField(node.id, 'detail', e.detail.value, true)}></juel-text>
                    <juel-colour class="colour" title="Colour" .value=${node.colour ?? '#3d6a8a'}
                        @value-changed=${(e: CustomEvent) => this.setField(node.id, 'colour', e.detail.value, false)}></juel-colour>
                    <juel-button type="plain" glyph="lucide-trash-2" button-label="Remove" title="Remove it" ?disabled=${rows.length <= 1}
                        @click=${() => this.removeNode(node.id)}></juel-button>
                </div>`)
            : html`<p class="empty">No ${NodeWord[type]}s yet.</p>`}
            <juel-button class="add" type="light" glyph="lucide-plus" label=${`Add ${NodeWord[type]}`} @click=${() => this.addAfter(rows[rows.length - 1]?.node.id ?? null)}></juel-button>
        </div>`;
    }

    // ---- the canvas (flowchart) ---------------------------------------------------------

    private layout(): DiagramLayout { return layoutDiagram(this.model); }

    /**
     * Client px → diagram units, through the overlay's transform. A drag passes the transform it
     * started with: moving a box can grow the drawing, which would change the scale under the pointer.
     */
    private toDiagram(clientX: number, clientY: number, ctm: DOMMatrix | null = this.overlay?.getScreenCTM() ?? null): { x: number; y: number } {
        if (!ctm) return { x: clientX, y: clientY };
        const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    }

    private boxAt(p: { x: number; y: number }, layout: DiagramLayout): DiagramBox | undefined {
        return layout.boxes.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
    }

    private addShape(shape: FlowShape) {
        const next = clone(this.model);
        const id = this.newId();
        const size = FlowDefaults[shape];
        // Under the lowest node, at the left (or where the picked node is, offset).
        const layout = this.layout();
        const picked = layout.boxes.find(b => b.id === this.selected);
        const margin = 16;
        const x = picked ? snap(picked.x - margin + 220) : snap(Math.max(0, ...layout.boxes.map(b => b.x - margin)));
        const bottom = Math.max(0, ...layout.boxes.map(b => b.y + b.h - margin));
        const y = picked ? snap(picked.y - margin) : snap(bottom + (layout.boxes.length ? 40 : 0));
        const node: DiagramNode = { id, text: ShapeLabels[shape], shape, x, y, w: size.w, h: size.h };
        next.nodes.push(node);
        this.commit(next, 'add');
        this.selected = id;
        this.selectedLink = null;
        this.editing = id;
    }

    private removeSelected() {
        if (this.selectedLink !== null) {
            const next = clone(this.model);
            next.links!.splice(this.selectedLink, 1);
            if (!next.links!.length) delete next.links;
            this.selectedLink = null;
            this.commit(next, 'remove-link');
        } else if (this.selected) this.removeNode(this.selected);
    }

    private onNodeDown(e: PointerEvent, id: string) {
        if (e.button !== 0) return;
        e.preventDefault();
        this.selected = id;
        this.selectedLink = null;
        this.editing = null;
        const ctm = this.overlay?.getScreenCTM() ?? null;
        const start = this.toDiagram(e.clientX, e.clientY, ctm);
        const node = this.node(id)!;
        const layout = this.layout();
        const box = layout.boxes.find(b => b.id === id)!;
        // The node's own x/y: unplaced ones take the position the layout gave them, less the margin shift.
        const origin = { x: node.x ?? box.x - 16, y: node.y ?? box.y - 16 };
        let moved = false;
        trackDrag(e, this.overlay as unknown as HTMLElement, m => {
            const p = this.toDiagram(m.clientX, m.clientY, ctm);
            const dx = p.x - start.x, dy = p.y - start.y;
            if (!moved && Math.hypot(dx, dy) < 3) return;
            moved = true;
            this.dragging = true;
            const next = clone(this.model);
            const n = next.nodes.find(n => n.id === id)!;
            n.x = Math.max(0, snap(origin.x + dx));
            n.y = Math.max(0, snap(origin.y + dy));
            this.preview(next);
        }, () => {
            this.dragging = false;
            if (moved) this.commit(this.model, 'move');
        });
    }

    private onPortDown(e: PointerEvent, id: string, side: Side) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const ctm = this.overlay?.getScreenCTM() ?? null;
        const p = this.toDiagram(e.clientX, e.clientY, ctm);
        this.linking = { from: id, x: p.x, y: p.y, over: null };
        void side;
        trackDrag(e, this.overlay as unknown as HTMLElement, m => {
            const q = this.toDiagram(m.clientX, m.clientY, ctm);
            const over = this.boxAt(q, this.layout());
            this.linking = { from: id, x: q.x, y: q.y, over: over && over.id !== id ? over.id : null };
        }, () => {
            const to = this.linking?.over ?? null;
            this.linking = null;
            if (!to) return;
            const links = this.model.links ?? [];
            if (links.some(l => l.from === id && l.to === to)) return;
            const next = clone(this.model);
            next.links = [...links, { from: id, to }];
            this.commit(next, 'link');
            this.selectedLink = next.links.length - 1;
            this.selected = null;
        });
    }

    private onCanvasKey(e: KeyboardEvent) {
        if (e.composedPath().some(t => t instanceof HTMLInputElement)) return;
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.removeSelected(); }
        else if (e.key === 'Escape') { this.selected = null; this.selectedLink = null; this.editing = null; }
        else this.onKeyDown(e);
    }

    private setLinkLabel(value: string, live: boolean) {
        if (this.selectedLink === null) return;
        const next = clone(this.model);
        const link = next.links![this.selectedLink];
        if (value.trim()) link.label = value; else delete link.label;
        if (live) { this.typing = true; this.preview(next); } else this.commit(next, 'label');
    }

    private setShape(shape: FlowShape) {
        if (!this.selected) return;
        const next = clone(this.model);
        const n = next.nodes.find(n => n.id === this.selected)!;
        n.shape = shape;
        const size = FlowDefaults[shape];
        n.w = size.w; n.h = size.h;
        this.commit(next, 'shape');
    }

    private renderCanvas() {
        const layout = this.layout();
        const picked = layout.boxes.find(b => b.id === this.selected);
        const link = this.selectedLink !== null ? (this.model.links ?? [])[this.selectedLink] : undefined;
        const ports: [Side, number, number][] = picked ? [
            ['top', picked.x + picked.w / 2, picked.y], ['right', picked.x + picked.w, picked.y + picked.h / 2],
            ['bottom', picked.x + picked.w / 2, picked.y + picked.h], ['left', picked.x, picked.y + picked.h / 2]] : [];
        const over = this.linking?.over ? layout.boxes.find(b => b.id === this.linking!.over) : undefined;
        const editing = this.editing ? layout.boxes.find(b => b.id === this.editing) : undefined;
        return html`<div class="canvas" tabindex="0" @keydown=${(e: KeyboardEvent) => this.onCanvasKey(e)}
                @pointerdown=${(e: PointerEvent) => { if ((e.target as Element).classList?.contains('overlay')) { this.selected = null; this.selectedLink = null; this.editing = null; } }}>
            ${this.model.nodes.length ? html`<div class="stack">
                <juel-diagram .data=${this.model}></juel-diagram>
                <svg class="overlay" viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                    ${layout.edges.map((e, i) => {
                        const d = e.points.map((p, k) => `${k ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
                        return svg`<path class="link-hit" data-link=${i} d=${d} @pointerdown=${(ev: PointerEvent) => { ev.stopPropagation(); this.selectedLink = i; this.selected = null; this.editing = null; }}></path><path class="link-mark" ?data-selected=${this.selectedLink === i} d=${d}></path>`;
                    })}
                    ${layout.boxes.map(b => svg`<rect class="hit" data-id=${b.id} x=${b.x} y=${b.y} width=${b.w} height=${b.h} rx="4"
                        @pointerdown=${(ev: PointerEvent) => this.onNodeDown(ev, b.id)}
                        @dblclick=${() => { this.editing = b.id; this.selected = b.id; }}></rect>`)}
                    ${over ? svg`<rect class="drop" x=${over.x - 3} y=${over.y - 3} width=${over.w + 6} height=${over.h + 6} rx="6"></rect>` : nothing}
                    ${picked && !this.dragging ? svg`<rect class="selection" x=${picked.x - 3} y=${picked.y - 3} width=${picked.w + 6} height=${picked.h + 6} rx="6"></rect>
                        ${this.linking ? nothing : ports.map(([side, x, y]) => svg`<circle class="port" data-side=${side} cx=${x} cy=${y} r="6"
                            @pointerdown=${(ev: PointerEvent) => this.onPortDown(ev, picked.id, side)}><title>Drag to another box to link</title></circle>`)}` : nothing}
                    ${this.linking && picked ? svg`<line class="linking" x1=${picked.x + picked.w / 2} y1=${picked.y + picked.h / 2} x2=${this.linking.x} y2=${this.linking.y}></line>` : nothing}
                </svg>
                ${editing ? html`<div class="inplace" style="left: ${(editing.x + editing.w / 2) / layout.width * 100}%; top: ${(editing.y + editing.h / 2) / layout.height * 100}%">
                    <juel-text class="inplace-text" aria-label="Text" .value=${this.node(editing.id)?.text ?? ''} autofocus
                        @value-changed=${(e: CustomEvent) => this.setField(editing.id, 'text', e.detail.value, true)}
                        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); this.flushTyping(); this.editing = null; (this.renderRoot.querySelector('.canvas') as HTMLElement)?.focus(); } }}
                        @focusout=${() => { this.flushTyping(); this.editing = null; }}></juel-text>
                </div>` : nothing}
            </div>` : html`<p class="empty">Add a box from the bar above.</p>`}
            <div class="props">
                ${picked ? html`<span class="what">Picked: ${this.node(picked.id)?.text || picked.id}</span>
                    ${FlowShapes.map(s => html`<juel-button type="plain" glyph=${ShapeGlyphs[s]} button-label=${ShapeLabels[s]} title=${ShapeLabels[s]} ?data-on=${(this.node(picked.id)?.shape ?? 'box') === s} @click=${() => this.setShape(s)}></juel-button>`)}
                    <juel-colour class="colour" title="Colour" .value=${this.node(picked.id)?.colour ?? '#3d6a8a'} @value-changed=${(e: CustomEvent) => this.setField(picked.id, 'colour', e.detail.value, false)}></juel-colour>
                    <juel-button type="plain" glyph="lucide-trash-2" button-label="Remove" title="Remove it (Delete)" @click=${() => this.removeSelected()}></juel-button>`
                : link ? html`<span class="what">Link: ${this.node(link.from)?.text || link.from} → ${this.node(link.to)?.text || link.to}</span>
                    <juel-text class="link-label" placeholder="Label" aria-label="Link label" .value=${link.label ?? ''}
                        @value-changed=${(e: CustomEvent) => this.setLinkLabel(e.detail.value, true)}
                        @focusout=${() => this.flushTyping('label')}></juel-text>
                    <juel-button type="plain" glyph="lucide-trash-2" button-label="Remove link" title="Remove the link (Delete)" @click=${() => this.removeSelected()}></juel-button>`
                : html`<span class="what">Drag a box to move it, double-click to edit its text, drag from a picked box's port to another box to link them.</span>`}
            </div>
        </div>`;
    }

    // ---- the drawing (outline modes) ----------------------------------------------------

    private onDrawingClick = (e: Event) => {
        const g = e.composedPath().find(t => t instanceof Element && t.classList.contains('node')) as Element | undefined;
        const id = g?.getAttribute('data-id');
        if (!id) return;
        this.selected = id;
        this.focusRow(id);
    };

    override render() {
        const type = this.model.type;
        const flow = type === 'flowchart';
        return html`<div class="bar" @keydown=${this.onKeyDown}>
                <juel-button type="plain" glyph="lucide-undo-2" button-label="Undo" title="Undo (Ctrl+Z)" ?disabled=${!this.history?.canUndo} @click=${() => this.undo()}></juel-button>
                <juel-button type="plain" glyph="lucide-redo-2" button-label="Redo" title="Redo (Ctrl+Y)" ?disabled=${!this.history?.canRedo} @click=${() => this.redo()}></juel-button>
                <span class="sep"></span>
                ${flow ? FlowShapes.map(s => html`<juel-button type="light" glyph=${ShapeGlyphs[s]} label=${ShapeLabels[s]} title=${`Add a ${ShapeLabels[s].toLowerCase()}`} @click=${() => this.addShape(s)}></juel-button>`)
                    : html`<juel-button type="light" glyph="lucide-plus" label=${`Add ${NodeWord[type]}`} @click=${() => this.addAfter(this.selected ?? this.model.nodes[this.model.nodes.length - 1]?.id ?? null)}></juel-button>
                    ${type === 'org' ? html`
                        <juel-button type="plain" glyph="lucide-indent-increase" button-label="Under the one above" title="Put it under the person above (Tab)" ?disabled=${!this.selected} @click=${() => this.selected && this.indent(this.selected, true)}></juel-button>
                        <juel-button type="plain" glyph="lucide-indent-decrease" button-label="Up a level" title="Move it up a level (Shift+Tab)" ?disabled=${!this.selected} @click=${() => this.selected && this.indent(this.selected, false)}></juel-button>` : nothing}
                    <juel-button type="plain" glyph="lucide-chevron-up" button-label="Move up" title="Move it up (Alt+↑)" ?disabled=${!this.selected} @click=${() => this.selected && this.move(this.selected, -1)}></juel-button>
                    <juel-button type="plain" glyph="lucide-chevron-down" button-label="Move down" title="Move it down (Alt+↓)" ?disabled=${!this.selected} @click=${() => this.selected && this.move(this.selected, 1)}></juel-button>`}
                <span class="hint">${flow ? 'Flowchart' : type === 'org' ? 'Org chart: Enter adds, Tab puts under, Alt+↑↓ reorders' : `${type[0].toUpperCase()}${type.slice(1)}: Enter adds, Alt+↑↓ reorders`}</span>
            </div>
            ${flow ? this.renderCanvas() : html`<div class="panes">
                ${this.renderOutline()}
                <div class="preview" @click=${this.onDrawingClick}><juel-diagram .data=${this.model}></juel-diagram></div>
            </div>`}`;
    }
}

export { DiagramTypes };

declare global {
    interface HTMLElementTagNameMap { 'juel-diagram-editor': JuelDiagramEditor }
}
