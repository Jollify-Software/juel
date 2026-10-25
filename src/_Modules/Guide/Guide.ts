// The guide (DOCS-PLAN H3): a dimmed spotlight on each step's target and a
// card beside it with the step's title, HTML body, "2 of 7", Back / Next /
// Done and Skip. Used by juel.guide.start(steps, options) and <juel-guide>.
//
// Targets may cross open shadow roots (`a-host >>> .inner`), be an element or a
// function (GuideTarget.ts). A step whose target isn't there is skipped, after
// waiting up to its `wait` ms. Arrow keys move, Escape skips the rest, and
// focus stays in the card. Light/dark come from Juel's look tokens; with
// reduced motion there is no pulse and no sliding.
import { computePosition, flip, offset, shift, Placement } from '@floating-ui/dom';
import { Options } from "./Options";
import { GuidePlacement, GuideStep, GuideStepInput, markSeen, toGuideStep } from "./GuideStep";
import { waitForTarget } from "./GuideTarget";

const stylesId = "juel-guide-styles";
const defaultHighlightPadding = "8px";
const styles = `
  .visual-guide-highlight {
    transition: top .3s ease, left .3s ease, width .3s ease, height .3s ease, border-radius .3s ease;
    animation: visual-guide-pulse 1.8s ease-out infinite;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, .7), 0 0 0 2px #fff;
  }
  .visual-guide-tooltip {
    position: fixed;
    top: 0;
    left: 0;
    box-sizing: border-box;
    width: max-content;
    max-width: min(340px, calc(100vw - 16px));
    padding: 12px 16px;
    border-radius: var(--juel-radius, 6px);
    border: 1px solid var(--juel-border, #d9dbe0);
    background: var(--juel-raised, #ffffff);
    color: var(--juel-text, #1d1f23);
    box-shadow: var(--juel-shadow-2, 0 6px 20px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.08));
    font-family: var(--juel-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
    transition: top .3s ease, left .3s ease;
    outline: none;
  }
  .visual-guide-tooltip .guide-progress { margin: 0 0 6px; font-size: 12px; color: var(--juel-text-muted, #5c616b); }
  .visual-guide-tooltip .guide-title { margin: 0 0 4px; font-size: 1.05em; }
  .visual-guide-tooltip .guide-body { margin: 0 0 12px; }
  .visual-guide-tooltip .guide-body > :first-child { margin-top: 0; }
  .visual-guide-tooltip .guide-body > :last-child { margin-bottom: 0; }
  .visual-guide-tooltip .guide-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
  .visual-guide-tooltip .guide-buttons .guide-skip { margin-inline-start: auto; }
  @keyframes visual-guide-pulse {
    0%   { box-shadow: 0 0 0 9999px rgba(0, 0, 0, .7), 0 0 0 2px #fff, 0 0 0 0 rgba(255, 255, 255, .5); }
    70%  { box-shadow: 0 0 0 9999px rgba(0, 0, 0, .7), 0 0 0 2px #fff, 0 0 0 12px rgba(255, 255, 255, 0); }
    100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, .7), 0 0 0 2px #fff, 0 0 0 12px rgba(255, 255, 255, 0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .visual-guide-highlight, .visual-guide-tooltip { animation: none; transition: none; }
  }
`;

function ensureStyles(): void {
  if (document.getElementById(stylesId)) return;
  const style = document.createElement("style");
  style.id = stylesId;
  style.textContent = styles;
  document.head.append(style);
}

/** A guide's options: today's callbacks, plus where its events go and its "seen" key. */
export interface GuideOptions extends Options {
  /** Where `guide-step` and `guide-end` are fired (default: the document). */
  host?: EventTarget;
  /** When set, the guide is remembered as seen (finished or skipped) under this key. */
  storageKey?: string;
}

/** `guide-step`'s detail. */
export interface GuideStepEventDetail {
  index: number;
  step: GuideStep;
  target: Element;
}

/** `guide-end`'s detail: `finished` is true when Done was pressed on the last step. */
export interface GuideEndEventDetail {
  finished: boolean;
}

const Placements: Record<Exclude<GuidePlacement, "auto">, Placement> = {
  above: "top", below: "bottom", left: "left", right: "right",
};

export class VisualGuide {
    private steps: GuideStep[];
    private currentStepIndex: number = -1;
    private showing = 0;
    private overlay: HTMLElement | null = null;
    private highlight: HTMLElement | null = null;
    private tooltip: HTMLElement | null = null;
    private options: GuideOptions;

    constructor(steps: GuideStepInput[], options: GuideOptions = {}) {
      this.steps = steps.map(toGuideStep);
      this.options = options;
    }

    /** Whether the guide is showing. */
    public get active(): boolean {
      return !!this.overlay;
    }

    public start(): void {
      if (this.steps.length === 0) {
        console.error("No steps provided for the guide.");
        return;
      }
      this.options.onStart?.();
      this.createOverlay();
      this.bindKeyboardEvents();
      this.showStep(0, 1);
    }

    /** Ends the guide: `finished` says whether its last step was reached and Done pressed. */
    public end(finished = false): void {
      if (!this.overlay) return;
      this.showing++;
      this.removeOverlay();
      this.unbindKeyboardEvents();
      if (this.options.storageKey) markSeen(this.options.storageKey);
      this.options.onEnd?.();
      this.fire<GuideEndEventDetail>("guide-end", { finished });
    }

    private fire<T>(name: string, detail: T): void {
      (this.options.host ?? document).dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true, composed: true }));
    }

    private createOverlay(): void {
      ensureStyles();

      // A transparent, full-viewport pointer-catcher: it blocks interaction
      // with the rest of the page during the tour. The dimmed backdrop
      // itself is drawn by the highlight box's own huge-spread box-shadow,
      // which leaves a see-through "cutout" over the target.
      const overlay = document.createElement("div");
      overlay.className = "visual-guide-overlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        z-index: 9999;
      `;
      document.body.appendChild(overlay);
      this.overlay = overlay;

      // Kept alive across steps so the CSS transitions have something
      // persistent to animate between old and new values.
      const highlight = document.createElement("div");
      highlight.className = "visual-guide-highlight";
      highlight.style.cssText = `position: fixed; pointer-events: none;`;
      overlay.appendChild(highlight);
      this.highlight = highlight;

      const tooltip = document.createElement("div");
      tooltip.className = "visual-guide-tooltip";
      tooltip.setAttribute("role", "dialog");
      tooltip.setAttribute("aria-modal", "true");
      tooltip.tabIndex = -1;
      overlay.appendChild(tooltip);
      this.tooltip = tooltip;
    }

    /**
     * Shows step `index`, or the next one in direction `dir` whose target is
     * there. Running off either end ends the guide (finished only when the last
     * step was the one being left forwards, see nextStep).
     */
    private async showStep(index: number, dir: 1 | -1): Promise<void> {
      const call = ++this.showing;
      while (index >= 0 && index < this.steps.length) {
        const step = this.steps[index];
        const element = await waitForTarget(step.target, step.wait);
        if (call !== this.showing || !this.overlay) return; // superseded or ended
        if (element) {
          this.currentStepIndex = index;
          this.scrollIntoViewIfNeeded(element, () => {
            if (call !== this.showing) return;
            this.renderStep(index, step, element);
          });
          return;
        }
        console.warn(`juel.guide: step ${index + 1}'s target isn't on the page; skipped.`);
        index += dir;
      }
      // Nothing left in that direction: going back from the first step stays put.
      if (dir < 0 && this.currentStepIndex >= 0) return;
      this.end(dir > 0 && this.currentStepIndex >= 0);
    }

    private scrollIntoViewIfNeeded(element: Element, then: () => void): void {
      const isVisible = () => {
        const r = element.getBoundingClientRect();
        return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
      };
      if (isVisible()) {
        then();
        return;
      }

      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("scrollend", onScrollEnd);
        clearTimeout(fallbackTimer);
        then();
      };
      // Only settle once the target itself is in view (another scrollend can
      // fire first); the timeout covers browsers with no scrollend event, or a
      // target taller than the viewport.
      const onScrollEnd = () => {
        if (isVisible()) finish();
      };
      window.addEventListener("scrollend", onScrollEnd);
      const fallbackTimer = setTimeout(finish, 600);
    }

    private renderStep(index: number, step: GuideStep, element: Element): void {
      if (!this.highlight || !this.tooltip) {
        return;
      }

      const targetRect = element.getBoundingClientRect();
      const targetRadius = getComputedStyle(element).borderRadius || "4px";
      const padding = this.resolveHighlightPadding();

      this.highlight.style.top = `${targetRect.top - padding}px`;
      this.highlight.style.left = `${targetRect.left - padding}px`;
      this.highlight.style.width = `${targetRect.width + padding * 2}px`;
      this.highlight.style.height = `${targetRect.height + padding * 2}px`;
      this.highlight.style.borderRadius = targetRadius;

      // Rebuilt each step; only the card's position persists between steps.
      // The title is text; the body is HTML (the page's own content).
      const tooltip = this.tooltip;
      tooltip.innerHTML = "";

      const progress = document.createElement("p");
      progress.className = "guide-progress";
      progress.textContent = `${index + 1} of ${this.steps.length}`;

      const heading = document.createElement("h3");
      heading.className = "guide-title";
      heading.id = "juel-guide-title";
      heading.textContent = step.title;
      tooltip.setAttribute("aria-labelledby", heading.id);

      const body = document.createElement("div");
      body.className = "guide-body";
      body.innerHTML = step.html;

      const buttonRow = document.createElement("div");
      buttonRow.className = "guide-buttons";
      const isFirst = index === 0;
      const isLast = index === this.steps.length - 1;

      if (!isFirst) {
        buttonRow.appendChild(this.createButton("Back", "secondary", "outline", "guide-back", () => this.prevStep()));
      }
      buttonRow.appendChild(this.createButton(isLast ? "Done" : "Next", "primary", null, isLast ? "guide-done" : "guide-next", () => this.nextStep()));
      if (!isLast) {
        buttonRow.appendChild(this.createButton("Skip", "secondary", "outline", "guide-skip", () => this.end(false)));
      }

      tooltip.append(progress, heading, body, buttonRow);

      // A virtual reference: the padded highlight box, so the card clears it.
      const reference = {
        getBoundingClientRect: () => {
          const r = element.getBoundingClientRect();
          return new DOMRect(r.left - padding, r.top - padding, r.width + padding * 2, r.height + padding * 2);
        },
      };
      const placement = step.placement === "auto" ? "bottom" : Placements[step.placement];
      computePosition(reference, tooltip, {
        strategy: "fixed",
        placement,
        middleware: [offset(10), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
      });

      if (!tooltip.contains(document.activeElement)) tooltip.focus({ preventScroll: true });
      this.fire<GuideStepEventDetail>("guide-step", { index, step, target: element });
    }

    // Resolves --guide-highlight-padding to a pixel number, however it's
    // specified (px, rem, %, ...), via a probe element. Read off the highlight
    // element itself so a page can override it at :root or more narrowly; the
    // default lives here, not in the lazily injected stylesheet, so it can't
    // win over a page's own :root rule.
    private resolveHighlightPadding(): number {
      if (!this.highlight) return 0;
      const raw = getComputedStyle(this.highlight).getPropertyValue("--guide-highlight-padding").trim() || defaultHighlightPadding;
      const probe = document.createElement("div");
      probe.style.cssText = `position: absolute; visibility: hidden; height: 0; width: ${raw};`;
      document.body.appendChild(probe);
      const px = probe.getBoundingClientRect().width;
      probe.remove();
      return px;
    }

    private createButton(label: string, type: string, renderStyle: string | null, klass: string, onClick: () => void): HTMLElement {
      const button = document.createElement("juel-button") as HTMLElement & { label: string; type: string };
      button.label = label;
      button.type = type;
      button.className = klass;
      if (renderStyle) {
        button.setAttribute("render-style", renderStyle);
      }
      button.addEventListener("button-clicked", onClick);
      return button;
    }

    private nextStep(): void {
      if (this.currentStepIndex < 0) return;
      this.options.onNext?.(this.currentStepIndex);
      if (this.currentStepIndex === this.steps.length - 1) {
        this.end(true);
        return;
      }
      this.showStep(this.currentStepIndex + 1, 1);
    }

    private prevStep(): void {
      if (this.currentStepIndex <= 0) return;
      this.options.onPrev?.(this.currentStepIndex);
      this.showStep(this.currentStepIndex - 1, -1);
    }

    private bindKeyboardEvents(): void {
      document.addEventListener("keydown", this.handleKeyboardNavigation, true);
      document.addEventListener("focusin", this.keepFocus, true);
    }

    private unbindKeyboardEvents(): void {
      document.removeEventListener("keydown", this.handleKeyboardNavigation, true);
      document.removeEventListener("focusin", this.keepFocus, true);
    }

    // Focus stays in the card: anything focused outside it sends focus back.
    private keepFocus = (e: FocusEvent): void => {
      if (!this.tooltip || e.composedPath().includes(this.tooltip)) return;
      this.tooltip.focus({ preventScroll: true });
    };

    private handleKeyboardNavigation = (e: KeyboardEvent): void => {
      const target = e.composedPath()[0] as HTMLElement;
      const isEditingText = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditingText && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        return; // let text-field cursor movement through instead of hijacking it
      }
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          this.nextStep();
          break;
        case "ArrowLeft":
          e.preventDefault();
          this.prevStep();
          break;
        case "Escape":
          e.preventDefault();
          this.end(false);
          break;
        case "Tab":
          this.cycleFocus(e);
          break;
      }
    };

    // Tab past the card's last button comes back to its first, and Shift+Tab the other way.
    private cycleFocus(e: KeyboardEvent): void {
      if (!this.tooltip) return;
      const buttons = Array.from(this.tooltip.querySelectorAll<HTMLElement>("juel-button"));
      if (buttons.length === 0) return;
      const path = e.composedPath();
      const at = buttons.findIndex(b => path.includes(b));
      const first = buttons[0], last = buttons[buttons.length - 1];
      const focus = (b: HTMLElement) => {
        e.preventDefault();
        ((b.shadowRoot?.querySelector("button") as HTMLElement | null) ?? b).focus();
      };
      if (e.shiftKey && (at <= 0)) focus(last);
      else if (!e.shiftKey && (at === -1 || at === buttons.length - 1)) focus(first);
    }

    private removeOverlay(): void {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
        this.highlight = null;
        this.tooltip = null;
      }
    }
  }
