// Where a guide step points (DOCS-PLAN H3): a selector that may cross open
// shadow roots with ` >>> ` between levels ("jollify-report >>> .writer"), and
// same-origin iframes too ("juel-frame >>> iframe >>> h1"), an element, or a
// function that returns one. Used by VisualGuide (Guide.ts) and the demo
// runner (src/_Modules/Demo).

/** A step's target: a selector (` >>> ` crosses into a shadow root), an element, or a function returning one. */
export type GuideTarget = string | Element | (() => Element | null | undefined);

const Crossing = /\s*>>>\s*/;

/** Where the next ` >>> ` part is looked up: an iframe's document, an open shadow root, or the element itself. */
function innerScope(found: Element): ParentNode {
    if (found.tagName === "IFRAME") {
        try {
            const doc = (found as HTMLIFrameElement).contentDocument;
            if (doc) return doc;
        } catch { /* another origin: stays the iframe, so nothing inside it is found */ }
    }
    return found.shadowRoot ?? found;
}

/**
 * Finds a step's target now, or null if it isn't there. Each ` >>> ` part is
 * looked up inside the shadow root of the element the part before it found
 * (or in its light DOM, if it has no open shadow root), or in its document if
 * it's a same-origin iframe.
 */
export function resolveTarget(target: GuideTarget, root: ParentNode = document): Element | null {
    if (typeof target === "function") return target() ?? null;
    if (typeof target !== "string") return target.isConnected ? target : null;
    const parts = target.split(Crossing).map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length === 0) return null;
    let scope: ParentNode = root;
    let found: Element | null = null;
    for (const part of parts) {
        try {
            found = scope.querySelector(part);
        } catch {
            return null;
        }
        if (!found) return null;
        scope = innerScope(found);
    }
    return found;
}

/**
 * Finds a step's target, waiting up to `wait` ms for it to appear (polled every
 * 50 ms); resolves null if it never does.
 */
export function waitForTarget(target: GuideTarget, wait = 0, root: ParentNode = document): Promise<Element | null> {
    const now = resolveTarget(target, root);
    if (now || wait <= 0) return Promise.resolve(now);
    const until = Date.now() + wait;
    return new Promise(resolve => {
        const poll = () => {
            const found = resolveTarget(target, root);
            if (found || Date.now() >= until) resolve(found);
            else setTimeout(poll, 50);
        };
        setTimeout(poll, 50);
    });
}
