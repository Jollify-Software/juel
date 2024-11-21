import { Options } from "./Options";
import { Step } from "./Step";

export class VisualGuide {
    private steps: Step[];
    private currentStepIndex: number = 0;
    private overlay: HTMLElement | null = null;
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
      const overlay = document.createElement("div");
      overlay.className = "visual-guide-overlay";
  
      const style = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-family: Arial, sans-serif;
      `;
      overlay.style.cssText = style;
  
      document.body.appendChild(overlay);
      this.overlay = overlay;
    }
  
    private showStep(index: number): void {
      if (!this.overlay || index < 0 || index >= this.steps.length) {
        return;
      }
  
      this.overlay.innerHTML = ""; // Clear previous content
      this.currentStepIndex = index;
  
      const step = this.steps[index];
      let element = document.querySelector(step.selector);
      const targetRect = element.getBoundingClientRect();
  
      // Highlight box
      const highlight = document.createElement("div");
      highlight.className = "visual-guide-highlight";
      const highlightStyle = `
        position: absolute;
        top: ${targetRect.top}px;
        left: ${targetRect.left}px;
        width: ${targetRect.width}px;
        height: ${targetRect.height}px;
        border: 2px solid #fff;
        box-shadow: 0 0 10px #fff;
        pointer-events: none;
      `;
      highlight.style.cssText = highlightStyle;
  
      // Tooltip box
      const tooltip = document.createElement("div");
      tooltip.className = "visual-guide-tooltip";
      const tooltipStyle = `
        position: absolute;
        top: ${targetRect.bottom + 10}px;
        left: ${targetRect.left}px;
        background: #333;
        padding: 10px 15px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
        z-index: 10000;
      `;
      tooltip.style.cssText = tooltipStyle;
      tooltip.innerHTML = `
        <h3>${step.title}</h3>
        <p>${step.description}</p>
        <div>
          <button id="visual-guide-prev">Previous</button>
          <button id="visual-guide-next">Next</button>
          <button id="visual-guide-end">End</button>
        </div>
      `;
  
      this.overlay.appendChild(highlight);
      this.overlay.appendChild(tooltip);
  
      // Button Event Listeners
      document.getElementById("visual-guide-prev")?.addEventListener("click", () => this.prevStep());
      document.getElementById("visual-guide-next")?.addEventListener("click", () => this.nextStep());
      document.getElementById("visual-guide-end")?.addEventListener("click", () => this.end());
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
      }
    }
  }
  