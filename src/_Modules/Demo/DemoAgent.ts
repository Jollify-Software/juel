// The demo's hand inside a sandboxed frame (SHOW-ME-PLAN SM1). A frame with an opaque origin (a
// `sandbox="allow-scripts"` preview, as juel-frame makes by default) can't be reached by the page's
// script, so the page's demo (DemoRunner.ts) asks this agent, by postMessage, to find things and to
// move, press and type at points in it. The agent answers only its parent window.
//
//   parent → frame  { juelDemo: 'find', id, selector, reveal }   → { juelDemoReply: id, rect, shown } (rect in the frame's px)
//                   { juelDemo: 'pointer', kind: 'move' | 'down' | 'up' | 'leave', x, y, detail }
//                   { juelDemo: 'key', combo } · { juelDemo: 'type', text }
//                   { juelDemo: 'guard', on }      while a demo plays, the person's own input is kept out
//                                                  of the frame too; a press is told to the parent
//                   { juelDemo: 'watch', id, selector, kind: 'click' | 'dblclick' }   coach mode: tell
//                                                  the parent ({ juelDemoEvent: id }) when the person does it
//                   { juelDemo: 'unwatch', id }
//   frame → parent  { juelDemoReply: id, … }, { juelDemoEvent: id }, { juelDemoEvent: 'interrupt' }
//
// A page (Jetty's embed) turns it on with `installDemoAgent()`.
import { resolveTarget } from "../Guide/GuideTarget";
import { bringIntoView, isShown } from "./DemoGeometry";
import { DemoPointer } from "./DemoInput";
import { KeyCombo } from "./DemoScript";

const Blocked = ["pointerdown", "pointerup", "pointermove", "pointerover", "pointerout", "mousedown", "mouseup", "mousemove",
    "mouseover", "mouseout", "click", "dblclick", "contextmenu", "wheel", "touchstart", "touchmove", "touchend", "keydown", "keyup"];

let installed = false;

/** Turns the agent on in this window (once). Does nothing outside a frame. */
export function installDemoAgent(win: Window = window): void {
    if (installed || win.parent === win) return;
    installed = true;
    let pointer: DemoPointer | null = null;
    let guarded = false;
    const watches = new Map<string, () => void>();
    const reply = (msg: Record<string, unknown>) => win.parent.postMessage(msg, "*");
    const hand = () => pointer ??= new DemoPointer(win);

    const block = (e: Event) => {
        if (!e.isTrusted || !guarded) return;
        e.stopImmediatePropagation();
        if (e.cancelable && !/move|over|out/.test(e.type)) e.preventDefault();
        if (e.type === "pointerdown" || e.type === "touchstart" || e.type === "keydown") reply({ juelDemoEvent: "interrupt", key: (e as KeyboardEvent).key });
    };

    win.addEventListener("message", (e: MessageEvent) => {
        if (e.source !== win.parent) return;
        const data = e.data as Record<string, any> | null;
        const op = data?.juelDemo;
        if (typeof op !== "string") return;
        switch (op) {
            case "find": {
                const el = resolveTarget(String(data!.selector ?? ""), win.document);
                if (el && data!.reveal) bringIntoView(el);
                const r = el?.getBoundingClientRect();
                reply({ juelDemoReply: data!.id, rect: r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null, shown: !!el && isShown(el) });
                return;
            }
            case "pointer": {
                const p = hand();
                const at = { x: Number(data!.x) || 0, y: Number(data!.y) || 0 };
                if (data!.kind === "leave") { p.cancel(); return; }
                p.move(at);
                if (data!.kind === "down") p.down(Number(data!.detail) || 1);
                else if (data!.kind === "up") p.up(Number(data!.detail) || 1);
                return;
            }
            case "key":
                hand().key(data!.combo as KeyCombo);
                return;
            case "type":
                for (const ch of String(data!.text ?? "")) hand().typeChar(ch);
                return;
            case "guard":
                guarded = !!data!.on;
                if (guarded) for (const t of Blocked) win.addEventListener(t, block, { capture: true });
                else {
                    for (const t of Blocked) win.removeEventListener(t, block, { capture: true });
                    pointer?.dispose();
                    pointer = null;
                }
                return;
            case "watch": {
                const id = String(data!.id);
                const kind = data!.kind === "dblclick" ? "dblclick" : "click";
                const selector = String(data!.selector ?? "");
                const on = (ev: Event) => {
                    if (!ev.isTrusted) return;
                    const el = resolveTarget(selector, win.document);
                    if (el && ev.composedPath().includes(el)) reply({ juelDemoEvent: id });
                };
                win.addEventListener(kind, on, { capture: true });
                watches.get(id)?.();
                watches.set(id, () => win.removeEventListener(kind, on, { capture: true }));
                return;
            }
            case "unwatch":
                watches.get(String(data!.id))?.();
                watches.delete(String(data!.id));
                return;
        }
    });
}
