// Dragging for <juel-quiz> sort and match: pointer events, so mouse, pen and
// touch share one path. An element with `data-drag="<index>"` can be picked up;
// one with `data-drop="<place>"` (or `data-drop="pool"`) takes it. The drop
// target is found with `elementsFromPoint` on the shadow root, so the drag
// never touches the light DOM and knows nothing about what the places mean.

export interface DragOptions {
    /** Where the draggable items and the drop targets live. */
    root: ShadowRoot;
    /** An item was dropped: `to` is a place, or null for the pool. */
    onDrop(index: number, to: number | null): void;
    /** False while dragging is off (e.g. the answer is showing). */
    enabled?(): boolean;
}

/** How far (px) the pointer must move before a press becomes a drag. */
const THRESHOLD = 4;

export class PointerDrag {
    private item: HTMLElement | null = null;
    private pointerId = -1;
    private startX = 0;
    private startY = 0;
    private dragging = false;
    private over: HTMLElement | null = null;

    constructor(private readonly options: DragOptions) {
        const root = options.root;
        root.addEventListener('pointerdown', this.down as EventListener);
        root.addEventListener('pointermove', this.move as EventListener);
        root.addEventListener('pointerup', this.up as EventListener);
        root.addEventListener('pointercancel', this.cancel as EventListener);
    }

    private readonly down = (e: PointerEvent) => {
        if (this.item || (e.pointerType === 'mouse' && e.button !== 0)) return;
        if (this.options.enabled && !this.options.enabled()) return;
        const item = (e.target as Element | null)?.closest?.('[data-drag]') as HTMLElement | null;
        if (!item) return;
        this.item = item;
        this.pointerId = e.pointerId;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.dragging = false;
        try { item.setPointerCapture(e.pointerId); } catch { /* not an active pointer (a synthetic event) */ }
        e.preventDefault(); // no text selection, no native drag
    };

    private readonly move = (e: PointerEvent) => {
        const item = this.item;
        if (!item || e.pointerId !== this.pointerId) return;
        const dx = e.clientX - this.startX, dy = e.clientY - this.startY;
        if (!this.dragging && Math.hypot(dx, dy) < THRESHOLD) return;
        this.dragging = true;
        item.classList.add('dragging');
        item.style.transform = `translate(${dx}px, ${dy}px)`;
        this.highlight(this.target(e.clientX, e.clientY));
    };

    private readonly up = (e: PointerEvent) => {
        const item = this.item;
        if (!item || e.pointerId !== this.pointerId) return;
        const target = this.dragging ? this.target(e.clientX, e.clientY) : null;
        this.end();
        if (!target) return;
        const index = Number(item.dataset.drag);
        const place = target.dataset.drop;
        this.options.onDrop(index, place === 'pool' ? null : Number(place));
    };

    private readonly cancel = (e: PointerEvent) => {
        if (this.item && e.pointerId === this.pointerId) this.end();
    };

    /** The drop target under a point, skipping the item being dragged. */
    private target(x: number, y: number): HTMLElement | null {
        for (const el of this.options.root.elementsFromPoint(x, y)) {
            if (el === this.item || this.item?.contains(el)) continue;
            const drop = el.closest('[data-drop]') as HTMLElement | null;
            if (drop && this.options.root.contains(drop)) return drop;
        }
        return null;
    }

    private highlight(el: HTMLElement | null) {
        if (el === this.over) return;
        this.over?.classList.remove('over');
        el?.classList.add('over');
        this.over = el;
    }

    private end() {
        const item = this.item;
        if (item) {
            item.classList.remove('dragging');
            item.style.transform = '';
            if (item.hasPointerCapture?.(this.pointerId)) item.releasePointerCapture(this.pointerId);
        }
        this.highlight(null);
        this.item = null;
        this.pointerId = -1;
        this.dragging = false;
    }
}
