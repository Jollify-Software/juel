import { Options } from "./Options";
import { Step } from "./Step";

const stylesId = "juel-guide-styles";
const defaultHighlightPadding = "8px";
const styles = `
  .visual-guide-highlight {
    transition: top .3s ease, left .3s ease, width .3s ease, height .3s ease, border-radius .3s ease;
    animation: visual-guide-pulse 1.8s ease-out infinite;
  }
  .visual-guide-tooltip {
    transition: top .3s ease, left .3s ease;
  }
  @keyframes visual-guide-pulse {
    0%   { box-shadow: 0 0 0 9999px rgba(0, 0, 0, .7), 0 0 0 2px #fff, 0 0 0 0 rgba(255, 255, 255, .5); }
    70%  { box-shadow: 0 0 0 9999px rgba(0, 0, 0, .7), 0 0 0 2px #fff, 0 0 0 12px rgba(255, 255, 255, 0); }
    100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, .7), 0 0 0 2px #fff, 0 0 0 12px rgba(255, 255, 255, 0); }
  }
`;

function ensureStyles(): void {
  if (document.getElementById(stylesId)) return;
  const style = document.createElement("style");
  style.id = stylesId;
  style.textContent = styles;
  document.head.append(style);
}

export class VisualGuide {
    private steps: Step[];
    private currentStepIndex: number = 0;
    private overlay: HTMLElement | null = null;
    private highlight: HTMLElement | null = null;
    private tooltip: HTMLElement | null = null;
    private options: Options;

    constructor(steps: Step[], options: Options = {}) {
      this.steps = steps;
      this.options = options;
    }

    public start(): void {
      if (this.steps.length === 0) {
        console.error("No steps provided for the guide.");
        return;
      }
      this.options.onStart?.();
      this.createOverlay();
      this.showStep(0);
      this.bindKeyboardEvents();
    }

    public end(): void {
      this.options.onEnd?.();
      this.removeOverlay();
      this.unbindKeyboardEvents();
    }

    private createOverlay(): void {
      ensureStyles();

      // A transparent, full-viewport pointer-catcher — it blocks interaction
      // with the rest of the page during the tour. The dimmed backdrop
      // itself is drawn by the highlight box's own huge-spread box-shadow
      // (below), which leaves a genuine see-through "cutout" over the
      // target rather than just drawing a border on top of a uniformly
      // darkened layer.
      const overlay = document.createElement("div");
      overlay.className = "visual-guide-overlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        z-index: 9999;
        font-family: Arial, sans-serif;
      `;
      document.body.appendChild(overlay);
      this.overlay = overlay;

      // Created once and kept alive across steps (rather than rebuilt from
      // scratch every showStep()) so the CSS transitions above actually
      // have something persistent to animate between old and new values.
      const highlight = document.createElement("div");
      highlight.className = "visual-guide-highlight";
      highlight.style.cssText = `
        position: fixed;
        pointer-events: none;
      `;
      overlay.appendChild(highlight);
      this.highlight = highlight;

      const tooltip = document.createElement("div");
      tooltip.className = "visual-guide-tooltip";
      tooltip.style.cssText = `
        position: fixed;
        background: #333;
        color: #fff;
        padding: 10px 15px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
        max-width: 320px;
      `;
      overlay.appendChild(tooltip);
      this.tooltip = tooltip;
    }

    private showStep(index: number): void {
      if (!this.overlay || !this.highlight || !this.tooltip || index < 0 || index >= this.steps.length) {
        return;
      }

      const step = this.steps[index];
      let element = document.querySelector(step.selector);
      if (!element) {
        console.error(`VisualGuide: no element matches selector "${step.selector}" for step ${index + 1} — leaving the guide where it was.`);
        return;
      }

      this.currentStepIndex = index;

      // A step's target can easily be scrolled out of view — e.g. the tour
      // was started from a button further down the page than the first
      // target. Without this, the highlight/tooltip still get created and
      // positioned correctly relative to the viewport, just somewhere the
      // user can't see, which looks exactly like "nothing happened."
      this.scrollIntoViewIfNeeded(element, () => {
        // A newer showStep() call may have superseded this one while the
        // scroll was still settling (e.g. the user clicked Next twice in a
        // row) — currentStepIndex only ever reflects the latest call, so a
        // mismatch here means this callback is stale.
        if (this.currentStepIndex !== index) return;
        this.renderStep(index, step, element!);
      });
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

      element.scrollIntoView({ behavior: "smooth", block: "center" });

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("scrollend", onScrollEnd);
        clearTimeout(fallbackTimer);
        then();
      };
      // Don't just take the first scrollend — something else on the page
      // (in testing, even Playwright's own pre-click auto-scroll of the
      // button being clicked) can fire one moments before our own
      // scrollIntoView() above has actually moved anything, which would
      // otherwise resolve `then()` using the target's still-off-screen
      // pre-scroll position. Only treat it as settled once the target
      // itself is actually where we expect it; the timeout is a safety net
      // for browsers with no scrollend event (Safari, as of this writing)
      // or if visibility is never quite achievable (e.g. a target taller
      // than the viewport).
      const onScrollEnd = () => {
        if (isVisible()) finish();
      };
      window.addEventListener("scrollend", onScrollEnd);
      const fallbackTimer = setTimeout(finish, 600);
    }

    private renderStep(index: number, step: Step, element: Element): void {
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

      // Prefer below the (padded) highlight; flip above if there's not
      // enough room, so the tooltip stays on-screen for targets near the
      // bottom of the viewport (a real concern once step targets vary in
      // size/position).
      const highlightTop = targetRect.top - padding;
      const highlightBottom = targetRect.bottom + padding;
      const estimatedTooltipHeight = 140;
      const showAbove = highlightBottom + estimatedTooltipHeight > window.innerHeight && highlightTop > estimatedTooltipHeight;
      const tooltipTop = showAbove ? highlightTop - estimatedTooltipHeight : highlightBottom + 10;
      const tooltipLeft = Math.max(10, Math.min(targetRect.left - padding, window.innerWidth - 330));

      this.tooltip.style.top = `${tooltipTop}px`;
      this.tooltip.style.left = `${tooltipLeft}px`;

      // Content is rebuilt each step (it's cheap, and simpler than diffing)
      // — only the highlight/tooltip *position* needs to persist for the
      // transition to animate. step.title/description are author-supplied
      // data (potentially from an API or other dynamic source), so they go
      // in via textContent, not raw HTML.
      this.tooltip.innerHTML = "";

      const progress = document.createElement("p");
      progress.style.cssText = "margin: 0 0 8px; font-size: 12px; opacity: .75;";
      progress.textContent = `Step ${index + 1} of ${this.steps.length}`;

      const heading = document.createElement("h3");
      heading.style.cssText = "margin: 0 0 4px;";
      heading.textContent = step.title;

      const description = document.createElement("p");
      description.style.cssText = "margin: 0 0 10px;";
      description.textContent = step.description;

      const buttonRow = document.createElement("div");
      buttonRow.style.cssText = "display: flex; gap: 8px; flex-wrap: wrap;";
      const isFirst = index === 0;
      const isLast = index === this.steps.length - 1;

      if (!isFirst) {
        buttonRow.appendChild(this.createButton("Previous", "secondary", "outline", () => this.prevStep()));
      }

      buttonRow.appendChild(this.createButton(isLast ? "Finish" : "Next", "primary", null, () => isLast ? this.end() : this.nextStep()));

      if (!isLast) {
        buttonRow.appendChild(this.createButton("End", "secondary", "outline", () => this.end()));
      }

      this.tooltip.appendChild(progress);
      this.tooltip.appendChild(heading);
      this.tooltip.appendChild(description);
      this.tooltip.appendChild(buttonRow);
    }

    // Resolves --guide-highlight-padding to a pixel number, however it's
    // specified (px, rem, %, ...) — via a probe element rather than parsing
    // the string, so any valid CSS length "just works". Reads it off the
    // highlight element itself so a page can override the custom property
    // at :root or scope it more narrowly if it wants to. The default lives
    // here in JS, not as a competing :root rule in our own injected
    // stylesheet — that stylesheet is only added lazily on first start(),
    // so a rule there would load (and, in a specificity tie, win over) a
    // page's own :root override declared earlier in the document.
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

    private createButton(label: string, type: string, renderStyle: string | null, onClick: () => void): HTMLElement {
      const button = document.createElement("juel-button") as HTMLElement & { label: string; type: string; renderStyle?: string };
      button.label = label;
      button.type = type;
      if (renderStyle) {
        button.setAttribute("render-style", renderStyle);
      }
      button.addEventListener("button-clicked", onClick);
      return button;
    }

    private nextStep(): void {
      this.options.onNext?.(this.currentStepIndex);
      this.showStep(this.currentStepIndex + 1);
    }

    private prevStep(): void {
      this.options.onPrev?.(this.currentStepIndex);
      this.showStep(this.currentStepIndex - 1);
    }

    private bindKeyboardEvents(): void {
      document.addEventListener("keydown", this.handleKeyboardNavigation);
    }

    private unbindKeyboardEvents(): void {
      document.removeEventListener("keydown", this.handleKeyboardNavigation);
    }

    private handleKeyboardNavigation = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      const isEditingText = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditingText && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        return; // let text-field cursor movement through instead of hijacking it
      }
      switch (e.key) {
        case "ArrowRight":
          this.nextStep();
          break;
        case "ArrowLeft":
          this.prevStep();
          break;
        case "Escape":
          this.end();
          break;
      }
    };

    private removeOverlay(): void {
      if (this.overlay) {
        document.body.removeChild(this.overlay);
        this.overlay = null;
        this.highlight = null;
        this.tooltip = null;
      }
    }
  }
