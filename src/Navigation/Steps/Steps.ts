import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement('juel-steps')
export class JuelSteps extends LitElement {
  // The total number of steps
  @property({ type: Number }) totalSteps: number = 0;

  // The current active step (1-indexed)
  @property({ type: Number }) currentStep: number = 1;
  
  render() {
    return html`
      <div class="steps-container">
        ${Array.from({ length: this.totalSteps }, (_, index) => html`
          <div
            class="step ${this.getStepClass(index + 1)}"
            @click="${() => this.goToStep(index + 1)}"
          >
            Step ${index + 1}
          </div>
        `)}
      </div>

      <div class="navigation">
        <button @click="${this.previousStep}" ?disabled="${this.currentStep === 1}">Previous</button>
        <button @click="${this.nextStep}" ?disabled="${this.currentStep === this.totalSteps}">Next</button>
      </div>
    `;
  }

  // Get the class for a step (active, completed, or default)
  private getStepClass(step: number): string {
    if (step < this.currentStep) return 'completed';
    if (step === this.currentStep) return 'active';
    return '';
  }

  // Navigate to a specific step
  private goToStep(step: number) {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
      this.dispatchEvent(new CustomEvent('step-change', { detail: { step } }));
    }
  }

  // Navigate to the previous step
  private previousStep() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  // Navigate to the next step
  private nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  }
}