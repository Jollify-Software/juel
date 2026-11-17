// Plays a demo (SHOW-ME-PLAN SM0): the ghost hand (Ghost.ts) does each step
// of a script (DemoScript.ts) with events a page can't tell from a person's
// (DemoInput.ts), with a caption saying what it's doing and why, and the bar
// (DemoBar.ts) to pause, step, change speed, start again or stop.
//
// While it plays, the person's own pointer and keys don't reach the page (a
// press pauses the demo; Space pauses or plays, → steps, Escape stops); only
// the bar takes them. Coach mode is the same script the other way round: no
// hand, the target ringed, and each step waits for the person to do it
// (Show me plays just that step for them).
//
// Events on `host` (default the document): `demo-step` { index, step },
// `demo-replay`, and `demo-end` { result: 'finished' | 'stopped' | 'failed', index, error }.
import { GuideTarget, resolveTarget } from "../Guide/GuideTarget";
import { DemoControl, DemoSpeeds, JuelDemoBar as DemoBar } from "./DemoBar";
import { PageRect, bringIntoView, composedContains, deepActiveElement, isShown, pagePoint, pageRect, windowOf } from "./DemoGeometry";
import { DemoTarget, RemoteTarget, findRemote, isNode, isRemoteTarget, splitAtOpaqueFrame, tell } from "./DemoRemote";
import { DemoPointer } from "./DemoInput";
import { DemoAt, DemoScript, DemoStep, DemoStepInput, KeyCombo, Point, arcPoint, ease, glideTime, itemMatches, readingTime, toDemoSteps } from "./DemoScript";
// Registers <juel-ghost> and <juel-demo-bar> (used here by tag name, so a type-only import would drop them).
import "./Ghost";
import "./DemoBar";
import type { JuelGhost } from "./Ghost";

export type DemoResult = "finished" | "stopped" | "failed";

/** `demo-end`'s detail. */
export interface DemoEndDetail {
    result: DemoResult;
    /** The step it ended on. */
    index: number;
    /** What went wrong, when it failed. */
    error?: string;
}

/** `demo-step`'s detail. */
export interface DemoStepDetail {
    index: number;
    step: DemoStep;
}

export interface DemoOptions {
    /** `play` (the hand does it, the default) or `coach` (the person does it). */
    mode?: "play" | "coach";
    /** 1 is normal; 0.5 slower, 2 faster. */
    speed?: number;
    /** Where the demo's events are fired (default: the document). */
    host?: EventTarget;
    /** Where selectors are looked up (default: the document). */
    root?: ParentNode;
    /** How long (ms) to wait for a target to appear before the demo fails (default 5000). */
    timeout?: number;
    /** The bar's heading (default: the script's title). */
    title?: string;
    /** Show the bar (default true). */
    bar?: boolean;
    /** At the end keep the bar, with Watch again and Close (default false: it goes with the demo). */
    holdAtEnd?: boolean;
    /** Before Start again / Watch again: put the page back as it was. Awaited. */
    beforeReplay?: () => unknown;
    /** Start paused (on the first step). */
    paused?: boolean;
}

class Stopped extends Error { constructor() { super("stopped"); } }
class Restart extends Error { constructor() { super("restart"); } }

const TrustedTypes = ["pointerdown", "pointerup", "pointermove", "pointerover", "pointerout", "pointerenter", "pointerleave",
    "mousedown", "mouseup", "mousemove", "mouseover", "mouseout", "mouseenter", "mouseleave", "click", "dblclick", "auxclick",
    "contextmenu", "wheel", "touchstart", "touchmove", "touchend", "dragstart", "keydown", "keyup", "keypress"];

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const raw = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const frame = () => new Promise<void>(r => {
    const id = requestAnimationFrame(() => { clearTimeout(t); r(); });
    const t = setTimeout(() => { cancelAnimationFrame(id); r(); }, 40);
});

/** Where a step acts: an element of the page, or something in a sandboxed frame (and where it was last seen). */
type Spot = Element | { remote: RemoteTarget; rect: PageRect };

function isRemoteSpot(spot: Spot): spot is { remote: RemoteTarget; rect: PageRect } {
    return !isNode(spot) && "remote" in spot;
}

function describe(target: DemoTarget | undefined): string {
    if (isRemoteTarget(target)) return `"${target.selector}" in its frame`;
    return typeof target === "string" ? `"${target}"` : target ? "its target" : "nothing";
}

/** One demo playing. `juel.demo.play(script)` returns one. */
export class DemoRun {
    public readonly steps: DemoStep[];
    /** Resolves once the demo has ended for good (finished, stopped or failed). */
    public readonly finished: Promise<DemoEndDetail>;
    private resolveFinished!: (d: DemoEndDetail) => void;

    private ghost: JuelGhost;
    private bar: DemoBar | null = null;
    private pointer: DemoPointer;
    private options: Required<Pick<DemoOptions, "timeout">> & DemoOptions;
    private mode: "play" | "coach";
    private _index = 0;
    private _paused = false;
    private _speed: number;
    private stepping = false;
    private stopping = false;
    private restarting = false;
    private over = false;
    private wake: (() => void) | null = null;
    private guarded = new Set<Window>();
    /** What had the focus before the demo: it gets it back at the end (the hand moves the focus as it clicks). */
    private focusBefore: Element | null = null;
    /** Sandboxed frames told to keep the person's input out (their agents guard them). */
    private guardedFrames = new Set<Element>();
    private coachListeners: { win: Window; type: string; fn: (e: Event) => void }[] = [];
    private coachNext: (() => void) | null = null;
    private showing = false;
    private armed = new Map<number, Promise<Event>>();
    private host: EventTarget;

    constructor(script: DemoScript | DemoStepInput[], options: DemoOptions = {}) {
        this.steps = toDemoSteps(script);
        this.options = { timeout: 5000, ...options };
        this.mode = options.mode ?? "play";
        this._speed = options.speed ?? 1;
        this._paused = !!options.paused;
        this.host = options.host ?? document;
        this.finished = new Promise(r => this.resolveFinished = r);
        this.pointer = new DemoPointer(window);
        this.ghost = document.createElement("juel-ghost");
        this.ghost.noHand = this.mode === "coach";
        const title = options.title ?? (Array.isArray(script) ? "" : script.title ?? "");
        if (options.bar !== false) {
            this.bar = document.createElement("juel-demo-bar") as DemoBar;
            this.bar.heading = title;
            this.bar.count = this.steps.length;
            this.bar.coach = this.mode === "coach";
            this.bar.paused = this._paused;
            this.bar.speed = this._speed;
            this.bar.addEventListener("demo-control", e => this.onControl((e as CustomEvent<{ action: DemoControl }>).detail.action));
        }
        // The bar takes no hits while the hand is testing what's under it.
        this.pointer.beforeHit = () => {
            this.bar?.classList.add("hit-through");
            return () => this.bar?.classList.remove("hit-through");
        };
    }

    public get index() { return this._index; }
    public get paused() { return this._paused; }
    public get speed() { return this._speed; }
    public get ended() { return this.over; }

    /** Starts it: adds the hand and the bar and plays from the first step. */
    public start(): this {
        if (this.bar) document.body.append(this.bar);
        document.body.append(this.ghost);
        // The hand comes up from the bar.
        this.ghost.moveTo({ x: window.innerWidth / 2, y: window.innerHeight - 150 });
        if (this.mode === "play") this.guard(window);
        this.focusBefore = document.activeElement;
        window.addEventListener("message", this.onFrameMessage);
        void this.loop();
        return this;
    }

    /** A sandboxed frame's agent: the person pressed or typed in it while the hand plays. */
    private onFrameMessage = (e: MessageEvent) => {
        if (e.data?.juelDemoEvent !== "interrupt" || this.over || this.mode !== "play") return;
        if (e.data.key === "Escape") this.stop();
        else if (e.data.key === " ") { if (this._paused) this.resume(); else this.pause(); }
        else this.pause("Paused: press Play to go on");
    };

    public pause(note = "") {
        if (this.over || this.mode === "coach") return;
        this._paused = true;
        if (this.bar) { this.bar.paused = true; this.bar.note = note; }
    }

    public resume() {
        if (this.over) return;
        this._paused = false;
        this.stepping = false;
        if (this.bar) { this.bar.paused = false; this.bar.note = ""; }
        this.wake?.();
    }

    /** Plays the next step, then pauses. */
    public step() {
        if (this.over) return;
        this.stepping = true;
        this._paused = false;
        if (this.bar) { this.bar.paused = false; this.bar.note = ""; }
        this.wake?.();
    }

    public setSpeed(speed: number) {
        this._speed = Math.max(0.1, speed);
        if (this.bar) this.bar.speed = this._speed;
    }

    /** Stops it; the page is left as the demo left it (put it back on `demo-end`). */
    public stop() {
        if (this.over) {
            this.cleanUp(true);
            return;
        }
        this.stopping = true;
        this.wake?.();
        this.coachNext?.();
    }

    /** Starts again from the first step (after `beforeReplay`). */
    public replay() {
        if (this.over) {
            // Watch again, from the end.
            this.over = false;
            if (this.bar) this.bar.ended = false;
            document.body.append(this.ghost);
            if (this.mode === "play") this.guard(window);
            void (async () => {
                await this.options.beforeReplay?.();
                this.fire("demo-replay", {});
                void this.loop();
            })();
            return;
        }
        this.restarting = true;
        this.wake?.();
        this.coachNext?.();
    }

    private onControl(action: DemoControl) {
        switch (action) {
            case "pause": this.pause(); break;
            case "play": this.resume(); break;
            case "step": this.step(); break;
            case "speed": this.setSpeed(DemoSpeeds[(DemoSpeeds.indexOf(this._speed) + 1) % DemoSpeeds.length] ?? 1); break;
            case "replay": this.replay(); break;
            case "stop": this.stop(); break;
            case "show": this.showStep(); break;
            case "next": this.coachNext?.(); break;
        }
    }

    // ---- the loop ----------------------------------------------------

    private async loop(): Promise<void> {
        for (; ;) {
            try {
                for (let i = 0; i < this.steps.length; i++) {
                    this._index = i;
                    if (this.bar) { this.bar.index = i; this.bar.reading = false; }
                    this.armNext(i);
                    await this.gate();
                    // The hand goes over the bar (it starts there), both over anything opened since.
                    this.bar?.raise();
                    this.ghost.raise();
                    this.fire("demo-step", { index: i, step: this.steps[i] } as DemoStepDetail);
                    if (this.mode === "coach") await this.coachStep(this.steps[i], i);
                    else await this.playStep(this.steps[i], i);
                    if (this.stepping) { this.stepping = false; this.pause(); }
                }
                this.end({ result: "finished", index: this.steps.length - 1 });
                return;
            } catch (e) {
                if (e instanceof Restart) {
                    this.restarting = false;
                    this.pointer.cancel();
                    this.ghost.pressed = false;
                    this.setCaption("");
                    this.setCaps([]);
                    this.ghost.ring(null);
                    await this.options.beforeReplay?.();
                    this.fire("demo-replay", {});
                    continue;
                }
                if (e instanceof Stopped) this.end({ result: "stopped", index: this._index });
                else {
                    const error = (e as Error).message ?? String(e);
                    console.error(`Demo${this.bar?.heading ? ` "${this.bar.heading}"` : ""}: ${error}`);
                    this.end({ result: "failed", index: this._index, error });
                }
                return;
            }
        }
    }

    private end(detail: DemoEndDetail) {
        this.over = true;
        const hold = detail.result === "finished" && this.options.holdAtEnd && this.bar;
        this.cleanUp(!hold);
        if (hold && this.bar) this.bar.ended = true;
        this.fire("demo-end", detail);
        this.resolveFinished(detail);
    }

    private cleanUp(all: boolean) {
        this.pointer.dispose();
        this.unguard();
        if (all) window.removeEventListener("message", this.onFrameMessage);
        this.giveFocusBack();
        this.clearCoach();
        this.ghost.pressed = false;
        this.ghost.ring(null);
        this.ghost.remove();
        if (all) this.bar?.remove();
        this.wake = null;
    }

    /** The focus back where it was before the hand moved it (play mode: in coach mode the person moved it). */
    private giveFocusBack() {
        if (this.mode !== "play") return;
        const before = this.focusBefore as HTMLElement | null;
        if (document.activeElement === before) return;
        if (before && before.isConnected && before !== document.body) before.focus({ preventScroll: true });
        else (document.activeElement as HTMLElement | null)?.blur?.();
    }

    private fire(type: string, detail: unknown) {
        this.host.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }

    /** Waits while paused; throws once stopped or restarting. */
    private async gate(): Promise<void> {
        for (; ;) {
            if (this.stopping) throw new Stopped();
            if (this.restarting) throw new Restart();
            if (!this._paused) return;
            await new Promise<void>(r => this.wake = r);
            this.wake = null;
        }
    }

    /** Waits `ms` of demo time (scaled by the speed, held while paused). */
    private async sleep(ms: number, scaled = true): Promise<void> {
        let left = scaled ? ms / this._speed : ms;
        while (left > 0) {
            await this.gate();
            const t = Math.min(left, 40);
            await raw(t);
            left -= t;
        }
        await this.gate();
    }

    // ---- finding things ---------------------------------------------

    private async find(target: DemoTarget | undefined, step: DemoStep, i: number): Promise<Spot> {
        if (target === undefined) throw new Error(`Step ${i + 1}: no target.`);
        const until = Date.now() + (step.timeout ?? this.options.timeout);
        for (; ;) {
            await this.gate();
            const spot = await this.locate(target);
            if (spot) return spot;
            if (Date.now() >= until) throw new Error(`Step ${i + 1} (${step.action}): ${describe(target)} isn't on the page.`);
            await raw(50);
        }
    }

    /** A target that's in a sandboxed frame, as its frame and selector; null for one on the page. */
    private remoteOf(target: DemoTarget | undefined): RemoteTarget | null {
        let t: unknown = target;
        if (typeof t === "function") t = (t as () => unknown)();
        if (isRemoteTarget(t)) return t;
        if (typeof t === "string") return splitAtOpaqueFrame(t, this.options.root ?? document);
        return null;
    }

    /** A target on the page, now (null if it's in a sandboxed frame, or not there). */
    private local(target: DemoTarget | undefined): Element | null {
        if (target === undefined) return null;
        let t: unknown = target;
        if (typeof t === "function") t = (t as () => unknown)();
        if (!t || isRemoteTarget(t)) return null;
        if (typeof t === "string") return splitAtOpaqueFrame(t, this.options.root ?? document) ? null : resolveTarget(t, this.options.root ?? document);
        return isNode(t) && t.nodeType === 1 && t.isConnected ? t as Element : null;
    }

    /** Where `target` is now, if it shows. */
    private async locate(target: DemoTarget): Promise<Spot | null> {
        const remote = this.remoteOf(target);
        if (remote) {
            const found = await findRemote(remote);
            if (!found?.shown) return null;
            this.guardFrame(remote.frame);
            return { remote, rect: found.rect };
        }
        const el = this.local(target);
        if (!el || !isShown(el)) return null;
        this.watchFrames(el);
        return el;
    }

    /** Keeps the person's input out of (play) a frame the demo works in. */
    private watchFrames(el: Element) {
        if (this.mode !== "play" && !this.showing) return;
        for (let w: Window | null = windowOf(el); w && w !== window; w = w.parent === w ? null : w.parent) this.guard(w);
    }

    private async pointAt(spot: Spot, at: DemoAt): Promise<Point> {
        if (isRemoteSpot(spot)) {
            // The frame scrolled into view on the page, the target in its frame, then measured again.
            bringIntoView(spot.remote.frame);
            const found = await findRemote(spot.remote, true);
            await frame();
            const again = (await findRemote(spot.remote))?.rect ?? found?.rect ?? spot.rect;
            return { x: again.left + again.width * at.x, y: again.top + again.height * at.y };
        }
        bringIntoView(spot);
        await frame();
        return pagePoint(spot, at);
    }

    /** Keeps the person's input out of a sandboxed frame the hand works in (its agent does). */
    private guardFrame(frame: Element) {
        if ((this.mode !== "play" && !this.showing) || this.guardedFrames.has(frame)) return;
        this.guardedFrames.add(frame);
        tell(frame, { juelDemo: "guard", on: true });
    }

    // ---- the hand ------------------------------------------------------

    /** The hand glides to `to`, moving the pointer as it goes. */
    private async glide(to: Point, bow = 0.12): Promise<void> {
        const from = this.ghost.point;
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        if (distance < 1) { this.pointer.move(to); return; }
        if (reducedMotion()) {
            this.ghost.moveTo(to);
            this.pointer.move(to);
            await this.sleep(120);
            return;
        }
        const duration = glideTime(distance);
        let elapsed = 0;
        let last = performance.now();
        while (elapsed < duration) {
            await this.gate();
            await frame();
            const now = performance.now();
            elapsed += Math.min(50, now - last) * this._speed;
            last = now;
            const p = arcPoint(from, to, ease(Math.min(1, elapsed / duration)), bow);
            this.ghost.moveTo(p);
            this.pointer.move(p);
        }
        this.ghost.moveTo(to);
        this.pointer.move(to);
    }

    private async press(detail = 1): Promise<void> {
        this.ghost.pressed = true;
        this.ghost.tap();
        this.pointer.down(detail);
        await this.sleep(90);
        this.pointer.up(detail);
        this.ghost.pressed = false;
    }

    private setCaption(text: string) {
        this.ghost.caption = text;
        if (this.bar) this.bar.caption = text;
    }

    private setCaps(caps: string[]) {
        this.ghost.caps = caps;
        if (this.bar) this.bar.caps = caps;
    }

    private say(text: string | undefined): number {
        if (text !== undefined) this.setCaption(text);
        return text ? performance.now() + readingTime(text) / this._speed : 0;
    }

    /** After an acting step: let its caption be read. */
    private async holdFor(readUntil: number, least: number) {
        const left = Math.max(least / this._speed, readUntil - performance.now());
        await this.sleep(left, false);
    }

    private async playStep(step: DemoStep, i: number): Promise<void> {
        const readUntil = this.say(step.say);
        switch (step.action) {
            case "say":
                await this.holdFor(readUntil, 0);
                return;
            case "point": {
                const el = await this.find(step.target, step, i);
                await this.glide(await this.pointAt(el, step.at));
                await this.holdFor(readUntil, 400);
                return;
            }
            case "click":
            case "dblclick": {
                const el = await this.find(step.target, step, i);
                await this.glide(await this.pointAt(el, step.at));
                await this.sleep(120);
                await this.press(1);
                if (step.action === "dblclick") {
                    await this.sleep(60);
                    await this.press(2);
                }
                await this.holdFor(readUntil, 350);
                return;
            }
            case "choose":
                await this.choose(step, i);
                await this.holdFor(readUntil, 350);
                return;
            case "drag":
                await this.drag(step, i);
                await this.holdFor(readUntil, 350);
                return;
            case "type": {
                if (step.target !== undefined) {
                    const el = await this.find(step.target, step, i);
                    if (isRemoteSpot(el) || (!composedContains(el, deepActiveElement()) && !this.focusInside(el))) {
                        await this.glide(await this.pointAt(el, step.at));
                        await this.sleep(120);
                        await this.press(1);
                        await this.sleep(150);
                    }
                }
                for (const ch of step.text ?? "") {
                    await this.gate();
                    this.pointer.typeChar(ch);
                    await this.sleep(ch === " " ? 110 : 70);
                }
                await this.holdFor(readUntil, 300);
                return;
            }
            case "key":
                await this.pressKey(step.keys!);
                await this.holdFor(readUntil, 300);
                return;
            case "wait":
                await this.waitFor(step, i);
                return;
            case "event":
                await this.waitEvent(step, i);
                return;
            case "call":
                await this.gate();
                await step.call?.();
                await this.holdFor(readUntil, 0);
                return;
        }
    }

    /** Whether what has the focus is inside `el`, through iframes too. */
    private focusInside(el: Element): boolean {
        const active = deepActiveElement();
        if (!active) return false;
        for (let e: Element | null = active; e; ) {
            if (composedContains(el, e)) return true;
            try {
                e = windowOf(e).frameElement;
            } catch {
                return false;
            }
        }
        return false;
    }

    private async pressKey(keys: KeyCombo) {
        this.setCaps(keys.caps);
        await this.sleep(250);
        this.pointer.key(keys);
        await this.sleep(450);
        this.setCaps([]);
    }

    // ---- choose --------------------------------------------------------

    /** The menu a target belongs to, and what opens it. */
    private menuParts(el: Element): { menu: Element; trigger: Element } {
        if (el.tagName === "JUEL-MENU") {
            return { menu: el, trigger: el.querySelector(":scope > [slot=trigger]") ?? el };
        }
        const parent = el.parentElement;
        if (el.getAttribute("slot") === "trigger" && parent?.tagName === "JUEL-MENU") return { menu: parent, trigger: el };
        return { menu: el, trigger: el };
    }

    private async choose(step: DemoStep, i: number) {
        const el = await this.find(step.target, step, i);
        if (isRemoteSpot(el)) throw new Error(`Step ${i + 1} (choose): a menu in a sandboxed frame can't be chosen from; click its items instead.`);
        const { menu, trigger } = this.menuParts(el);
        const path = step.item!;
        // Open it, unless it's open already (its first item shows).
        if (!this.findItem(menu, path[0])) {
            await this.glide(await this.pointAt(trigger, step.at));
            await this.sleep(120);
            await this.press(1);
        }
        let scope: Element = menu;
        for (let k = 0; k < path.length; k++) {
            const item = await this.waitItem(scope, path[k], step, i);
            const p = await this.pointAt(item, { x: 0.3, y: 0.5 });
            if (k > 0) {
                // Into a submenu as a person does: along the item that opened it, then straight across,
                // so the pointer never leaves it on the way (which would close the submenu).
                const r = pageRect(scope);
                const y = Math.min(r.top + r.height - 2, Math.max(r.top + 2, p.y));
                await this.glide({ x: r.left + r.width - 4, y }, 0);
            }
            await this.glide(p, k > 0 ? 0 : 0.12);
            if (k < path.length - 1) {
                // A submenu opens as the pointer comes onto it; a click opens one that doesn't.
                await this.sleep(250);
                if (!(await this.itemSoon(item, path[k + 1], 500))) await this.press(1);
                scope = item;
            } else {
                await this.sleep(150);
                await this.press(1);
            }
        }
    }

    private async waitItem(scope: Element, name: string, step: DemoStep, i: number): Promise<Element> {
        const until = Date.now() + (step.timeout ?? this.options.timeout);
        for (; ;) {
            await this.gate();
            const item = this.findItem(scope, name);
            if (item) return item;
            if (Date.now() >= until) throw new Error(`Step ${i + 1} (choose): no "${name}" showing in the menu.`);
            await raw(50);
        }
    }

    private async itemSoon(scope: Element, name: string, ms: number): Promise<boolean> {
        const until = Date.now() + ms;
        while (Date.now() < until) {
            if (this.findItem(scope, name)) return true;
            await raw(40);
        }
        return false;
    }

    /** A showing menu item (juel-menu-item, a menuitem or option) under `scope`, by its label, value or words. */
    private findItem(scope: Element, name: string): Element | null {
        const items: Element[] = [];
        const visit = (root: ParentNode) => {
            for (const e of Array.from(root.querySelectorAll("*"))) {
                if (e !== scope && (e.tagName === "JUEL-MENU-ITEM" || /^(menuitem|menuitemradio|menuitemcheckbox|option)$/.test(e.getAttribute("role") ?? "") || e.tagName === "OPTION")) items.push(e);
                if (e.shadowRoot) visit(e.shadowRoot);
            }
        };
        visit(scope);
        if (scope.shadowRoot) visit(scope.shadowRoot);
        return items.find(e => {
            if (!isShown(e) || e.hasAttribute("disabled") || e.getAttribute("aria-disabled") === "true") return false;
            const label = (e as Element & { label?: string }).label ?? e.getAttribute("label");
            const value = e.getAttribute("value");
            return itemMatches(name, label) || itemMatches(name, value)
                || (e.tagName !== "JUEL-MENU-ITEM" && itemMatches(name, e.textContent));
        }) ?? null;
    }

    // ---- drag ----------------------------------------------------------

    private async dragEnd(step: DemoStep, i: number, start: Point): Promise<Point> {
        const to = step.to!;
        if (typeof to === "object" && to !== null && "dx" in to && !isNode(to)) return { x: start.x + to.dx, y: start.y + to.dy };
        const spot = await this.find(to as DemoTarget, step, i);
        return this.pointAt(spot, step.toAt);
    }

    private async drag(step: DemoStep, i: number) {
        const el = await this.find(step.target, step, i);
        const start = await this.pointAt(el, step.at);
        await this.glide(start);
        await this.sleep(150);
        this.ghost.pressed = true;
        this.pointer.down();
        await this.sleep(180);
        const end = await this.dragEnd(step, i, start);
        const duration = glideTime(Math.hypot(end.x - start.x, end.y - start.y)) * 1.6;
        for (let m = 1; m <= step.moves; m++) {
            const t = ease(m / step.moves);
            const p = arcPoint(start, end, t, 0.04);
            this.ghost.moveTo(p);
            this.pointer.move(p);
            await this.sleep(duration / step.moves);
        }
        await this.sleep(150);
        this.pointer.up();
        this.ghost.pressed = false;
    }

    // ---- waiting -------------------------------------------------------

    private async waitFor(step: DemoStep, i: number) {
        const w = step.wait;
        if (typeof w === "number") { await this.sleep(w, false); return; }
        if (typeof w === "function") {
            const until = Date.now() + (step.timeout ?? this.options.timeout);
            for (; ;) {
                await this.gate();
                const r = w();
                if (r && typeof (r as Promise<unknown>).then === "function") {
                    await Promise.race([r as Promise<unknown>, raw(Math.max(0, until - Date.now())).then(() => { throw new Error(`Step ${i + 1} (wait): it didn't finish in time.`); })]);
                    return;
                }
                if (r) return;
                if (Date.now() >= until) throw new Error(`Step ${i + 1} (wait): it didn't happen in time.`);
                await raw(50);
            }
        }
        await this.find(w as DemoTarget, step, i);
    }

    /** An `event` step listens from the start of the step before it, so an event that comes quickly isn't missed. */
    private armNext(i: number) {
        for (const k of [i, i + 1]) {
            const s = this.steps[k];
            if (!s || s.action !== "event" || this.armed.has(k)) continue;
            const on = s.on;
            let target: EventTarget | null = null;
            if (on === undefined) target = document;
            else if (typeof on === "object" && on !== null && "addEventListener" in on && !isNode(on)) target = on as EventTarget;
            else target = resolveTarget(on as GuideTarget, this.options.root ?? document);
            if (!target) continue;
            const t = target;
            this.armed.set(k, new Promise<Event>(r => t.addEventListener(s.event!, r, { once: true })));
        }
    }

    private async waitEvent(step: DemoStep, i: number) {
        this.armNext(i);
        const p = this.armed.get(i);
        if (!p) throw new Error(`Step ${i + 1} (event): ${describe(step.on as GuideTarget)} isn't on the page.`);
        const until = Date.now() + (step.timeout ?? this.options.timeout);
        let done = false;
        void p.then(() => done = true);
        while (!done) {
            await this.gate();
            if (Date.now() >= until) throw new Error(`Step ${i + 1} (event): no "${step.event}" in time.`);
            await raw(30);
        }
        this.armed.delete(i);
    }

    // ---- the person's own input -----------------------------------------

    private guard(win: Window) {
        if (this.guarded.has(win)) return;
        this.guarded.add(win);
        for (const type of TrustedTypes) win.addEventListener(type, this.onTrusted, { capture: true, passive: false });
    }

    private unguard() {
        for (const frame of this.guardedFrames) tell(frame, { juelDemo: "guard", on: false });
        this.guardedFrames.clear();
        for (const win of this.guarded) {
            try {
                for (const type of TrustedTypes) win.removeEventListener(type, this.onTrusted, { capture: true });
            } catch { /* the frame has gone */ }
        }
        this.guarded.clear();
    }

    private inBar(e: Event): boolean {
        return !!this.bar && e.composedPath().includes(this.bar);
    }

    /** The person's own pointer and keys, while the hand plays: kept from the page. */
    private onTrusted = (e: Event) => {
        if (!e.isTrusted || this.over) return;
        if (e.type === "keydown") {
            const k = (e as KeyboardEvent).key;
            if (k === "Escape") { this.block(e); this.stop(); return; }
            if (this.inBar(e)) return;
            this.block(e);
            if (k === " ") { if (this._paused) this.resume(); else this.pause(); }
            else if (k === "ArrowRight") this.step();
            return;
        }
        if (this.inBar(e)) return;
        this.block(e);
        if (e.type === "pointerdown" || e.type === "touchstart") this.pause("Paused: press Play to go on");
    };

    private block(e: Event) {
        e.stopImmediatePropagation();
        if (e.cancelable && !/^(pointermove|mousemove|pointerover|pointerout|mouseover|mouseout)$/.test(e.type)) e.preventDefault();
    }

    // ---- coach mode ------------------------------------------------------

    private clearCoach() {
        for (const l of this.coachListeners) {
            try { l.win.removeEventListener(l.type, l.fn, { capture: true }); } catch { /* gone */ }
        }
        this.coachListeners = [];
        this.coachNext = null;
    }

    private listen(win: Window, type: string, fn: (e: Event) => void) {
        win.addEventListener(type, fn, { capture: true });
        this.coachListeners.push({ win, type, fn });
    }

    /** Windows to listen in: the page and every frame the target is in. */
    private windowsFor(el: Element | null): Window[] {
        const wins = new Set<Window>([window]);
        for (let w: Window | null = el ? windowOf(el) : null; w; w = w.parent === w ? null : w.parent) wins.add(w);
        return [...wins];
    }

    /** Puts the caption beside a target (or above the bar). */
    private place(el: Element | PageRect | null) {
        if (el) {
            const r = isNode(el) ? pageRect(el as Element) : el as PageRect;
            this.ghost.moveTo({ x: r.left + Math.min(r.width, 40), y: r.top + r.height - 30 });
            this.ghost.ring(r);
        } else {
            this.ghost.moveTo({ x: Math.max(16, window.innerWidth / 2 - 150), y: window.innerHeight - 190 });
            this.ghost.ring(null);
        }
    }

    /** Coach mode's Show me: this one step, played by the hand. */
    private showStep() {
        if (this.showing) return;
        this.showing = true;
        this.coachNext?.();
    }

    private async coachStep(step: DemoStep, i: number): Promise<void> {
        if (step.action === "wait" || step.action === "event" || step.action === "call") {
            await this.playStep(step, i);
            return;
        }
        const done = await new Promise<"done" | "next" | "show">(resolve => {
            let finished = false;
            const finish = (how: "done" | "next" | "show") => {
                if (finished) return;
                finished = true;
                clearInterval(poll);
                this.clearCoach();
                window.removeEventListener("message", onWatch);
                if (watching && remote) tell(remote.frame, { juelDemo: "unwatch", id: watching });
                resolve(how);
            };
            this.coachNext = () => finish(this.showing ? "show" : "next");
            if (this.bar) this.bar.reading = step.action === "say" || step.action === "point";
            this.setCaption(step.say ?? this.ghost.caption);
            this.setCaps(step.keys?.caps ?? []);
            let ringed: Element | null = null;
            let downAt: { el: Element; x: number; y: number } | null = null;
            const target = () => this.local(step.target);
            const remote = this.remoteOf(step.target);
            let watching: string | null = null;
            const onWatch = (e: MessageEvent) => { if (watching && e.data?.juelDemoEvent === watching) finish("done"); };
            const isIn = (e: Event, el: Element | null) => !!el && e.composedPath().includes(el);
            const listenAll = (el: Element | null) => {
                this.clearCoach();
                this.coachNext = () => finish(this.showing ? "show" : "next");
                for (const win of this.windowsFor(el)) {
                    if (step.action === "click") this.listen(win, "click", e => { if (e.isTrusted && isIn(e, target())) finish("done"); });
                    if (step.action === "dblclick") this.listen(win, "dblclick", e => { if (e.isTrusted && isIn(e, target())) finish("done"); });
                    if (step.action === "choose") this.listen(win, "click", e => {
                        const last = this.lastItem(step);
                        if (e.isTrusted && last && isIn(e, last)) finish("done");
                    });
                    if (step.action === "drag") {
                        this.listen(win, "pointerdown", e => {
                            const p = e as PointerEvent;
                            if (p.isTrusted && isIn(e, target())) downAt = { el: target()!, x: p.screenX, y: p.screenY };
                        });
                        this.listen(win, "pointerup", e => {
                            const p = e as PointerEvent;
                            if (p.isTrusted && downAt && Math.hypot(p.screenX - downAt.x, p.screenY - downAt.y) > 10) finish("done");
                            downAt = null;
                        });
                    }
                    if (step.action === "key") this.listen(win, "keydown", e => {
                        const k = e as KeyboardEvent, c = step.keys!;
                        if (k.isTrusted && k.key.toLowerCase() === c.key.toLowerCase() && k.ctrlKey === c.ctrlKey && k.shiftKey === c.shiftKey && k.altKey === c.altKey && k.metaKey === c.metaKey) finish("done");
                    });
                }
            };
            listenAll(null);
            if (remote && (step.action === "click" || step.action === "dblclick")) {
                // In a sandboxed frame: its agent says when the person clicks it.
                watching = `w${i}-${Date.now()}`;
                window.addEventListener("message", onWatch);
                tell(remote.frame, { juelDemo: "watch", id: watching, selector: remote.selector, kind: step.action });
            }
            let measuring = false;
            const poll = setInterval(() => {
                if (this.stopping || this.restarting) { finish("next"); return; }
                if (step.check?.()) { finish("done"); return; }
                if (remote) {
                    if (measuring) return;
                    measuring = true;
                    void findRemote(remote).then(found => {
                        measuring = false;
                        if (!finished) this.place(found?.shown ? found.rect : null);
                    });
                    return;
                }
                let el: Element | null = null;
                if (step.action === "choose") {
                    const t = target();
                    el = this.lastShowingItem(step) ?? (t ? this.menuParts(t).trigger : null);
                } else if (step.action === "type") {
                    el = target() ?? deepActiveElement();
                    const text = el ? ((el as HTMLInputElement).value ?? el.textContent ?? "") : "";
                    if (step.text && text.includes(step.text)) { finish("done"); return; }
                } else {
                    el = target();
                }
                if (el && !isShown(el)) el = null;
                if (el !== ringed) {
                    ringed = el;
                    listenAll(el);
                }
                this.place(el);
            }, 120);
        });
        if (this.stopping) throw new Stopped();
        if (this.restarting) throw new Restart();
        if (done === "show") {
            // The hand does just this step, then it's the person's turn again.
            this.showing = false;
            this.ghost.ring(null);
            this.ghost.noHand = false;
            this.guard(window);
            try {
                await this.playStep(step, i);
            } finally {
                this.unguard();
                this.ghost.noHand = true;
            }
        }
    }

    /** The deepest item of a choose step's path that shows now. */
    private lastShowingItem(step: DemoStep): Element | null {
        const el = this.local(step.target);
        if (!el) return null;
        let scope: Element = this.menuParts(el).menu;
        let found: Element | null = null;
        for (const name of step.item ?? []) {
            const item = this.findItem(scope, name);
            if (!item) break;
            found = item;
            scope = item;
        }
        return found;
    }

    /** A choose step's final item, if it shows. */
    private lastItem(step: DemoStep): Element | null {
        const el = this.local(step.target);
        if (!el) return null;
        let scope: Element = this.menuParts(el).menu;
        let item: Element | null = null;
        for (const name of step.item ?? []) {
            item = this.findItem(scope, name);
            if (!item) return null;
            scope = item;
        }
        return item;
    }
}

