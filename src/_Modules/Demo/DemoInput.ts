// The demo's hand (SHOW-ME-PLAN SM0): pointer, mouse, drag-and-drop and key
// events a page can't tell from a person's, sent where a real pointer at that
// spot would send them, so the page's own code runs as it does for people.
//
// - Hover is tracked like a browser's: over/out on the element under the
//   pointer, enter/leave on each element (through shadow roots) it moves into
//   or out of. So `pointerenter` opens a juel-menu-item's submenu.
// - Pointer capture works: while a demo plays, setPointerCapture with the
//   demo's pointer id is recorded (the browser would throw: it knows no such
//   pointer) and moves and the release go to the capturing element.
// - A press on a `draggable` element that moves turns into HTML drag-and-drop
//   (dragstart, dragenter/over/leave, drop, dragend) with a DataTransfer.
// - Typing goes through `beforeinput`/`input` and setRangeText for fields, and
//   execCommand('insertText') for contenteditable (CodeMirror included).
// - A sandboxed frame the page can't reach gets the pointer through its agent
//   (DemoAgent.ts): moves, the press and the release go to it as messages, in
//   its own px, and it sends the events inside; so do keys and typing while it
//   has the focus.
// Events carry `isTrusted: false`; the runner uses that to tell the person's
// own input from the demo's (DemoRunner.ts).
import { KeyCombo, Point } from "./DemoScript";
import { Hit, composedChain, composedContains, composedParent, deepActiveElement, frameMap, hitAt, toLocal, windowOf } from "./DemoGeometry";
import { iframeMap, isOpaqueFrame, tell } from "./DemoRemote";

/** The demo pointer's id: not one a real device uses. */
export const DemoPointerId = 7311;

type Capturable = { setPointerCapture(id: number): void; releasePointerCapture(id: number): void; hasPointerCapture(id: number): boolean };

/** One simulated pointer, its hover, press, capture and drag. */
export class DemoPointer {
    private hovered: Element[] = [];
    private hoverWin: Window | null = null;
    private overEl: Element | null = null;
    private downEl: Element | null = null;
    private downAt: Point | null = null;
    private pressed = false;
    private captured: Element | null = null;
    private patched = new Map<Window, Capturable>();
    private drag: { source: Element; data: DataTransfer; over: Element | null; accepted: boolean } | null = null;
    private dragSource: Element | null = null;
    /** The unreachable frame the pointer is over, and the one it was pressed in (which keeps it till it's let go). */
    private remoteOver: HTMLIFrameElement | null = null;
    private remotePressed: HTMLIFrameElement | null = null;
    /** Where the pointer is, on the top page. */
    public at: Point = { x: -1, y: -1 };
    /** Called just before each hit test, so the runner can make its own parts transparent. */
    public beforeHit: (() => () => void) | null = null;

    constructor(private top: Window = window) { }

    /** Moves the pointer to `page` (top-page coordinates): hover changes and a move event. */
    public move(page: Point): void {
        this.at = page;
        if (this.remotePressed) {
            this.toFrame(this.remotePressed, "move");
            return;
        }
        if (this.captured) {
            this.send(this.captured, "pointermove", page);
            this.send(this.captured, "mousemove", page);
            return;
        }
        const hit = this.hit(page);
        if (!hit) return;
        if (this.drag) {
            this.dragOver(hit);
            return;
        }
        this.hover(hit);
        if (isOpaqueFrame(hit.el)) {
            this.remoteOver = hit.el;
            this.toFrame(hit.el, "move");
            return;
        }
        this.leaveFrame();
        this.send(hit.el, "pointermove", page);
        this.send(hit.el, "mousemove", page);
        if (this.pressed && this.dragSource && this.downAt && Math.hypot(page.x - this.downAt.x, page.y - this.downAt.y) > 4) this.startDrag(hit);
    }

    /** Presses the button where the pointer is. */
    public down(detail = 1): void {
        const hit = this.hit(this.at);
        if (!hit) return;
        this.hover(hit);
        if (isOpaqueFrame(hit.el)) {
            // Pressed in an unreachable frame: it gets the press, the moves and the release.
            this.pressed = true;
            this.remotePressed = this.remoteOver = hit.el;
            hit.el.focus({ preventScroll: true });
            this.toFrame(hit.el, "down", detail);
            return;
        }
        this.pressed = true;
        this.downEl = hit.el;
        this.downAt = this.at;
        this.patchCapture(hit.win);
        // A cancelled pointerdown holds back the mouse events, not the focus; a cancelled mousedown holds the focus.
        const go = this.send(hit.el, "pointerdown", this.at, { detail });
        if (!go || this.send(hit.el, "mousedown", this.at, { detail })) this.focusFrom(hit.el);
        this.dragSource = composedChain(hit.el).find(e => (e as HTMLElement).draggable === true && e.getAttribute("draggable") === "true") ?? null;
    }

    /** Lets the button go: up, then a click where it went down and came up on the same thing. */
    public up(detail = 1): void {
        if (!this.pressed) return;
        this.pressed = false;
        if (this.remotePressed) {
            this.toFrame(this.remotePressed, "up", detail);
            this.remotePressed = null;
            return;
        }
        if (this.drag) {
            this.endDrag();
            this.downEl = null;
            return;
        }
        const captured = this.captured;
        const hit = captured ? null : this.hit(this.at);
        const target = captured ?? hit?.el;
        if (target) {
            this.send(target, "pointerup", this.at, { detail });
            this.send(target, "mouseup", this.at, { detail });
        }
        if (captured) {
            this.captured = null;
            this.send(captured, "lostpointercapture", this.at);
        }
        // The click goes to the nearest element both the press and the release were in.
        const upEl = hit?.el ?? (captured ? this.hit(this.at)?.el : null) ?? null;
        const clickOn = this.downEl && upEl ? commonAncestor(this.downEl, upEl) : null;
        if (clickOn) {
            this.send(clickOn, "click", this.at, { detail });
            if (detail === 2) this.send(clickOn, "dblclick", this.at, { detail: 2 });
        }
        this.downEl = null;
        this.dragSource = null;
    }

    /** Stops whatever's under way (a press, a capture, a drag) and leaves everything hovered. */
    public cancel(): void {
        this.remotePressed = null;
        this.leaveFrame();
        if (this.drag) {
            const d = this.drag;
            this.drag = null;
            if (d.over) this.sendDrag(d.over, "dragleave", d.data);
            this.sendDrag(d.source, "dragend", d.data);
        } else if (this.pressed) {
            const target = this.captured ?? this.downEl;
            if (target) this.send(target, "pointercancel", this.at);
        }
        this.pressed = false;
        this.captured = null;
        this.downEl = null;
        this.dragSource = null;
        this.leaveAll();
        this.unpatchCapture();
    }

    /** Sends a key (with its modifiers) to what has the focus, and does the few defaults a page relies on. */
    public key(combo: KeyCombo): void {
        const el = deepActiveElement(this.top.document) ?? this.top.document.body;
        if (isOpaqueFrame(el)) {
            tell(el, { juelDemo: "key", combo });
            return;
        }
        const win = windowOf(el) as typeof window;
        const init = { key: combo.key, code: combo.code, ctrlKey: combo.ctrlKey, shiftKey: combo.shiftKey, altKey: combo.altKey, metaKey: combo.metaKey, bubbles: true, cancelable: true, composed: true, view: win };
        const go = el.dispatchEvent(new win.KeyboardEvent("keydown", init));
        if (go && !combo.ctrlKey && !combo.altKey && !combo.metaKey) defaultKeyAction(el, combo.key);
        el.dispatchEvent(new win.KeyboardEvent("keyup", init));
    }

    /** Types `text` into what has the focus, one character at a time (the runner paces it). */
    public typeChar(ch: string): void {
        const el = deepActiveElement(this.top.document);
        if (!el) return;
        if (isOpaqueFrame(el)) tell(el, { juelDemo: "type", text: ch });
        else insertText(el, ch);
    }

    // ---- unreachable frames -------------------------------------------

    /** Tells an unreachable frame's agent the pointer's move, press or release, at the point in its own px. */
    private toFrame(frame: HTMLIFrameElement, kind: "move" | "down" | "up", detail = 1): void {
        const local = toLocal(iframeMap(frame, this.top), this.at);
        tell(frame, { juelDemo: "pointer", kind, x: local.x, y: local.y, detail });
    }

    /** The pointer has left the unreachable frame it was over. */
    private leaveFrame(): void {
        if (!this.remoteOver) return;
        tell(this.remoteOver, { juelDemo: "pointer", kind: "leave" });
        this.remoteOver = null;
    }

    // ---- hover ---------------------------------------------------------

    private hit(page: Point): Hit | null {
        const restore = this.beforeHit?.();
        try {
            return hitAt(page, this.top);
        } finally {
            restore?.();
        }
    }

    private hover(hit: Hit): void {
        const chain = composedChain(hit.el);
        if (hit.win !== this.hoverWin) this.leaveAll();
        const old = this.hovered;
        if (this.overEl && this.overEl !== hit.el) {
            this.send(this.overEl, "pointerout", this.at, { relatedTarget: hit.el });
            this.send(this.overEl, "mouseout", this.at, { relatedTarget: hit.el });
        }
        // Leave, innermost first; enter, outermost first.
        for (const e of old) if (!chain.includes(e)) {
            this.send(e, "pointerleave", this.at, { bubbles: false, relatedTarget: hit.el });
            this.send(e, "mouseleave", this.at, { bubbles: false, relatedTarget: hit.el });
        }
        if (this.overEl !== hit.el) {
            this.send(hit.el, "pointerover", this.at, { relatedTarget: this.overEl });
            this.send(hit.el, "mouseover", this.at, { relatedTarget: this.overEl });
        }
        for (const e of [...chain].reverse()) if (!old.includes(e)) {
            this.send(e, "pointerenter", this.at, { bubbles: false, relatedTarget: this.overEl });
            this.send(e, "mouseenter", this.at, { bubbles: false, relatedTarget: this.overEl });
        }
        this.hovered = chain;
        this.hoverWin = hit.win;
        this.overEl = hit.el;
    }

    private leaveAll(): void {
        if (this.overEl?.isConnected) {
            this.send(this.overEl, "pointerout", this.at);
            this.send(this.overEl, "mouseout", this.at);
        }
        for (const e of this.hovered) if (e.isConnected) {
            this.send(e, "pointerleave", this.at, { bubbles: false });
            this.send(e, "mouseleave", this.at, { bubbles: false });
        }
        this.hovered = [];
        this.overEl = null;
        this.hoverWin = null;
    }

    // ---- events --------------------------------------------------------

    /** Sends a pointer or mouse event to `el` at `page`, in `el`'s own window and coordinates. Returns false if it was cancelled. */
    private send(el: Element, type: string, page: Point, extra: { detail?: number; bubbles?: boolean; relatedTarget?: Element | null } = {}): boolean {
        const win = windowOf(el) as typeof window;
        const local = toLocal(frameMap(win, this.top), page);
        const pressing = this.pressed && type !== "pointerup" && type !== "mouseup" && type !== "click" && type !== "dblclick";
        const init: PointerEventInit = {
            bubbles: extra.bubbles ?? true,
            cancelable: !/enter|leave|lostpointercapture/.test(type),
            // As a browser's: enter and leave stay in their shadow root (a host gets its own when the pointer crosses it).
            composed: !/enter|leave/.test(type),
            view: win,
            detail: extra.detail ?? (/click|down|up/.test(type) ? 1 : 0),
            clientX: local.x,
            clientY: local.y,
            screenX: local.x,
            screenY: local.y,
            button: /down|up|click/.test(type) ? 0 : (type.endsWith("move") ? -1 : 0),
            buttons: pressing || type.endsWith("down") ? 1 : 0,
            relatedTarget: extra.relatedTarget && windowOf(extra.relatedTarget) === win ? extra.relatedTarget : null,
        };
        if (type.startsWith("pointer") || type === "lostpointercapture" || type === "gotpointercapture") {
            Object.assign(init, { pointerId: DemoPointerId, pointerType: "mouse", isPrimary: true, width: 1, height: 1, pressure: init.buttons ? 0.5 : 0 });
            return el.dispatchEvent(new win.PointerEvent(type, init));
        }
        return el.dispatchEvent(new win.MouseEvent(type, init));
    }

    private focusFrom(el: Element): void {
        for (const e of composedChain(el)) {
            const h = e as HTMLElement;
            if (h.isContentEditable || ((h.tabIndex >= 0 || h.hasAttribute?.("tabindex")) && !(h as HTMLButtonElement).disabled) || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(h.tagName)) {
                if (h.isContentEditable) {
                    // Into the editable the press was on, at the point pressed.
                    const doc = h.ownerDocument;
                    const local = toLocal(frameMap(windowOf(h), this.top), this.at);
                    const caret = (doc as Document & { caretRangeFromPoint?(x: number, y: number): Range | null }).caretRangeFromPoint?.(local.x, local.y);
                    let host: Element | null = h;
                    while (host && composedParent(host) && (composedParent(host) as HTMLElement).isContentEditable) host = composedParent(host);
                    (host as HTMLElement).focus({ preventScroll: true });
                    if (caret) {
                        const sel = (windowOf(h) as typeof window).getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(caret);
                    }
                } else {
                    h.focus({ preventScroll: true });
                }
                return;
            }
        }
        // Pressed on nothing that takes the focus: whatever had it loses it, as with a real click.
        const active = el.ownerDocument.activeElement as HTMLElement | null;
        if (active && active !== el.ownerDocument.body) active.blur();
    }

    // ---- pointer capture ----------------------------------------------

    private patchCapture(win: Window): void {
        if (this.patched.has(win)) return;
        const proto = (win as typeof window).Element.prototype as unknown as Capturable;
        const original: Capturable = { setPointerCapture: proto.setPointerCapture, releasePointerCapture: proto.releasePointerCapture, hasPointerCapture: proto.hasPointerCapture };
        this.patched.set(win, original);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const pointer = this;
        proto.setPointerCapture = function (this: Element, id: number) {
            if (id !== DemoPointerId) return original.setPointerCapture.call(this, id);
            pointer.captured = this;
        };
        proto.releasePointerCapture = function (this: Element, id: number) {
            if (id !== DemoPointerId) return original.releasePointerCapture.call(this, id);
            if (pointer.captured === this) pointer.captured = null;
        };
        proto.hasPointerCapture = function (this: Element, id: number) {
            if (id !== DemoPointerId) return original.hasPointerCapture.call(this, id);
            return pointer.captured === this;
        };
    }

    private unpatchCapture(): void {
        for (const [win, original] of this.patched) {
            try {
                Object.assign((win as typeof window).Element.prototype, original);
            } catch { /* the frame has gone */ }
        }
        this.patched.clear();
    }

    /** Puts the page back as it was: no hover, no press, pointer capture unpatched. */
    public dispose(): void {
        this.cancel();
    }

    // ---- drag and drop -------------------------------------------------

    private startDrag(hit: Hit): void {
        const source = this.dragSource!;
        const win = windowOf(source) as typeof window;
        const data = new win.DataTransfer();
        // The browser cancels the pointer as a drag starts.
        this.send(source, "pointercancel", this.at);
        this.leaveAll();
        const go = this.sendDrag(source, "dragstart", data);
        this.dragSource = null;
        if (!go) return;
        this.drag = { source, data, over: null, accepted: false };
        this.dragOver(hit);
    }

    private dragOver(hit: Hit): void {
        const d = this.drag!;
        if (d.over !== hit.el) {
            const before = d.over;
            this.sendDrag(hit.el, "dragenter", d.data, before);
            if (before) this.sendDrag(before, "dragleave", d.data, hit.el);
            d.over = hit.el;
        }
        this.sendDrag(d.source, "drag", d.data);
        // A page accepts a drop by cancelling dragover.
        d.accepted = !this.sendDrag(hit.el, "dragover", d.data);
    }

    private endDrag(): void {
        const d = this.drag!;
        this.drag = null;
        if (d.over && d.accepted) this.sendDrag(d.over, "drop", d.data);
        else if (d.over) this.sendDrag(d.over, "dragleave", d.data);
        this.sendDrag(d.source, "dragend", d.data);
    }

    private sendDrag(el: Element, type: string, data: DataTransfer, related: Element | null = null): boolean {
        const win = windowOf(el) as typeof window;
        const local = toLocal(frameMap(win, this.top), this.at);
        return el.dispatchEvent(new win.DragEvent(type, {
            bubbles: true, cancelable: type !== "dragleave" && type !== "dragend", composed: true, view: win,
            clientX: local.x, clientY: local.y, screenX: local.x, screenY: local.y, dataTransfer: data,
            relatedTarget: related && windowOf(related) === win ? related : null,
        }));
    }
}

/** The nearest element both are in (through shadow roots), or null if they're in different documents. */
export function commonAncestor(a: Element, b: Element): Element | null {
    if (a.ownerDocument !== b.ownerDocument) return null;
    for (let e: Element | null = a; e; e = composedParent(e)) if (composedContains(e, b)) return e;
    return null;
}

function isField(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
    return el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|search|email|url|tel|password|number|)$/.test((el as HTMLInputElement).type));
}

/** Puts `text` in at the caret, as typing does: beforeinput (which may cancel it), the change, input. */
export function insertText(el: Element, text: string): void {
    const win = windowOf(el) as typeof window;
    if (isField(el)) {
        const go = el.dispatchEvent(new win.InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true, composed: true }));
        if (!go) return;
        const start = el.selectionStart ?? el.value.length, end = el.selectionEnd ?? start;
        el.setRangeText(text, start, end, "end");
        el.dispatchEvent(new win.InputEvent("input", { inputType: "insertText", data: text, bubbles: true, composed: true }));
        return;
    }
    if ((el as HTMLElement).isContentEditable) {
        // The browser fires beforeinput and input itself, and editors (CodeMirror) see a real edit.
        el.ownerDocument.execCommand("insertText", false, text);
    }
}

/** The defaults of a few keys a demo needs, for fields and editable text (a synthetic key has none). */
function defaultKeyAction(el: Element, key: string): void {
    const editable = (el as HTMLElement).isContentEditable;
    if (!isField(el) && !editable) return;
    const doc = el.ownerDocument;
    if (key.length === 1) { insertText(el, key); return; }
    if (editable) {
        if (key === "Backspace") doc.execCommand("delete");
        else if (key === "Delete") doc.execCommand("forwardDelete");
        else if (key === "Enter") doc.execCommand("insertParagraph");
        return;
    }
    const f = el as HTMLInputElement | HTMLTextAreaElement;
    const win = windowOf(el) as typeof window;
    const start = f.selectionStart ?? f.value.length, end = f.selectionEnd ?? start;
    if (key === "Backspace" && (start > 0 || end > start)) f.setRangeText("", end > start ? start : start - 1, end, "end");
    else if (key === "Delete" && (end < f.value.length || end > start)) f.setRangeText("", start, end > start ? end : end + 1, "end");
    else if (key === "Enter" && el.tagName === "TEXTAREA") f.setRangeText("\n", start, end, "end");
    else return;
    f.dispatchEvent(new win.InputEvent("input", { inputType: key === "Enter" ? "insertLineBreak" : "deleteContent", bubbles: true, composed: true }));
}
