// Where things are, for the demo's pointer (SHOW-ME-PLAN SM0). The ghost lives
// in the top page; a target may be inside same-origin iframes, scaled (a
// juel-frame shrinks its iframe to fit). A frame chain maps a window's own
// client coordinates to the top page's: page = origin + local × scale.
import { Point } from "./DemoScript";

/** How a window's client coordinates map to the top page's. */
export interface FrameMap {
    win: Window;
    ox: number;
    oy: number;
    scale: number;
}

/** The map from `win`'s coordinates to `top`'s (the identity for `top` itself, or for a window not inside it). */
export function frameMap(win: Window, top: Window = window): FrameMap {
    let ox = 0, oy = 0, scale = 1;
    let w: Window = win;
    while (w !== top) {
        let frame: Element | null = null;
        try {
            frame = w.frameElement;
        } catch {
            break;
        }
        if (!frame) break;
        const r = frame.getBoundingClientRect();
        const f = frame as HTMLElement;
        // A scaled iframe (a CSS transform): its box on the page over its laid-out width.
        const s = f.offsetWidth > 0 ? r.width / f.offsetWidth : 1;
        const sx = Number.isFinite(s) && s > 0 ? s : 1;
        // The content box's corner, in the parent's coordinates.
        const css = (f.ownerDocument.defaultView ?? window).getComputedStyle(f);
        const left = r.left + (f.clientLeft + (parseFloat(css.paddingLeft) || 0)) * sx;
        const topEdge = r.top + (f.clientTop + (parseFloat(css.paddingTop) || 0)) * sx;
        // Compose: what we have is in w's coordinates; w sits at (left, top) scaled by sx in its parent.
        ox = left + ox * sx;
        oy = topEdge + oy * sx;
        scale *= sx;
        w = w.parent;
    }
    return { win, ox, oy, scale };
}

/** `p` in the map's window → the top page. */
export function toPage(map: FrameMap, p: Point): Point {
    return { x: map.ox + p.x * map.scale, y: map.oy + p.y * map.scale };
}

/** `p` on the top page → the map's window. */
export function toLocal(map: FrameMap, p: Point): Point {
    return { x: (p.x - map.ox) / map.scale, y: (p.y - map.oy) / map.scale };
}

/** The window an element is in. */
export function windowOf(el: Element): Window {
    return el.ownerDocument.defaultView ?? window;
}

/** A box on the top page. */
export interface PageRect { left: number; top: number; width: number; height: number; }

/** `el`'s box on the top page. */
export function pageRect(el: Element, top: Window = window): PageRect {
    const map = frameMap(windowOf(el), top);
    const r = el.getBoundingClientRect();
    const a = toPage(map, { x: r.left, y: r.top });
    return { left: a.x, top: a.y, width: r.width * map.scale, height: r.height * map.scale };
}

/** The point `at` (fractions of its box) of `el`, on the top page. */
export function pagePoint(el: Element, at: Point = { x: 0.5, y: 0.5 }, top: Window = window): Point {
    const r = pageRect(el, top);
    return { x: r.left + r.width * at.x, y: r.top + r.height * at.y };
}

/** Whether `el` takes up room on the screen (not hidden, not display: none). */
export function isShown(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 && r.height <= 0) return false;
    const check = (el as Element & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
    return check ? check.call(el, { visibilityProperty: true }) : true;
}

/** Scrolls `el` (and the frames it's in) just enough to show it. */
export function bringIntoView(el: Element): void {
    const r = el.getBoundingClientRect();
    const win = windowOf(el);
    const outside = r.bottom < 0 || r.right < 0 || r.top > win.innerHeight || r.left > win.innerWidth;
    if (outside || r.top < 0 || r.bottom > win.innerHeight) el.scrollIntoView({ block: "nearest", inline: "nearest" });
    try {
        const frame = win.frameElement;
        if (frame) bringIntoView(frame);
    } catch { /* another origin */ }
}

/** What's at a point, deepest first: into open shadow roots and same-origin iframes. */
export interface Hit {
    el: Element;
    win: Window;
    /** The point in `win`'s client coordinates. */
    local: Point;
}

/**
 * The deepest element at `page` (top-page coordinates): through open shadow
 * roots and same-origin iframes. Elements with `pointer-events: none` (the
 * ghost) are passed over, as a real pointer passes over them.
 */
export function hitAt(page: Point, top: Window = window): Hit | null {
    let win = top;
    let local = page;
    for (let depth = 0; depth < 8; depth++) {
        const doc = win.document;
        let el = doc.elementFromPoint(local.x, local.y);
        if (!el) return null;
        while (el.shadowRoot) {
            const inner: Element | null = el.shadowRoot.elementFromPoint(local.x, local.y);
            if (!inner || inner === el) break;
            el = inner;
        }
        if (el.tagName === "IFRAME") {
            let inner: Window | null = null;
            try {
                inner = (el as HTMLIFrameElement).contentWindow;
                if (!inner?.document) inner = null;
            } catch {
                inner = null;
            }
            if (inner) {
                local = toLocal(frameMap(inner, top), page);
                win = inner;
                continue;
            }
        }
        return { el, win, local };
    }
    return null;
}

/** The element's parent, stepping out of a shadow root to its host (not out of its document). */
export function composedParent(el: Element): Element | null {
    if (el.parentElement) return el.parentElement;
    const root = el.parentNode;
    return root instanceof (windowOf(el) as typeof window).ShadowRoot ? (root as ShadowRoot).host : null;
}

/** `el` and everything it's inside, out to its document's root element. */
export function composedChain(el: Element | null): Element[] {
    const chain: Element[] = [];
    for (let e = el; e; e = composedParent(e)) chain.push(e);
    return chain;
}

/** Whether `inner` is `outer` or inside it, through shadow roots (same document). */
export function composedContains(outer: Element, inner: Element | null): boolean {
    for (let e = inner; e; e = composedParent(e)) if (e === outer) return true;
    return false;
}

/** The deepest element that has focus: through shadow roots and same-origin iframes. */
export function deepActiveElement(doc: Document = document): Element | null {
    let el: Element | null = doc.activeElement;
    for (let depth = 0; el && depth < 16; depth++) {
        if (el.tagName === "IFRAME") {
            try {
                const inner = (el as HTMLIFrameElement).contentDocument;
                if (inner?.activeElement && inner.activeElement !== inner.body) { el = inner.activeElement; continue; }
            } catch { /* another origin */ }
            return el;
        }
        const inner = el.shadowRoot?.activeElement;
        if (!inner) return el;
        el = inner;
    }
    return el;
}
