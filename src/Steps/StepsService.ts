import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { JuelSteps } from "./Steps";

export class StepsService {
  currentStep: number = 0;
  numSteps: number = 0;
  constructor(private steps: JuelSteps) {

  }

  init() {
    let indicators = this.steps.shadowRoot.getElementById("indicators");
    for (let i = 0; i < this.numSteps; i++) {
      let span = document.createElement("div");
      span.className = "step-indicator";
      span.setAttribute("data-index", i.toString());
      //span.click = () => this.showTab(i);
      indicators.append(span);
    }

    this.showTab(this.currentStep);
  }

  showTab(n: number) {

    // This function will display the specified tab of the form ...
    var x = this.steps.shadowRoot.querySelector(`.step[data-index="${n}"]`) as HTMLElement;
    if (x) {
      x.style.display = "block";
      // ... and fix the Previous/Next buttons:
      if (n == 0) {
        this.steps.shadowRoot.getElementById("prevBtn").style.display = "none";
      } else {
        this.steps.shadowRoot.getElementById("prevBtn").style.display = "inline";
      }
      if (n == (this.numSteps - 1)) {
        this.steps.shadowRoot.getElementById("nextBtn").innerHTML = "Submit";
      } else {
        this.steps.shadowRoot.getElementById("nextBtn").innerHTML = "Next";
      }
      // ... and run a function that displays the correct step indicator:
      this.fixStepIndicator(n)

      let args: ChangedEventArgs = {
        index: n
      };
      let e = new CustomEvent(JuelSteps.StepChanged, {
        detail: args
      });
      this.steps.dispatchEvent(e);
    }
  }

  nextPrev(n) {
    if (this.currentStep + n < this.numSteps) {
      var x = this.steps.shadowRoot.querySelector(`.step[data-index="${this.currentStep}"]`) as HTMLElement;
      if (x) {
        // Hide the current tab:
        x.style.display = "none";
        // Increase or decrease the current tab by 1:
        this.currentStep = this.currentStep + n;
        // Otherwise, display the correct tab:
        this.showTab(this.currentStep);
      }
    } else if (this.currentStep + n == this.numSteps) {
      let e = new CustomEvent(JuelSteps.Submit);
      this.steps.dispatchEvent(e);
    }
  }
  fixStepIndicator(n) {
    // This function removes the "active" class of all steps...
    var i, x = this.steps.shadowRoot.querySelectorAll(".step-indicator.active");
    for (i = 0; i < x.length; i++) {
      x[i].classList.remove("active");
    }
    //... and adds the "active" class to the current step:
    let indicator = this.steps.shadowRoot.querySelector(`.step-indicator[data-index="${n}"]`);
    if (indicator) {
      indicator.classList.add("active");
    }
  }
}