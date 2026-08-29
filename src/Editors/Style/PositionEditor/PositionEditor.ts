import { css, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StylePropertyEditorBase } from '../StylePropertyEditorBase';
import { PositionEditorEvents } from './PositionEditorEvents';
import {
  Box,
  Fraction,
  PositionUnit,
  clampFraction,
  formatPosition,
  parsePosition,
} from './PositionValue';

/**
 * `<juel-position-editor>` — a visual editor for two-axis CSS `<position>`
 * values (`transform-origin`, `object-position`, `background-position`,
 * `perspective-origin`, …).
 *
 * Point at a reference element with `for` (or set `.target`); the picker overlay
 * then tracks that element's box and reports the click as a percentage / pixel /
 * keyword position of it. With `css-property` set it also writes the value to the
 * element's inline style live while you drag. Every committed pick is an undo
 * step. See {@link StylePropertyEditorBase} for the shared plumbing.
 */
@customElement('juel-position-editor')
export class JuelPositionEditor extends StylePropertyEditorBase {
  static styles = [
    StylePropertyEditorBase.baseStyles,
    css`
      :host {
        display: inline-flex;
        font-family: inherit;
      }
    `,
  ];

  /** Output format. */
  @property({ type: String }) unit: PositionUnit = 'percent';

  /** Clamp picks to the element box (0–100%). Off by default — origins allow overflow. */
  @property({ type: Boolean }) clamp = false;

  /** Decimal places for numeric output. */
  @property({ type: Number }) precision: number | undefined;

  /** Label for the pick button. */
  @property({ type: String }) label = 'Pick point';

  @state() private fx = 0.5;
  @state() private fy = 0.5;
  @state() private picking = false;

  private baselineFx = 0.5;
  private baselineFy = 0.5;
  private pickAnchorValue = '';
  private overlay: HTMLDivElement | null = null;
  private marker: HTMLDivElement | null = null;
  private dragging = false;
  private rafId = 0;

  constructor() {
    super();
    this.value = '50% 50%';
    this.property = 'position';
  }

  // --- StylePropertyEditorBase hooks -----------------------------------

  protected get seedFallback(): string {
    return '50% 50%';
  }

  protected get changeEventName(): string {
    return PositionEditorEvents.Changed;
  }

  protected parse(value: string): void {
    const parsed = parsePosition(value, this.getBox());
    if (parsed) {
      this.fx = parsed.fx;
      this.fy = parsed.fy;
    }
  }

  protected serialize(): string {
    return formatPosition(
      { fx: this.fx, fy: this.fy },
      { unit: this.unit, box: this.getBox(), precision: this.precision }
    );
  }

  protected onReady(): void {
    this.baselineFx = this.fx;
    this.baselineFy = this.fy;
  }

  protected onTeardown(): void {
    this.stopPicking(false);
  }

  protected isAtBaseline(): boolean {
    return (
      Math.abs(this.fx - this.baselineFx) < 1e-4 &&
      Math.abs(this.fy - this.baselineFy) < 1e-4
    );
  }

  /** Route base reasons onto this component's historical event surface. */
  protected emitChange(reason: string, detail: Record<string, unknown> = {}): void {
    const name =
      reason === 'preview'
        ? PositionEditorEvents.Preview
        : reason === 'cancel'
          ? PositionEditorEvents.Cancelled
          : PositionEditorEvents.Changed;
    this.dispatchEvent(
      new CustomEvent(name, {
        detail: { value: this.value, fx: this.fx, fy: this.fy, unit: this.unit, reason, ...detail },
        bubbles: true,
        composed: true,
      })
    );
  }

  updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('unit') && !this.picking && changed.get('unit') !== undefined) {
      // Display-only change: re-render the same point in the new format.
      this.reserialize();
    }
  }

  // --- picking --------------------------------------------------------

  private startPicking = (): void => {
    if (this.picking) return;
    this.resolveTarget();
    this.pickAnchorValue = this.value;
    this.picking = true;

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      zIndex: '2147483647',
      background: 'rgba(0, 0, 0, 0.28)',
      cursor: 'crosshair',
      touchAction: 'none',
    } as Partial<CSSStyleDeclaration>);
    overlay.setAttribute('part', 'overlay');

    const marker = document.createElement('div');
    Object.assign(marker.style, {
      position: 'absolute',
      width: '0',
      height: '0',
      boxShadow: `0 0 0 1px #fff, 0 0 0 2px rgba(0,0,0,0.5)`,
      outline: '9999px solid transparent',
    } as Partial<CSSStyleDeclaration>);
    marker.innerHTML =
      `<span style="position:absolute;left:-10px;top:0;width:20px;border-top:1px solid #fff;box-shadow:0 0 1px #000"></span>` +
      `<span style="position:absolute;top:-10px;left:0;height:20px;border-left:1px solid #fff;box-shadow:0 0 1px #000"></span>`;
    overlay.appendChild(marker);

    overlay.addEventListener('pointerdown', this.onPointerDown);
    overlay.addEventListener('pointermove', this.onPointerMove);
    overlay.addEventListener('pointerup', this.onPointerUp);
    overlay.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('keydown', this.onKeydown, true);

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.marker = marker;
    this.trackGeometry();
  };

  private stopPicking(commit: boolean): void {
    if (!this.picking && !this.overlay) return;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.overlay) {
      this.overlay.removeEventListener('pointerdown', this.onPointerDown);
      this.overlay.removeEventListener('pointermove', this.onPointerMove);
      this.overlay.removeEventListener('pointerup', this.onPointerUp);
      this.overlay.removeEventListener('contextmenu', this.onContextMenu);
      this.overlay.remove();
    }
    document.removeEventListener('keydown', this.onKeydown, true);
    this.overlay = null;
    this.marker = null;
    this.dragging = false;
    this.picking = false;

    if (!commit) {
      const parsed = parsePosition(this.pickAnchorValue, this.getBox());
      if (parsed) {
        this.fx = parsed.fx;
        this.fy = parsed.fy;
      }
      this.cancelPreview(this.pickAnchorValue);
    }
  }

  private trackGeometry = (): void => {
    if (!this.overlay) return;
    const rect = this.referenceRect();
    const o = this.overlay.style;
    o.left = `${rect.left}px`;
    o.top = `${rect.top}px`;
    o.width = `${rect.width}px`;
    o.height = `${rect.height}px`;
    if (this.marker && !this.dragging) {
      this.marker.style.left = `${this.fx * 100}%`;
      this.marker.style.top = `${this.fy * 100}%`;
    }
    this.rafId = requestAnimationFrame(this.trackGeometry);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button === 2) return;
    e.preventDefault();
    this.dragging = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    this.pointTo(e, false);
  };
  private onPointerMove = (e: PointerEvent): void => {
    if (this.dragging) this.pointTo(e, false);
  };
  private onPointerUp = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.pointTo(e, true);
    this.stopPicking(true);
  };
  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    this.stopPicking(false);
  };
  private onKeydown = (e: KeyboardEvent): void => {
    if (this.picking && e.key === 'Escape') {
      e.preventDefault();
      this.stopPicking(false);
    }
  };

  private pointTo(e: PointerEvent, commit: boolean): void {
    if (!this.overlay) return;
    const rect = this.overlay.getBoundingClientRect();
    let frac: Fraction = {
      fx: rect.width ? (e.clientX - rect.left) / rect.width : 0.5,
      fy: rect.height ? (e.clientY - rect.top) / rect.height : 0.5,
    };
    if (this.clamp) frac = clampFraction(frac);
    this.fx = frac.fx;
    this.fy = frac.fy;
    if (this.marker) {
      this.marker.style.left = `${this.fx * 100}%`;
      this.marker.style.top = `${this.fy * 100}%`;
    }
    if (commit) {
      this.commit('pick');
    } else {
      this.previewChange();
    }
  }

  // --- geometry helpers ---------------------------------------------

  private referenceRect(): { left: number; top: number; width: number; height: number } {
    const box = this.getBox();
    if (this.target) {
      const r = this.target.getBoundingClientRect();
      return { left: r.left, top: r.top, width: box.width, height: box.height };
    }
    return { left: 0, top: 0, width: box.width, height: box.height };
  }

  private getBox(): Box {
    if (this.target) {
      const w = this.target.offsetWidth || this.target.getBoundingClientRect().width;
      const h = this.target.offsetHeight || this.target.getBoundingClientRect().height;
      return { width: w, height: h };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  protected renderControls() {
    return html`
      <juel-button @button-clicked=${this.startPicking}>${this.label}</juel-button>
      <code class="se-readout" part="readout">${this.value}</code>
    `;
  }
}
