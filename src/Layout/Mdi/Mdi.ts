import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import interact from "@interactjs/interactjs";

import style from 'bundle-text:./mdi.less'

import { IsMobile } from "../../_Utils/IsMobile";
import { DomReady } from "../../_Utils/DomReady";
import "../Splitter/Splitter";
import "../../Navigation/Tabs/Tabs";
import { JuelTabs } from "../../Navigation/Tabs/Tabs";
import { TabsEvents } from "../../Navigation/Tabs/TabsEvents";

let nextPanelId = 0;
let nextSlotId = 0;
let nextMdiId = 0;

export interface MdiPanelOptions {
    title?: string;
    closable?: boolean;
    id?: string;
}

// Serialized arrangement, round-tripped by getLayout()/setLayout(). Panel
// *content* isn't part of this — it identifies panels by id, so it only
// makes sense to apply against an instance whose panels (by id) already
// exist. size is the pane's flex-basis percentage, when known.
export interface MdiLayoutPane {
    panelIds: string[];
    selectedIndex: number;
    size?: number;
}

export interface MdiLayout {
    order: 'stack' | 'row' | 'column';
    panes: MdiLayoutPane[];
}

interface MdiPanel {
    id: string;
    title: string;
    closable: boolean;
    element: HTMLElement;
}

// A row/column pane. One panel renders as a bare pane; more than one renders
// as a tab stack. Slots are the unit of drag-to-dock — dragging a singleton
// pane's title bar onto another slot's edge creates a new adjacent slot,
// dropping on its center merges into that slot's stack. This is a flat
// model (see juel TODO.md "juel-mdi — GoldenLayout parity", step 3): no
// arbitrary recursive nesting, one splitter level. A slot with >1 panel
// can't (yet) be dragged as a whole — only reordered internally — which
// keeps every drag interaction within a single shadow root.
interface MdiSlot {
    id: string;
    panels: MdiPanel[];
    selectedIndex: number;
    // Desired flex-basis percentage, set by setLayout(). Applied inline in
    // the render template (see _renderPane/_renderStack) rather than
    // patched onto the DOM after the fact — juel-splitter's own firstLoad()
    // assigns an equal-share flex-basis to any pane that doesn't already
    // carry one, and that first-mount pass races an out-of-band DOM patch
    // (whichever runs second used to win, unpredictably clobbering the
    // other). Driving it through render sidesteps the race entirely.
    size?: number;
}

type DockPosition = 'before' | 'after' | 'merge';

// A dependency-free multi-document layout (replaces the golden-layout
// integration this component originally used). 'stack' renders each child as
// a juel-tab; 'row'/'column' arrange children side by side or stacked,
// resizable via juel-splitter, and support drag-to-dock between panes.
// Mobile always falls back to a flat tab list, same as the original design.
//
// Two layers of state: _panels is the flat, light-DOM-order-derived panel
// registry (see _syncPanels) used for stack-mode rendering and as the
// addressable id-based registry behind add/remove/replace/focus/close.
// _slots (row/column only, see _syncSlots) groups panel ids into panes,
// independent of light-DOM order, so drag-to-dock can rearrange panes
// without touching panel identity. See juel TODO.md for the phased plan
// this is part of.
@customElement("juel-mdi")
export class JuelMdi extends LitElement {

    static styles = unsafeCSS(style);

    @property()
    order: ('stack' | 'row' | 'column') = 'stack';
    @property({ type: Boolean })
    tabs: boolean = false;
    // Panels default to closable; an individual panel can opt out with
    // data-closable="false" (mirrors the old golden-layout integration's
    // per-panel data-closable attribute).
    @property({ type: Boolean, attribute: 'default-closable' })
    defaultClosable: boolean = true;

    @state()
    private _panels: MdiPanel[] = [];
    @state()
    private _slots: MdiSlot[] = [];
    // Id of whatever's maximized — a panel id in stack mode never applies
    // (maximize isn't offered there); in row/column mode this is a slot id.
    @state()
    private _maximizedId?: string;

    private _panelIds = new WeakMap<HTMLElement, string>();
    private _observer?: MutationObserver;
    private _channel?: BroadcastChannel;
    private _popouts = new Map<string, { window: Window; element: HTMLElement }>();

    private useTabs(): boolean {
        return this.tabs || IsMobile() || this.order === 'stack';
    }

    connectedCallback() {
        super.connectedCallback();
        this._observer = new MutationObserver(() => this._syncPanels());
        this._observer.observe(this, { childList: true });

        // A stable id is the channel name, so a panel popped into its own
        // window opens a BroadcastChannel with the same name and still
        // reaches the rest of this instance's panels. Only assigned if the
        // app didn't already give one.
        if (!this.id) this.id = `juel-mdi-${++nextMdiId}`;
        this._channel = new BroadcastChannel(`juel-mdi:${this.id}`);
        this._channel.addEventListener('message', (e) => this._receiveBroadcast(e.data));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._observer?.disconnect();
        this._observer = undefined;
        this._channel?.close();
        this._channel = undefined;
        for (const id of [...this._popouts.keys()]) {
            this._popouts.get(id)?.window.close();
        }
        this._popouts.clear();
    }

    /** Send a message to every panel sharing this instance's channel — docked here, or (once a panel can be popped out) in another window. Delivered locally too, since BroadcastChannel doesn't loop a message back to its own sender. Listen with `mdi.addEventListener('mdi:' + type, e => ...)`. */
    broadcast(type: string, detail?: unknown): void {
        const message = { type, detail };
        this._channel?.postMessage(message);
        this._receiveBroadcast(message);
    }

    private _receiveBroadcast(message: { type: string; detail?: unknown }) {
        // Namespaced so arbitrary app message types can't collide with
        // juel-mdi's own lifecycle events (panel-added, panel-closing, …).
        this.dispatchEvent(new CustomEvent(`mdi:${message.type}`, { detail: message.detail, bubbles: true, composed: true }));
    }

    firstUpdated() {
        this._syncPanels();
        // Children declared in the light DOM may not be parsed and appended
        // yet at the first render (this element can upgrade mid-parse), so
        // re-sync once the document is fully ready.
        DomReady().then(() => this._syncPanels());
    }

    updated() {
        this._wireDocking();
    }

    private _panelIdFor(element: HTMLElement): string {
        let id = this._panelIds.get(element);
        if (!id) {
            id = element.id || `panel-${++nextPanelId}`;
            this._panelIds.set(element, id);
        }
        return id;
    }

    private _syncPanels() {
        this._panels = Array.from(this.children)
            .filter((el): el is HTMLElement => el instanceof HTMLElement)
            .map(element => ({
                id: this._panelIdFor(element),
                title: element.dataset.title ?? 'Panel',
                closable: this.defaultClosable && element.dataset.closable !== 'false',
                element,
            }));
        this._syncSlots();
        if (this._maximizedId
            && !this._panels.some(p => p.id === this._maximizedId)
            && !this._slots.some(s => s.id === this._maximizedId)) {
            // The maximized panel/slot was removed/closed out from under us.
            this._maximizedId = undefined;
        }
    }

    // Reconcile _slots against the freshly-rebuilt _panels: drop panels/
    // slots that no longer exist, refresh panel metadata in surviving
    // slots, and give any brand-new panel its own trailing slot. Existing
    // slot groupings (from prior docking) are preserved — this does not
    // rebuild from scratch the way _panels does, on purpose.
    private _syncSlots() {
        const byId = new Map(this._panels.map(p => [p.id, p] as const));
        const slots = this._slots
            .map(slot => {
                // Prefer keeping the same panel selected by id, even though
                // its index within the slot may have shifted, over letting
                // the selection silently follow the old index onto a
                // different panel. Only fall back to clamping when the
                // previously-selected panel itself was the one removed.
                const selectedId = slot.panels[slot.selectedIndex]?.id;
                const panels = slot.panels.filter(p => byId.has(p.id)).map(p => byId.get(p.id)!);
                const preservedIndex = selectedId ? panels.findIndex(p => p.id === selectedId) : -1;
                const selectedIndex = preservedIndex >= 0
                    ? preservedIndex
                    : Math.min(slot.selectedIndex, Math.max(0, panels.length - 1));
                return { ...slot, panels, selectedIndex };
            })
            .filter(slot => slot.panels.length > 0);

        const slotted = new Set(slots.flatMap(s => s.panels.map(p => p.id)));
        for (const panel of this._panels) {
            if (!slotted.has(panel.id)) {
                slots.push({ id: `slot-${++nextSlotId}`, panels: [panel], selectedIndex: 0 });
            }
        }
        this._slots = slots;
    }

    /** Add a panel and return its id. Content already in the light DOM should be moved/added directly instead — this is for programmatic use. Lands as its own new pane at the end; use focusPanel/dock via drag to place it elsewhere. */
    addPanel(content: HTMLElement, options: MdiPanelOptions = {}): string {
        const id = options.id ?? `panel-${++nextPanelId}`;
        if (options.title !== undefined) content.dataset.title = options.title;
        if (options.closable !== undefined) content.dataset.closable = String(options.closable);
        this._panelIds.set(content, id);
        this.appendChild(content); // MutationObserver -> _syncPanels -> re-render
        this.dispatchEvent(new CustomEvent('panel-added', { detail: { id }, bubbles: true, composed: true }));
        return id;
    }

    /** Remove a panel by id without going through the closable/close-event flow. */
    removePanel(id: string): boolean {
        const panel = this._panels.find(p => p.id === id);
        if (!panel) return false;
        panel.element.remove(); // MutationObserver -> _syncPanels -> re-render
        this.dispatchEvent(new CustomEvent('panel-removed', { detail: { id }, bubbles: true, composed: true }));
        return true;
    }

    getPanel(id: string): HTMLElement | undefined {
        return this._panels.find(p => p.id === id)?.element;
    }

    /** Swap a panel's content in place, keeping its id/position (and slot, in row/column mode). Unset options fall back to the outgoing element's title/closable. */
    replacePanel(id: string, content: HTMLElement, options: MdiPanelOptions = {}): boolean {
        const panel = this._panels.find(p => p.id === id);
        if (!panel) return false;
        const title = options.title ?? panel.element.dataset.title;
        const closable = options.closable !== undefined ? options.closable : panel.element.dataset.closable;
        if (title !== undefined) content.dataset.title = title;
        if (closable !== undefined) content.dataset.closable = String(closable);
        this._panelIds.set(content, id);
        panel.element.replaceWith(content); // MutationObserver -> _syncPanels -> re-render
        this.dispatchEvent(new CustomEvent('panel-replaced', { detail: { id }, bubbles: true, composed: true }));
        return true;
    }

    /** Bring a panel to the front: selects its tab in stack mode, or (in row/column mode) selects it within its slot, restores the layout if a different slot is maximized, and moves focus into it. */
    focusPanel(id: string): boolean {
        const panel = this._panels.find(p => p.id === id);
        if (!panel) return false;

        if (this.useTabs()) {
            const index = this._panels.indexOf(panel);
            const tabs = this.shadowRoot?.querySelector('juel-tabs') as JuelTabs | null;
            tabs?.selectTab(index);
        } else {
            const slot = this._slots.find(s => s.panels.some(p => p.id === id));
            if (slot) {
                const indexInSlot = slot.panels.findIndex(p => p.id === id);
                if (indexInSlot >= 0 && slot.selectedIndex !== indexInSlot) {
                    this._slots = this._slots.map(s => s === slot ? { ...s, selectedIndex: indexInSlot } : s);
                }
                if (this._maximizedId && this._maximizedId !== slot.id) {
                    this._maximizedId = undefined;
                }
            }
            this.updateComplete.then(() => panel.element.focus());
        }

        this.dispatchEvent(new CustomEvent('panel-focused', { detail: { id }, bubbles: true, composed: true }));
        return true;
    }

    /**
     * Move a panel into its own same-origin browser window. Copies the main
     * document's stylesheets/scripts into the popout so custom elements
     * keep working and styling matches; the moved element is the same live
     * object (adopted, not re-parsed), so its internal state survives the
     * move. Returns null if the panel doesn't exist, is already popped, or
     * the popup was blocked.
     *
     * Verified 2026-09-12 via a real Playwright click-through (multi-window,
     * cross-window BroadcastChannel, redock-on-close and programmatic
     * redock) — see TODO.md. That pass caught a real bug: script tags were
     * being copied via importNode, which preserves a script's "already
     * started" flag and so never actually executes the clone — fixed by
     * creating fresh <script src> elements in the popout document instead.
     */
    popPanel(id: string, features = 'width=640,height=480'): Window | null {
        if (this._popouts.has(id)) return this._popouts.get(id)!.window;
        const panel = this._panels.find(p => p.id === id);
        if (!panel) return null;

        const popout = window.open('', '_blank', features);
        if (!popout) return null; // popup blocked

        popout.document.title = panel.title;
        popout.document.head.append(
            ...Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                .map(node => popout.document.importNode(node, true)),
        );
        // Cloning a <script> (importNode/cloneNode) copies its "already
        // started" flag along with it per spec, so an imported clone never
        // actually executes in the popout's document — window.juel and every
        // customElements.define() call would silently be missing there. A
        // fresh <script> element with the same src, created directly in the
        // popout document, does load and run normally.
        for (const script of Array.from(document.querySelectorAll('script[src]'))) {
            const clone = popout.document.createElement('script');
            clone.src = (script as HTMLScriptElement).src;
            popout.document.head.appendChild(clone);
        }
        popout.document.body.style.margin = '0';
        popout.document.body.style.height = '100vh';

        panel.element.removeAttribute('slot');
        popout.document.body.appendChild(panel.element); // moves the node out of `this` — MutationObserver -> _syncPanels drops it from the layout
        popout.addEventListener('pagehide', () => this._redockPopout(id));

        this._popouts.set(id, { window: popout, element: panel.element });
        this.dispatchEvent(new CustomEvent('panel-popped', { detail: { id }, bubbles: true, composed: true }));
        return popout;
    }

    /** Bring a popped-out panel back and close its window. */
    redockPanel(id: string): boolean {
        const entry = this._popouts.get(id);
        if (!entry) return false;
        entry.window.close(); // -> pagehide -> _redockPopout
        return true;
    }

    isPopped(id: string): boolean {
        return this._popouts.has(id);
    }

    private _redockPopout(id: string) {
        const entry = this._popouts.get(id);
        if (!entry) return;
        this._popouts.delete(id);
        this.appendChild(entry.element); // MutationObserver -> _syncPanels -> re-appears as a trailing panel/pane
        this.dispatchEvent(new CustomEvent('panel-docked-back', { detail: { id }, bubbles: true, composed: true }));
    }

    /** Serialize the current arrangement (order, pane groupings, selected tab per pane, pane sizes) — not panel content, which is addressed by id. Reflects the stored order/slots, not the transient mobile tabs fallback. */
    getLayout(): MdiLayout {
        if (this.order === 'stack') {
            return { order: 'stack', panes: [{ panelIds: this._panels.map(p => p.id), selectedIndex: 0 }] };
        }

        const sizeBySlotId = new Map<string, number>();
        this.shadowRoot?.querySelectorAll<HTMLElement>('.pane[data-slot-id]').forEach(el => {
            const size = parseFloat(el.style.flexBasis);
            if (!Number.isNaN(size) && el.dataset.slotId) sizeBySlotId.set(el.dataset.slotId, size);
        });

        return {
            order: this.order,
            panes: this._slots.map(slot => ({
                panelIds: slot.panels.map(p => p.id),
                selectedIndex: slot.selectedIndex,
                size: sizeBySlotId.get(slot.id),
            })),
        };
    }

    /** Apply a saved arrangement against the current panel set (matched by id). Panel ids not mentioned in the layout get their own trailing pane rather than disappearing; ids in the layout with no matching current panel are skipped. */
    setLayout(layout: MdiLayout): void {
        const byId = new Map(this._panels.map(p => [p.id, p] as const));

        if (layout.order === 'stack') {
            const ordered = (layout.panes[0]?.panelIds ?? [])
                .map(id => byId.get(id))
                .filter((p): p is MdiPanel => !!p);
            const remaining = this._panels.filter(p => !ordered.includes(p));
            [...ordered, ...remaining].forEach(p => this.appendChild(p.element));
            return;
        }

        this.order = layout.order;

        const slots: MdiSlot[] = layout.panes.map(pane => ({
            id: `slot-${++nextSlotId}`,
            panels: pane.panelIds.map(pid => byId.get(pid)).filter((p): p is MdiPanel => !!p),
            selectedIndex: pane.selectedIndex,
            size: pane.size,
        })).filter(s => s.panels.length > 0);

        const mentioned = new Set(slots.flatMap(s => s.panels.map(p => p.id)));
        for (const panel of this._panels) {
            if (!mentioned.has(panel.id)) {
                slots.push({ id: `slot-${++nextSlotId}`, panels: [panel], selectedIndex: 0 });
            }
        }

        this._slots = slots;
        this._maximizedId = undefined;
    }

    private _closePanel(id: string) {
        const panel = this._panels.find(p => p.id === id);
        if (!panel || !panel.closable) return;
        const evt = new CustomEvent('panel-closing', { detail: { id }, bubbles: true, composed: true, cancelable: true });
        this.dispatchEvent(evt);
        if (evt.defaultPrevented) return;
        this.removePanel(id);
    }

    private _onTabClose(e: CustomEvent<{ index: number }>) {
        const panel = this._panels[e.detail.index];
        if (panel) this._closePanel(panel.id);
    }

    // Light-DOM order is the source of truth for panel order in stack mode
    // (see _syncPanels), so reordering means physically repositioning the
    // panel's element — insertBefore auto-removes it from its old spot.
    // The MutationObserver picks up the childList change and re-syncs.
    private _onTabReorder(e: CustomEvent<{ from: number; to: number }>) {
        const moving = this._panels[e.detail.from];
        const target = this._panels[e.detail.to];
        if (!moving || !target || moving === target) return;
        this.insertBefore(moving.element, target.element);
    }

    // Within-slot reorder (row/column mode) is pure state — slot membership
    // isn't tied to light-DOM order the way stack mode is, so this just
    // reorders the slot's panels array; _syncSlots preserves array order
    // across re-syncs.
    private _reorderWithinSlot(slot: MdiSlot, from: number, to: number) {
        if (from === to) return;
        const panels = [...slot.panels];
        const [moved] = panels.splice(from, 1);
        panels.splice(to, 0, moved);
        this._slots = this._slots.map(s => s === slot ? { ...s, panels } : s);
    }

    private _maximizePanel(id: string) {
        this._maximizedId = id;
    }

    private _restorePanel() {
        this._maximizedId = undefined;
    }

    // Move panelId out of its current slot and either merge it into
    // targetSlotId's stack, or split off a new slot before/after it.
    // Filter-then-reinsert (rather than index arithmetic on the live array)
    // sidesteps off-by-one bugs when the origin slot is emptied by the
    // move — including the self-drop case, which naturally becomes a
    // vanished target and a safe no-op.
    private _dockPanel(panelId: string, targetSlotId: string, position: DockPosition) {
        const panel = this._panels.find(p => p.id === panelId);
        if (!panel) return;

        let slots = this._slots
            .map(s => ({ ...s, panels: s.panels.filter(p => p.id !== panelId) }))
            .filter(s => s.panels.length > 0);

        const targetIndex = slots.findIndex(s => s.id === targetSlotId);
        if (targetIndex < 0) return;

        if (position === 'merge') {
            const target = slots[targetIndex];
            slots[targetIndex] = { ...target, panels: [...target.panels, panel], selectedIndex: target.panels.length };
        } else {
            const newSlot: MdiSlot = { id: `slot-${++nextSlotId}`, panels: [panel], selectedIndex: 0 };
            slots.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, newSlot);
        }

        this._slots = slots;
        if (this._maximizedId && !slots.some(s => s.id === this._maximizedId)) {
            this._maximizedId = undefined;
        }
        this.dispatchEvent(new CustomEvent('panel-docked', { detail: { id: panelId, targetSlotId, position }, bubbles: true, composed: true }));
    }

    // Resolve a dropped drag handle — either a singleton pane's title bar
    // or a tab from a stack's <juel-tabs> — back to the panel id it
    // represents, plus the slot it was dragged out of.
    private _resolveDraggedPanel(handle: HTMLElement): { panelId: string; originSlotId: string } | null {
        if (handle.classList.contains('pane-title')) {
            const draggedPane = handle.closest('.pane') as HTMLElement | null;
            const panelId = draggedPane?.dataset.panelId;
            const originSlotId = draggedPane?.dataset.slotId;
            return panelId && originSlotId ? { panelId, originSlotId } : null;
        }

        // A '.tab' lives inside <juel-tabs>'s own shadow root — its host
        // element is the <juel-tabs> in the light DOM of the origin pane.
        const tabsRoot = handle.getRootNode();
        const tabsEl = tabsRoot instanceof ShadowRoot ? (tabsRoot.host as HTMLElement) : null;
        const originPane = tabsEl?.closest('.pane[data-slot-id]') as HTMLElement | null;
        const originSlotId = originPane?.dataset.slotId;
        const slot = originSlotId ? this._slots.find(s => s.id === originSlotId) : undefined;
        const index = Number(handle.dataset.index);
        const panel = slot && !Number.isNaN(index) ? slot.panels[index] : undefined;
        return panel && originSlotId ? { panelId: panel.id, originSlotId } : null;
    }

    // Dragging a pane/tab handle out past this instance's own bounds pops
    // that panel into its own window — the drag-equivalent of
    // GoldenLayout's drag-to-new-window. A release still inside these
    // bounds either landed on a valid dock/reorder target already (handled
    // separately, by whichever dropzone matched) or in a gap (splitter
    // gutter, tab bar padding) with nothing to do, so it just snaps back.
    private _popOutIfReleasedOutside(panelId: string, client: { x: number; y: number }) {
        const rect = this.getBoundingClientRect();
        if (client.x < rect.left || client.x > rect.right || client.y < rect.top || client.y > rect.bottom) {
            this.popPanel(panelId);
        }
    }

    private _onTabDragEnd(e: CustomEvent<{ index: number; client: { x: number; y: number } }>) {
        const panel = this._panels[e.detail.index];
        if (panel) this._popOutIfReleasedOutside(panel.id, e.detail.client);
    }

    private _onSlotTabDragEnd(slot: MdiSlot, e: CustomEvent<{ index: number; client: { x: number; y: number } }>) {
        const panel = slot.panels[e.detail.index];
        if (panel) this._popOutIfReleasedOutside(panel.id, e.detail.client);
    }

    // Draggable: each singleton pane's title bar (only — a multi-panel
    // slot can't be dragged as a whole in this pass, see the MdiSlot doc
    // comment). Dropzone: every pane, singleton or stack. Re-wired after
    // every render since Lit may reuse or replace these elements.
    private _wireDocking() {
        const root = this.shadowRoot;
        if (!root || this.useTabs()) return;

        root.querySelectorAll<HTMLElement>('.pane[data-panel-id] > .pane-title').forEach(handle => {
            interact(handle).unset();
            interact(handle).draggable({
                listeners: {
                    start: () => handle.closest('.pane')?.classList.add('dragging'),
                    move: (event) => {
                        const x = (parseFloat(handle.dataset.dragX || '0')) + event.dx;
                        const y = (parseFloat(handle.dataset.dragY || '0')) + event.dy;
                        handle.style.transform = `translate(${x}px, ${y}px)`;
                        handle.dataset.dragX = String(x);
                        handle.dataset.dragY = String(y);
                    },
                    end: (event) => {
                        handle.closest('.pane')?.classList.remove('dragging');
                        handle.style.transform = '';
                        delete handle.dataset.dragX;
                        delete handle.dataset.dragY;
                        const panelId = (handle.closest('.pane') as HTMLElement | null)?.dataset.panelId;
                        if (panelId) this._popOutIfReleasedOutside(panelId, event.client);
                    },
                },
            });
        });

        // A tab within a stack (<juel-tabs> is given `reorderable`, see
        // _renderStack) is already made draggable by juel-tabs itself, for
        // in-stack reordering — interactjs's dropzone system picks up any
        // active drag regardless of which Interactable started it, so
        // accepting '.tab' here (in addition to '.pane-title') lets a tab
        // be dragged out of its stack into its own pane, or onto another
        // pane, without juel-mdi needing its own draggable binding on it.
        root.querySelectorAll<HTMLElement>('.pane[data-slot-id]').forEach(pane => {
            interact(pane).unset();
            interact(pane).dropzone({
                accept: '.pane-title, .tab',
                overlap: 0.25,
                ondragenter: (event) => (event.target as HTMLElement).classList.add('drop-target'),
                ondragleave: (event) => (event.target as HTMLElement).classList.remove('drop-target'),
                ondrop: (event) => {
                    const dropzoneEl = event.target as HTMLElement;
                    dropzoneEl.classList.remove('drop-target');
                    const dragged = event.relatedTarget as HTMLElement;
                    const targetSlotId = dropzoneEl.dataset.slotId;
                    if (!targetSlotId) return;

                    const resolved = this._resolveDraggedPanel(dragged);
                    if (!resolved) return;
                    const { panelId, originSlotId } = resolved;

                    const rect = dropzoneEl.getBoundingClientRect();
                    const pointer = (event as any).dragEvent?.client ?? (event as any).client;
                    let position: DockPosition = 'merge';
                    if (pointer) {
                        const fraction = this.order === 'column'
                            ? (pointer.y - rect.top) / rect.height
                            : (pointer.x - rect.left) / rect.width;
                        if (fraction < 0.25) position = 'before';
                        else if (fraction > 0.75) position = 'after';
                    }
                    // Dropping a tab back into the middle of its own stack
                    // isn't a dock at all — that's an in-stack reorder,
                    // which juel-tabs already handles itself. Dropping it
                    // near an *edge* of its own pane is still a real dock
                    // (split it out into its own adjacent pane), so only
                    // the no-op merge-onto-self case is skipped here.
                    if (originSlotId === targetSlotId && position === 'merge') return;
                    this._dockPanel(panelId, targetSlotId, position);
                },
            });
        });
    }

    private _renderPane(slot: MdiSlot, panel: MdiPanel, maximized: boolean) {
        panel.element.setAttribute('slot', panel.id);
        const style = !maximized && slot.size !== undefined ? `flex: 1 1 ${slot.size}%` : '';
        return html`<div class="pane ${maximized ? 'maximized' : ''}" data-slot-id="${slot.id}" data-panel-id="${panel.id}" style="${style}">
            <div class="pane-title">
                <span class="pane-title-text">${panel.title}</span>
                <button
                    type="button"
                    class="${maximized ? 'restore-button' : 'maximize-button'}"
                    aria-label="${maximized ? 'Restore' : 'Maximize'} ${panel.title}"
                    @click=${() => maximized ? this._restorePanel() : this._maximizePanel(slot.id)}></button>
                ${panel.closable ? html`<button type="button" class="close-button" aria-label="Close ${panel.title}" @click=${() => this._closePanel(panel.id)}></button>` : ''}
            </div>
            <div class="pane-body"><slot name="${panel.id}"></slot></div>
        </div>`;
    }

    private _renderStack(slot: MdiSlot, maximized: boolean) {
        const style = !maximized && slot.size !== undefined ? `flex: 1 1 ${slot.size}%` : '';
        return html`<div class="pane ${maximized ? 'maximized' : ''}" data-slot-id="${slot.id}" style="${style}">
            <juel-tabs
                reorderable
                .selectedIndex=${slot.selectedIndex}
                @tab-changed=${(e: CustomEvent) => this._slots = this._slots.map(s => s === slot ? { ...s, selectedIndex: e.detail.index } : s)}
                @tab-close=${(e: CustomEvent) => { const p = slot.panels[e.detail.index]; if (p) this._closePanel(p.id); }}
                @tab-reorder=${(e: CustomEvent) => this._reorderWithinSlot(slot, e.detail.from, e.detail.to)}
                @tab-drag-end=${(e: CustomEvent) => this._onSlotTabDragEnd(slot, e)}>
                ${repeat(slot.panels, p => p.id, panel => {
                    panel.element.setAttribute('slot', panel.id);
                    return html`<juel-tab title="${panel.title}" ?closable=${panel.closable}><slot name="${panel.id}"></slot></juel-tab>`;
                })}
                <button
                    type="button"
                    slot="append"
                    class="${maximized ? 'restore-button' : 'maximize-button'}"
                    aria-label="${maximized ? 'Restore' : 'Maximize'} panel group"
                    @click=${() => maximized ? this._restorePanel() : this._maximizePanel(slot.id)}></button>
            </juel-tabs>
        </div>`;
    }

    private _renderSlot(slot: MdiSlot, maximized: boolean) {
        return slot.panels.length === 1
            ? this._renderPane(slot, slot.panels[0], maximized)
            : this._renderStack(slot, maximized);
    }

    render() {
        if (this._panels.length === 0) return html``;

        if (this.useTabs()) {
            return html`<juel-tabs
                reorderable
                @tab-close=${(e: CustomEvent) => this._onTabClose(e)}
                @tab-reorder=${(e: CustomEvent) => this._onTabReorder(e)}
                @tab-drag-end=${(e: CustomEvent) => this._onTabDragEnd(e)}>${repeat(this._panels, p => p.id, (panel) => {
                panel.element.setAttribute('slot', panel.id);
                return html`<juel-tab title="${panel.title}" ?closable=${panel.closable}><slot name="${panel.id}"></slot></juel-tab>`;
            })}</juel-tabs>`;
        }

        const maximized = this._maximizedId ? this._slots.find(s => s.id === this._maximizedId) : undefined;
        if (maximized) {
            return this._renderSlot(maximized, true);
        }

        // A row/column left with a single slot doesn't need a splitter
        // wrapping it — this is the flat-model equivalent of GoldenLayout
        // auto-collapsing a container down to its one remaining child.
        if (this._slots.length === 1) {
            return this._renderSlot(this._slots[0], false);
        }

        // Keyed by slot id (not plain .map) so drag-to-dock reordering the
        // _slots array doesn't hand one slot's DOM node — and whatever
        // interactjs/juel-tabs internal state rides on it — off to a
        // different slot that happens to land at the same position.
        return html`<juel-splitter ?vertical=${this.order === 'column'}>${repeat(this._slots, s => s.id, slot => this._renderSlot(slot, false))}</juel-splitter>`;
    }
}
