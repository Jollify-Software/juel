// juel.tips: one delegated tooltip for the whole page (DOCS-PLAN H1).
//
// Any element with `title` or `data-tip`, in the page or in any open shadow
// root, gets a Juel tooltip instead of the browser's: the listeners sit on the
// document and find the element through the event's composedPath(), so
// components need no markup change (a `juel-button title="…"` just works).
//
// While the tooltip shows, the element's native `title` is taken off (so the
// browser's own tooltip can't appear as well) and put back when it hides; its
// text is copied to `aria-description` so screen readers keep it.
//
// Elements whose custom-element class declares a `title` property (juel-tab,
// juel-modal, …) are skipped: there the title is data (a label), not a tip,
// and taking the attribute off would change what they render.
import { computePosition, flip, offset, shift } from '@floating-ui/dom';

const TipId = "juel-tip";
const StyleId = "juel-tip-styles";
const HoverDelay = 400;
const LongPress = 500;
const TouchShowFor = 2500;
const StashAttribute = "data-juel-tip-title";

// "Undo the last change (Ctrl+Z)": a trailing shortcut in brackets.
const TrailingShortcut = /\s*\(((?:Ctrl|Control|Alt|Shift|Cmd|Command|Meta|Option|⌘|⌥|⇧|F\d{1,2}|Esc)(?:\s*\+\s*[^()+]+)*)\)\s*$/i;

const Css = `
#${TipId} {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 2147483000;
    max-width: min(320px, calc(100vw - 16px));
    padding: 4px 8px;
    border-radius: var(--juel-radius-sm, 4px);
    border: 1px solid var(--juel-border, #d9dbe0);
    background: var(--juel-raised, #ffffff);
    color: var(--juel-text, #1d1f23);
    box-shadow: var(--juel-shadow-2, 0 6px 20px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.08));
    font: var(--juel-text-sm, 12px)/1.35 var(--juel-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
    pointer-events: none;
    white-space: normal;
    overflow-wrap: anywhere;
}
#${TipId}[hidden] { display: none; }
#${TipId} .keys { display: inline-flex; gap: 2px; margin-inline-start: 6px; vertical-align: baseline; }
#${TipId} kbd {
    font: inherit;
    font-size: 0.92em;
    padding: 0 4px;
    border-radius: 3px;
    border: 1px solid var(--juel-border, #d9dbe0);
    background: var(--juel-sunken, #ebecef);
    color: var(--juel-text, #1d1f23);
}`;

/** What a tooltip says: its text, and the keys of its shortcut if it has one. */
export interface TipText {
    text: string;
    keys: string[];
}

/**
 * Splits a tip into its text and key caps: `data-shortcut` wins, otherwise a
 * trailing "(Ctrl+Z)" in the text is taken out of it.
 */
export function tipText(text: string, shortcut?: string | null): TipText {
    let keysText = shortcut?.trim() || "";
    if (!keysText) {
        const match = TrailingShortcut.exec(text);
        if (match) {
            keysText = match[1];
            text = text.slice(0, match.index);
        }
    }
    const keys = keysText ? keysText.split(/\s*\+\s*/).filter(k => k.length > 0) : [];
    return { text: text.trim(), keys };
}

export module TipsModule {
    let on = false;
    let tip: HTMLDivElement | null = null;
    let current: Element | null = null;
    let timer: number | undefined;
    let pressTimer: number | undefined;

    /** Whether the service is listening (it is once juel.js loads, until disable()). */
    export function enabled() {
        return on;
    }

    /** Starts the service (juel.js does this itself; only needed after disable()). */
    export function enable() {
        if (on) return;
        on = true;
        document.addEventListener("pointerover", onOver, true);
        document.addEventListener("pointerout", onOut, true);
        document.addEventListener("pointerdown", onDown, true);
        document.addEventListener("pointerup", onUp, true);
        document.addEventListener("pointercancel", onUp, true);
        document.addEventListener("focusin", onFocusIn, true);
        document.addEventListener("focusout", onFocusOut, true);
        document.addEventListener("keydown", onKey, true);
        window.addEventListener("scroll", hide, true);
        window.addEventListener("blur", hide);
    }

    /** Stops the service: native titles show again, and nothing gets a Juel tooltip. */
    export function disable() {
        if (!on) return;
        hide();
        on = false;
        document.removeEventListener("pointerover", onOver, true);
        document.removeEventListener("pointerout", onOut, true);
        document.removeEventListener("pointerdown", onDown, true);
        document.removeEventListener("pointerup", onUp, true);
        document.removeEventListener("pointercancel", onUp, true);
        document.removeEventListener("focusin", onFocusIn, true);
        document.removeEventListener("focusout", onFocusOut, true);
        document.removeEventListener("keydown", onKey, true);
        window.removeEventListener("scroll", hide, true);
        window.removeEventListener("blur", hide);
    }

    /** Shows the tooltip for an element now (it must have `title` or `data-tip`). */
    export function show(element: Element) {
        clearTimers();
        if (current && current !== element) restore(current);
        const text = textOf(element);
        if (!text) return;
        current = element;
        stash(element);
        const el = tipElement();
        const { text: words, keys } = tipText(text, element.getAttribute("data-shortcut"));
        el.textContent = words;
        if (keys.length > 0) {
            const caps = document.createElement("span");
            caps.className = "keys";
            for (const key of keys) {
                const kbd = document.createElement("kbd");
                kbd.textContent = key;
                caps.append(kbd);
            }
            el.append(caps);
        }
        el.hidden = false;
        computePosition(element, el, {
            strategy: "fixed",
            placement: "bottom",
            middleware: [offset(6), flip(), shift({ padding: 4 })],
        }).then(({ x, y, placement }) => {
            if (current !== element) return;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.dataset.placement = placement;
        });
    }

    /** Hides the tooltip, if one shows, and gives the element its title back. */
    export function hide() {
        clearTimers();
        if (current) restore(current);
        current = null;
        if (tip) tip.hidden = true;
    }

    /** The element whose tooltip shows, if any (for tests). */
    export function target() {
        return current;
    }

    function clearTimers() {
        window.clearTimeout(timer);
        window.clearTimeout(pressTimer);
        timer = pressTimer = undefined;
    }

    function tipElement() {
        if (!document.getElementById(StyleId)) {
            const style = document.createElement("style");
            style.id = StyleId;
            style.textContent = Css;
            document.head.append(style);
        }
        if (!tip || !tip.isConnected) {
            tip = document.createElement("div");
            tip.id = TipId;
            tip.setAttribute("role", "tooltip");
            tip.hidden = true;
            document.body.append(tip);
        }
        return tip;
    }

    function textOf(element: Element) {
        return element.getAttribute("data-tip")
            || element.getAttribute(StashAttribute)
            || element.getAttribute("title")
            || "";
    }

    // A title that is a component's own property is a label, not a tip.
    function titleIsData(element: Element) {
        const type = customElements.get(element.localName) as any;
        return !!type?.elementProperties?.has?.("title");
    }

    function tippable(node: EventTarget): node is Element {
        if (!(node instanceof Element) || node.id === TipId) return false;
        if (node.hasAttribute("data-tip")) return node.getAttribute("data-tip") !== "";
        const title = node.getAttribute("title") ?? node.getAttribute(StashAttribute);
        return !!title && !titleIsData(node);
    }

    function find(event: Event): Element | null {
        for (const node of event.composedPath()) {
            if (node === document.body || node === document.documentElement) break;
            if (tippable(node)) return node;
        }
        return null;
    }

    // The native title comes off while the Juel tip owns the element.
    function stash(element: Element) {
        const title = element.getAttribute("title");
        if (title === null) return;
        element.setAttribute(StashAttribute, title);
        element.removeAttribute("title");
        if (!element.hasAttribute("aria-description") && !element.hasAttribute("aria-label")) {
            element.setAttribute("aria-description", title);
            element.setAttribute("data-juel-tip-aria", "");
        }
    }

    function restore(element: Element) {
        const title = element.getAttribute(StashAttribute);
        if (title === null) return;
        // The page may have set a new title meanwhile: keep that one.
        if (!element.hasAttribute("title")) element.setAttribute("title", title);
        element.removeAttribute(StashAttribute);
        if (element.hasAttribute("data-juel-tip-aria")) {
            element.removeAttribute("aria-description");
            element.removeAttribute("data-juel-tip-aria");
        }
    }

    function onOver(event: PointerEvent) {
        if (event.pointerType === "touch") return;
        const element = find(event);
        if (!element || element === current) return;
        hide();
        // Off at once, so the browser's own tooltip never starts its timer.
        stash(element);
        current = element;
        timer = window.setTimeout(() => show(element), HoverDelay);
    }

    function onOut(event: PointerEvent) {
        if (!current || event.pointerType === "touch") return;
        // Moving onto the element's own children (or its shadow content) is still inside it.
        const to = event.relatedTarget as Node | null;
        if (to && isInside(to, current)) return;
        hide();
    }

    function isInside(node: Node, element: Element) {
        for (let n: Node | null = node; n; n = n instanceof ShadowRoot ? n.host : n.parentNode) {
            if (n === element) return true;
        }
        return false;
    }

    function onDown(event: PointerEvent) {
        if (event.pointerType !== "touch") {
            hide();
            return;
        }
        const element = find(event);
        hide();
        if (!element) return;
        pressTimer = window.setTimeout(() => {
            show(element);
            timer = window.setTimeout(hide, TouchShowFor);
        }, LongPress);
    }

    function onUp() {
        window.clearTimeout(pressTimer);
        pressTimer = undefined;
    }

    function onFocusIn(event: FocusEvent) {
        const element = find(event);
        if (!element) return;
        // Keyboard focus only: a click focuses too, and shouldn't pop a tip.
        const focused = event.composedPath()[0] as Element;
        if (focused instanceof Element && !focused.matches(":focus-visible")) return;
        show(element);
    }

    function onFocusOut() {
        hide();
    }

    function onKey(event: KeyboardEvent) {
        if (event.key === "Escape" && current) hide();
    }
}
