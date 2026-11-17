// A demo's script (SHOW-ME-PLAN SM0): the steps as a page writes them, one
// action key per step ({ click: '.save', say: 'Save it' }), normalised into
// one shape the runner (DemoRunner.ts) plays. Pure: no DOM, so it's unit-tested
// (tests/Demo/DemoScript.test.ts), with the timing and curve helpers.
import type { DemoTarget as GuideTarget } from "./DemoRemote";

/** Where on its target the pointer goes: fractions of its box (0.5, 0.5 is the middle). */
export interface DemoAt { x: number; y: number; }

/** Where a drag ends: another target (and where on it), or a distance from where it started, in page pixels. */
export type DemoDragTo = GuideTarget | { dx: number; dy: number };

/** What every step may also have. */
interface StepCommon {
    /** The caption while the step plays: plain words, what it's doing and why. */
    say?: string;
    /** Where on the target, as fractions of its box (default the middle). */
    at?: DemoAt;
    /** Coach mode: the step is done when this says so (instead of the matching real event). */
    check?: () => boolean;
    /** How long (ms) to wait for the target to appear before the demo fails (default: the demo's `timeout`). */
    timeout?: number;
}

/** A step as a script writes it: one action key. */
export type DemoStepInput = StepCommon & (
    | { say: string }
    | { point: GuideTarget }
    | { click: GuideTarget }
    | { dblclick: GuideTarget }
    /** Open a menu (its trigger, or the menu element) and click through items by label or value, submenus first: `['Fade ▸', 'Fade in']` or `['Fade', 'Fade in']`. */
    | { choose: GuideTarget; item: string | string[] }
    | { drag: GuideTarget; to: DemoDragTo; toAt?: DemoAt; /** Pointer moves on the way (default 24). */ moves?: number }
    /** Types into `into` (clicked first unless it has the focus), or into what has the focus. */
    | { type: string; into?: GuideTarget }
    /** A key or combination: "Enter", "Ctrl+Z", "Shift+ArrowDown". */
    | { key: string }
    /** Wait: ms, a target to appear, or a condition (true, or a promise that resolves). */
    | { wait: number | GuideTarget | (() => unknown) }
    /** Wait for the next `event` on `on` (default the document). Started as the step starts. */
    | { event: string; on?: GuideTarget | EventTarget }
    /** Set-up the viewer needn't watch: run it, and wait for it if it returns a promise. */
    | { call: () => unknown }
);

export type DemoAction = "say" | "point" | "click" | "dblclick" | "choose" | "drag" | "type" | "key" | "wait" | "event" | "call";

/** A step, normalised: the action and its fields. */
export interface DemoStep {
    action: DemoAction;
    say?: string;
    target?: GuideTarget;
    at: DemoAt;
    item?: string[];
    to?: DemoDragTo;
    toAt: DemoAt;
    moves: number;
    text?: string;
    keys?: KeyCombo;
    wait?: number | GuideTarget | (() => unknown);
    event?: string;
    on?: GuideTarget | EventTarget;
    call?: () => unknown;
    check?: () => boolean;
    timeout?: number;
}

/** A demo: its title (shown on the bar) and its steps. */
export interface DemoScript {
    title?: string;
    steps: DemoStepInput[];
}

const Actions: DemoAction[] = ["point", "click", "dblclick", "choose", "drag", "type", "key", "wait", "event", "call"];

const Middle: DemoAt = { x: 0.5, y: 0.5 };

/** The one action key a step has; a step with only `say` is a caption. Throws on none or two. */
export function actionOf(input: DemoStepInput): DemoAction {
    const found = Actions.filter(a => a in input && (input as unknown as Record<string, unknown>)[a] !== undefined);
    if (found.length > 1) throw new Error(`A demo step has two actions (${found.join(", ")}): split it in two.`);
    if (found.length === 1) return found[0];
    if (typeof input.say === "string") return "say";
    throw new Error("A demo step has no action and nothing to say.");
}

/** A menu path: `"Fade ▸ Fade in"`, `['Fade ▸', 'Fade in']` → `['Fade', 'Fade in']`. */
export function menuPath(item: string | string[]): string[] {
    const parts = Array.isArray(item) ? item : item.split("▸");
    return parts.map(p => p.replace(/[▸›>]\s*$/, "").trim()).filter(p => p.length > 0);
}

/** Normalises one step; throws with the step's number on a mistake. */
export function toDemoStep(input: DemoStepInput, index = 0): DemoStep {
    let action: DemoAction;
    try {
        action = actionOf(input);
    } catch (e) {
        throw new Error(`Step ${index + 1}: ${(e as Error).message}`);
    }
    const i = input as Record<string, any>;
    const step: DemoStep = {
        action,
        say: typeof i.say === "string" ? i.say : undefined,
        at: i.at ?? Middle,
        toAt: i.toAt ?? Middle,
        moves: Math.max(2, Math.round(Number(i.moves) || 24)),
        check: i.check,
        timeout: i.timeout,
    };
    switch (action) {
        case "point": case "click": case "dblclick": step.target = i[action]; break;
        case "choose":
            step.target = i.choose;
            step.item = menuPath(i.item ?? []);
            if (!step.item.length) throw new Error(`Step ${index + 1}: choose needs an item.`);
            break;
        case "drag":
            step.target = i.drag;
            step.to = i.to;
            if (step.to === undefined) throw new Error(`Step ${index + 1}: drag needs a "to".`);
            break;
        case "type": step.text = String(i.type); step.target = i.into; break;
        case "key": step.keys = parseKeys(String(i.key)); break;
        case "wait": step.wait = i.wait; break;
        case "event": step.event = String(i.event); step.on = i.on; break;
        case "call": step.call = i.call; break;
    }
    return step;
}

/** Normalises a script's steps; throws on the first mistake. */
export function toDemoSteps(script: DemoScript | DemoStepInput[]): DemoStep[] {
    const steps = Array.isArray(script) ? script : script.steps;
    return steps.map((s, i) => toDemoStep(s, i));
}

/** A key and the modifiers held with it. */
export interface KeyCombo {
    key: string;
    code: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    /** How it's shown on key caps: ["Ctrl", "Z"]. */
    caps: string[];
}

const KeyNames: Record<string, string> = {
    esc: "Escape", escape: "Escape", enter: "Enter", return: "Enter", tab: "Tab", space: " ", spacebar: " ",
    backspace: "Backspace", delete: "Delete", del: "Delete", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft",
    right: "ArrowRight", arrowup: "ArrowUp", arrowdown: "ArrowDown", arrowleft: "ArrowLeft", arrowright: "ArrowRight",
    home: "Home", end: "End", pageup: "PageUp", pagedown: "PageDown",
};

const CapNames: Record<string, string> = {
    " ": "Space", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Escape: "Esc",
};

/** `"Ctrl+Shift+Z"` → the key, its `code` and the modifiers. A single character is itself ("a", "?"). */
export function parseKeys(text: string): KeyCombo {
    const parts = text === "+" ? ["+"] : text.split(/\+(?=.)/).map(p => p.trim()).filter(Boolean);
    const combo: KeyCombo = { key: "", code: "", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, caps: [] };
    for (const part of parts) {
        const lower = part.toLowerCase();
        if (lower === "ctrl" || lower === "control") { combo.ctrlKey = true; combo.caps.push("Ctrl"); continue; }
        if (lower === "shift") { combo.shiftKey = true; combo.caps.push("Shift"); continue; }
        if (lower === "alt" || lower === "option") { combo.altKey = true; combo.caps.push("Alt"); continue; }
        if (lower === "meta" || lower === "cmd" || lower === "win") { combo.metaKey = true; combo.caps.push("Cmd"); continue; }
        if (combo.key) throw new Error(`"${text}" names two keys.`);
        combo.key = part.length === 1 ? part : (KeyNames[lower] ?? part.charAt(0).toUpperCase() + part.slice(1));
        combo.caps.push(CapNames[combo.key] ?? (combo.key.length === 1 ? combo.key.toUpperCase() : combo.key));
    }
    if (!combo.key) throw new Error(`"${text}" has no key, only modifiers.`);
    // A letter is what the keyboard sends: lower case, upper with Shift ("Ctrl+Z" sends "z").
    if (/^[a-z]$/i.test(combo.key)) combo.key = combo.shiftKey ? combo.key.toUpperCase() : combo.key.toLowerCase();
    combo.code = codeOf(combo.key);
    return combo;
}

function codeOf(key: string): string {
    if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
    if (/^[0-9]$/.test(key)) return `Digit${key}`;
    if (key === " ") return "Space";
    return key;
}

/** How long a caption stays (ms at 1×): enough to read it, 1.4 s to 6 s. */
export function readingTime(text: string | undefined): number {
    const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
    return Math.min(6000, Math.max(1400, 600 + words * 330));
}

/** How long the pointer takes to glide `distance` px at 1×: 250–900 ms, slower for longer. */
export function glideTime(distance: number): number {
    return Math.round(Math.min(900, Math.max(250, 600 * Math.sqrt(Math.max(0, distance) / 400))));
}

/** Ease in and out (cubic), t in 0..1. */
export function ease(t: number): number {
    const c = Math.min(1, Math.max(0, t));
    return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export interface Point { x: number; y: number; }

/**
 * A point along the pointer's path from `a` to `b` at `t` (0..1, eased by the
 * caller): a gentle arc, bowed to one side by `bow` of the distance, as a hand moves.
 */
export function arcPoint(a: Point, b: Point, t: number, bow = 0.12): Point {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    // The control point: off the middle, at right angles to the line.
    const cx = mx - dy * bow, cy = my + dx * bow;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y };
}

/** Whether `name` names this item's label or value, ignoring case, spaces, a leading ✓ and a trailing ▸ or …. */
export function itemMatches(name: string, label: string | null | undefined): boolean {
    const clean = (s: string) => s.replace(/^\s*✓\s*/, "").replace(/[▸›…]|\.\.\.$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    return !!label && clean(label) === clean(name);
}
