import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Countdown.less';

@customElement('juel-countdown')
export class CountdownTimer extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);


  @property({ type: Number }) start = 10; // Start value for countdown
  @property({ type: Number }) current = this.start; // Current countdown value
  @property({ type: Number }) interval = 1000; // Interval in milliseconds
  private timerId: number | undefined;

  firstUpdated() {
    this.startCountdown();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearCountdown();
  }

  private startCountdown() {
    this.current = this.start;
    this.clearCountdown(); // Clear any existing timer
    this.timerId = window.setInterval(() => {
      this.current -= 1;
      this.dispatchEvent(
        new CustomEvent('countdown-tick', {
          detail: { value: this.current },
          bubbles: true,
          composed: true,
        })
      );

      if (this.current <= 0) {
        this.clearCountdown();
      }
    }, this.interval);
  }

  private clearCountdown() {
    if (this.timerId !== undefined) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private getClass() {
    return this.current <= 10 ? 'countdown pulsate' : 'countdown';
  }

  render() {
    return html`<div class=${this.getClass()}>${this.current}</div>`;
  }
}