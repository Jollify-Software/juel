// Targets in a frame the page can't reach (SHOW-ME-PLAN SM1): a sandboxed iframe with an opaque origin.
// Its DemoAgent (DemoAgent.ts) finds things and acts in it; this is the page's side of the messages.
import { GuideTarget } from "../Guide/GuideTarget";
import { FrameMap, PageRect, frameMap, toPage, windowOf } from "./DemoGeometry";

/** Something in an unreachable frame: the frame, and a selector inside it (` >>> ` crosses shadow roots there). */
export interface RemoteTarget {
    frame: Element;
    selector: string;
}

/** A demo target: as a guide's, or something in a sandboxed frame. */
export type DemoTarget = GuideTarget | RemoteTarget | (() => Element | RemoteTarget | null | undefined);

/** Whether `t` is an element or other node, from this window or a frame's (where `instanceof Element` says no). */
export function isNode(t: unknown): t is Node {
    return !!t && typeof t === "object" && typeof (t as Node).nodeType === "number" && typeof (t as Node).nodeName === "string";
}

export function isRemoteTarget(t: unknown): t is RemoteTarget {
    return !!t && typeof t === "object" && !isNode(t) && "frame" in t && "selector" in t;
}

/** Whether `el` is an iframe whose document the page can't read. */
export function isOpaqueFrame(el: Element | null | undefined): el is HTMLIFrameElement {
    if (!el || el.tagName !== "IFRAME") return false;
    try {
        return !(el as HTMLIFrameElement).contentDocument;
    } catch {
        return true;
    }
}

/** How `frame`'s own client coordinates map to the top page's (its scale too: a juel-frame shrinks its iframe). */
export function iframeMap(frame: Element, top: Window = window): FrameMap {
    const outer = frameMap(windowOf(frame), top);
    const r = frame.getBoundingClientRect();
    const f = frame as HTMLElement;
    const s = f.offsetWidth > 0 ? r.width / f.offsetWidth : 1;
    const scale = Number.isFinite(s) && s > 0 ? s : 1;
    const css = windowOf(frame).getComputedStyle(f);
    const corner = toPage(outer, {
        x: r.left + (f.clientLeft + (parseFloat(css.paddingLeft) || 0)) * scale,
        y: r.top + (f.clientTop + (parseFloat(css.paddingTop) || 0)) * scale,
    });
    return { win: window, ox: corner.x, oy: corner.y, scale: scale * outer.scale };
}

/** A rect in `frame`'s px, on the top page. */
export function framedRect(frame: Element, rect: PageRect): PageRect {
    const m = iframeMap(frame);
    return { left: m.ox + rect.left * m.scale, top: m.oy + rect.top * m.scale, width: rect.width * m.scale, height: rect.height * m.scale };
}

/** Tells the frame's agent something; no answer. */
export function tell(frame: Element, message: Record<string, unknown>): void {
    try {
        (frame as HTMLIFrameElement).contentWindow?.postMessage(message, "*");
    } catch { /* the frame has gone */ }
}

let nextId = 0;

/** Asks the frame's agent something and waits for its answer (null if none comes: no agent, or the frame went). */
export function ask<T extends Record<string, unknown>>(frame: Element, message: Record<string, unknown>, timeout = 1500): Promise<T | null> {
    const win = (frame as HTMLIFrameElement).contentWindow;
    if (!win) return Promise.resolve(null);
    const id = `jd${++nextId}`;
    return new Promise(resolve => {
        const done = (value: T | null) => {
            clearTimeout(timer);
            window.removeEventListener("message", on);
            resolve(value);
        };
        const on = (e: MessageEvent) => {
            if (e.source === win && e.data?.juelDemoReply === id) done(e.data as T);
        };
        const timer = setTimeout(() => done(null), timeout);
        window.addEventListener("message", on);
        tell(frame, { ...message, id });
    });
}

/** Where a remote target is, on the top page, and whether it shows; null if it isn't there (or nothing answers). */
export async function findRemote(target: RemoteTarget, reveal = false): Promise<{ rect: PageRect; shown: boolean } | null> {
    if (!target.frame.isConnected) return null;
    const answer = await ask<{ rect: PageRect | null; shown: boolean }>(target.frame, { juelDemo: "find", selector: target.selector, reveal });
    if (!answer?.rect) return null;
    return { rect: framedRect(target.frame, answer.rect), shown: answer.shown };
}

/** `selector` split where it goes into an unreachable frame: the frame and the rest, or null if it doesn't. */
export function splitAtOpaqueFrame(selector: string, root: ParentNode = document): RemoteTarget | null {
    const parts = selector.split(/\s*>>>\s*/).map(p => p.trim()).filter(Boolean);
    let scope: ParentNode = root;
    for (let i = 0; i < parts.length; i++) {
        let found: Element | null = null;
        try {
            found = scope.querySelector(parts[i]);
        } catch {
            return null;
        }
        if (!found) return null;
        if (isOpaqueFrame(found)) return i < parts.length - 1 ? { frame: found, selector: parts.slice(i + 1).join(" >>> ") } : null;
        if (found.tagName === "IFRAME") {
            const doc = (found as HTMLIFrameElement).contentDocument;
            scope = doc ?? found;
        } else {
            scope = found.shadowRoot ?? found;
        }
    }
    return null;
}
