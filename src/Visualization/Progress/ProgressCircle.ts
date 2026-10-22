import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./ProgressCircle.less';

// The ring is a conic-gradient whose sweep is this property. Registered (it has to be
// done from script: @property does nothing inside a shadow root) so a change of value
// eases round instead of jumping; where registerProperty is missing it just jumps.
try {
  CSS.registerProperty?.({ name: '--juel-progress-circle-sweep', syntax: '<percentage>', inherits: false, initialValue: '0%' });
} catch { /* already registered, e.g. a second copy of Juel on the page */ }

/**
 * `<juel-progress-circle>`: the round counterpart of `<juel-progress>`. A ring that fills
 * clockwise, with whatever is slotted (a logo, a number, an icon) sitting in the middle.
 *
 * Like the bar, the fill comes from `value` (0 to 100) or, when no value is set, from the
 * `--juel-progress` custom property (a percentage), so a host can bind it to CSS
 * variables with no script: `--juel-progress: calc(var(--done) / var(--total) * 100%)`.
 *
 * Styling: `--juel-progress-size`, `--juel-progress-thickness`, `--juel-progress-gap`
 * (between the ring and the middle), `--juel-progress-fill`, `--juel-progress-track`,
 * `--juel-progress-start` (where the sweep starts, an angle; 0deg is 12 o'clock) and
 * `--juel-progress-transition`. Parts: `ring`, `content`.
 */
@customElement('juel-progress-circle')
export class ProgressCircle extends LitElement {

  static styles?: CSSResultGroup = unsafeCSS(Styles);

  // Progress value (0 to 100)
  @property({ type: Number }) value: number = 0;

  render() {
    // As in <juel-progress>: only pin the sweep inline when a value is in play, so an
    // unset value leaves the ring to `--juel-progress`.
    const value = Math.min(100, Math.max(0, this.value || 0));
    const style = value > 0 ? `--juel-progress-circle-sweep: ${value}%;` : '';
    return html`
      <div class="ring" part="ring" style=${style}></div>
      <div class="content" part="content"><slot></slot></div>
    `;
  }

  updated() {
    this.setAttribute('role', 'progressbar');
    if (this.value > 0) {
      this.setAttribute('aria-valuemin', '0');
      this.setAttribute('aria-valuemax', '100');
      this.setAttribute('aria-valuenow', String(Math.round(Math.min(100, this.value))));
    } else {
      this.removeAttribute('aria-valuenow');
    }
  }
}
