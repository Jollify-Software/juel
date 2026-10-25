// The rebuilt guide's step shape and its "seen" memory (DOCS-PLAN H3).
// Used by VisualGuide (Guide.ts), juel.guide and <juel-guide>.
import { GuideTarget } from "./GuideTarget";
import { Step } from "./Step";

/** Where a step's card sits beside its target. */
export type GuidePlacement = "auto" | "above" | "below" | "left" | "right";

/** One step of a guide. */
export interface GuideStep {
    /** What to point at: a selector (` >>> ` crosses into a shadow root), an element, or a function. */
    target: GuideTarget;
    title: string;
    /** The step's body, as HTML. */
    html: string;
    placement: GuidePlacement;
    /** How long (ms) to wait for a missing target before skipping the step; 0 skips at once. */
    wait: number;
}

/** A step as a caller may give it: the new fields, or today's `{ selector, title, description }`. */
export type GuideStepInput = Partial<GuideStep> & Partial<Step>;

const Placements: GuidePlacement[] = ["auto", "above", "below", "left", "right"];

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/**
 * Fills in a step's defaults. Today's steps keep working: `selector` is the
 * target and `description` is plain text (escaped into the HTML body).
 */
export function toGuideStep(input: GuideStepInput): GuideStep {
    const placement = Placements.includes(input.placement as GuidePlacement) ? input.placement as GuidePlacement : "auto";
    return {
        target: input.target ?? input.selector ?? "",
        title: input.title ?? "",
        html: input.html ?? (input.description ? escapeHtml(input.description) : ""),
        placement,
        wait: Math.max(0, Number(input.wait) || 0),
    };
}

const SeenPrefix = "juel-guide-seen:";

/** Whether the guide stored under `key` has been seen (finished or skipped) on this browser. */
export function isSeen(key: string): boolean {
    try {
        return !!key && localStorage.getItem(SeenPrefix + key) === "1";
    } catch {
        return false;
    }
}

/** Remembers that the guide stored under `key` has been seen. */
export function markSeen(key: string): void {
    try {
        if (key) localStorage.setItem(SeenPrefix + key, "1");
    } catch { /* storage may be off: the guide is then offered again */ }
}

/** Forgets that the guide stored under `key` was seen, so a page offers it again. */
export function resetSeen(key: string): void {
    try {
        if (key) localStorage.removeItem(SeenPrefix + key);
    } catch { /* nothing stored */ }
}
