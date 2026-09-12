import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import Styles from 'bundle-text:./Qr.less';
import { toQrMatrix, QrEcl } from './QrMatrix';

/**
 * `<juel-qr value="https://…">` — renders a QR code as crisp, scalable SVG.
 *
 * Attributes: `value` (string to encode), `ecl` (L|M|Q|H, default M),
 * `scale` (px per module, default 4), `margin` (quiet-zone modules, default 4),
 * `foreground` / `background` (colours — keep them high-contrast or readers
 * fail), `label` (accessible name).
 *
 * Events: `qr-render` ({ value, size, version }) after a successful draw,
 * `qr-error` ({ value, error }) when the payload is empty or too large.
 */
@customElement('juel-qr')
export class JuelQr extends LitElement {
  static styles = unsafeCSS(Styles);

  @property() value = '';
  @property() ecl: QrEcl = 'M';
  @property({ type: Number }) scale = 4;
  @property({ type: Number }) margin = 4;
  @property() foreground = '#000000';
  @property() background = '#ffffff';
  @property() label = '';

  private emit(name: 'qr-render' | 'qr-error', detail: unknown) {
    // Defer: dispatching mid-render is a Lit foot-gun.
    queueMicrotask(() =>
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true })));
  }

  render() {
    let grid;
    try {
      grid = toQrMatrix(this.value, { ecl: this.ecl, margin: this.margin });
    } catch (error) {
      this.emit('qr-error', { value: this.value, error });
      return html``;
    }

    const { size, modules, version } = grid;

    // One <path> for every dark module — far fewer SVG nodes than a rect grid.
    let d = '';
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (modules[r][c]) d += `M${c} ${r}h1v1h-1z`;

    this.emit('qr-render', { value: this.value, size, version });

    const px = size * Math.max(1, this.scale);
    return html`
      <svg part="svg" xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 ${size} ${size}" width=${px} height=${px}
           shape-rendering="crispEdges" role="img"
           aria-label=${this.label || this.value}>
        <rect width=${size} height=${size} fill=${this.background}></rect>
        <path d=${d} fill=${this.foreground}></path>
      </svg>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'juel-qr': JuelQr;
  }
}
