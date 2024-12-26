import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('countdown-timer')
export class CountdownTimer extends LitElement {
  @property({ type: Number })
  start: number = 10; // Starting value for the countdown

  @property({ type: Number })
  end: number = 0; // End value for the countdown

  @property({ type: Number })
  time: number = 1000; // Time in milliseconds for the countdown

  @property({ type: Number })
  threshold: number = 10; // Threshold value to apply animation

  @property({ type: String })
  animation: string = 'pulse'; // CSS class name for animation

  @property({ type: Number })
  interval: number = 1000; // Calculated interval between ticks

  private currentValue: number = this.start;
  private timerId: number | undefined;
  private step: number = 1; // Amount to subtract or add per interval

  static styles = css`
    .animated {
      animation: var(--animation-duration, 0.5s) ease-in-out;
    }

    .pulse {
      @keyframes pulse {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }

      animation-name: pulse;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.initializeTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearTimer();
  }

  initializeTimer() {
    const range = Math.abs(this.start - this.end);
    this.interval = this.time / range;
    this.step = range / (this.time / this.interval);
    this.currentValue = this.start;

    console.log('Interval:', this.interval);
    console.log('Step:', this.step);

    this.timerId = window.setInterval(() => {
      if (
        (this.start > this.end && this.currentValue <= this.end) ||
        (this.start < this.end && this.currentValue >= this.end)
      ) {
        this.clearTimer();
        return;
      }

      this.currentValue += this.start > this.end ? -this.step : this.step;
      this.currentValue = Math.round(this.currentValue); // Ensure integer 
      console.log('Current Value:', this.currentValue);
      this.dispatchEvent(new CustomEvent('tick', {
        detail: { value: this.currentValue },
      }));

      this.requestUpdate();
    }, this.interval);
  }

  clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  render() {
    const isThreshold =
      this.start > this.end
        ? this.currentValue <= this.threshold
        : this.currentValue >= this.threshold;

    return html`
      <div
        class=${isThreshold ? `animated ${this.animation}` : ''}
        style="--animation-duration: ${this.interval / 1000}s"
      >
        ${this.currentValue}
      </div>
    `;
  }
}