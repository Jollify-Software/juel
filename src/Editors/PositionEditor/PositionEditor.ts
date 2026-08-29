import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HistoryController } from '../../_Base/HistoryController';
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
 * step — `undo()` / `redo()` / the toolbar arrows walk the history (backed by
 * the reusable {@link HistoryController}).
 */
@customElement('juel-position-editor')
export class JuelPositionEditor extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      font-family: inherit;
    }
    .toolbar {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }
    button.hist {
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      font-size: 1rem;
      line-height: 1;
      border: 1px solid var(--border-color, #ced4da);
      border-radius: 4px;
      background: var(--surface, #fff);
      color: inherit;
      cursor: pointer;
    }
    button.hist:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .readout {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8125rem;
      opacity: 0.75;
      white-space: nowrap;
    }
  `;

  /** CSS selector for the reference element. Ignored if `target` is set directly. */
  @property({ type: String }) for = '';

  /** The reference element. Settable directly as an alternative to `for`. */
  @property({ attribute: false }) target: HTMLElement | null = null;

  /** CSS property to seed from and live-apply while editing (e.g. `transform-origin`). */
  @property({ type: String, attribute: 'css-property' }) cssProperty = '';

  /** Output format. */
  @property({ type: String }) unit: PositionUnit = 'percent';

  /** Current value as a CSS position string. */
  @property({ type: String, reflect: true }) value = '50% 50%';

  /** Clamp picks to the element box (0–100%). Off by default — origins allow overflow. */
  @property({ type: Boolean }) clamp = false;

  /** Decimal places for numeric output. */
  @property({ type: Number }) precision: number | undefined;

  /** Label for the pick button. */
  @property({ type: String }) label = 'Pick point';

  /** Optional JS model binding: `context[property] = value` on every change. */
  @property({ attribute: false }) context: Record<string, unknown> | string | undefined;
  @property({ type: String }) property = 'position';

  @state() private fx = 0.5;
  @state() private fy = 0.5;
  @state() private picking = false;

  private history?: HistoryController<string>;
  private hadInlineValue = false;
  private baselineFx = 0.5;
  private baselineFy = 0.5;
  private pickAnchorValue = '';
  private overlay: HTMLDivElement | null = null;
  private marker: HTMLDivElement | null = null;
  private dragging = false;
  private rafId = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.resolveTarget();

    if (typeof this.context === 'string' && this.context in window) {
      this.context = (window as unknown as Record<string, Record<string, unknown>>)[this.context];
    }
    // Seed once layout exists — the box size is needed to turn a computed
    // `<length>` seed value into a fraction. rAF (not firstUpdated) so it does
    // not depend on an update cycle running.
    if (!this.history) {
      requestAnimationFrame(() => this.initHistory());
    }
  }

  firstUpdated(): void {
    this.initHistory();
  }

  private initHistory(): void {
    if (this.history || !this.isConnected) return;
    this.resolveTarget();

    const seed = this.seedValue();
    const parsed = parsePosition(seed, this.getBox());
    if (parsed) {
      ({ fx: this.fx, fy: this.fy } = parsed);
    }
    this.value = this.format();
    this.baselineFx = this.fx;
    this.baselineFy = this.fy;
    this.hadInlineValue =
      !!this.target && !!this.cssProperty &&
      this.target.style.getPropertyValue(this.cssProperty).trim() !== '';
    this.history = new HistoryController<string>(this, this.value, {
      apply: (v) => this.applyValue(v),
    });
    this.requestUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopPicking(false);
  }

  updated(changed: PropertyValues): void {
    if ((changed.has('for') || changed.has('target')) && !this.picking) {
      this.resolveTarget();
    }
    if (changed.has('unit') && !this.picking && changed.get('unit') !== undefined) {
      // Display-only change: re-render the same point in the new format.
      this.value = this.format();
      this.liveApply(this.value);
    }
  }

  // --- public API -----------------------------------------------------------

  get canUndo(): boolean {
    return !!this.history?.canUndo;
  }
  get canRedo(): boolean {
    return !!this.history?.canRedo;
  }

  undo(): void {
    this.history?.undo();
    if (this.history) this.emitChanged('undo');
  }
  redo(): void {
    this.history?.redo();
    if (this.history) this.emitChanged('redo');
  }
  /** Hard-reset to the value the editor started with. */
  reset(): void {
    this.history?.reset();
    if (this.history) this.emitChanged('reset');
  }

  // --- picking ------------------------------------------------------------

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
    // Crosshair arms.
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
      this.history?.discardPreview();
      if (this.pickAnchorValue) {
        this.applyValue(this.pickAnchorValue);
      }
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
    this.cancelPicking();
  };
  private onKeydown = (e: KeyboardEvent): void => {
    if (this.picking && e.key === 'Escape') {
      e.preventDefault();
      this.cancelPicking();
    }
  };

  private cancelPicking(): void {
    this.stopPicking(false);
    this.dispatchEvent(
      new CustomEvent(PositionEditorEvents.Cancelled, { bubbles: true, composed: true })
    );
  }

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
    const v = this.format();
    this.value = v;
    this.liveApply(v);
    this.pushContext();

    if (commit) {
      this.history?.record(v);
      this.emitChanged('pick');
    } else {
      this.history?.preview(v);
      this.dispatchEvent(
        new CustomEvent(PositionEditorEvents.Preview, {
          detail: { value: v, fx: this.fx, fy: this.fy, unit: this.unit },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  // --- value plumbing ---------------------------------------------------------

  /** History `apply` callback + cancel restore: adopt `v` without recording it. */
  private applyValue(v: string): void {
    const parsed = parsePosition(v, this.getBox());
    if (parsed) {
      this.fx = parsed.fx;
      this.fy = parsed.fy;
    }
    this.value = v;
    this.liveApply(v);
    this.pushContext();
  }

  private liveApply(v: string): void {
    if (!this.target || !this.cssProperty) return;
    // Back at the exact starting point, with nothing to undo and no inline value
    // to begin with: leave the element as we found it rather than pinning a
    // value inline. Compared as fractions so a unit switch still counts as "at
    // baseline".
    const atBaseline =
      !this.hadInlineValue &&
      !this.canUndo &&
      Math.abs(this.fx - this.baselineFx) < 1e-4 &&
      Math.abs(this.fy - this.baselineFy) < 1e-4;
    if (atBaseline) {
      this.target.style.removeProperty(this.cssProperty);
    } else {
      this.target.style.setProperty(this.cssProperty, v);
    }
  }

  private pushContext(): void {
    if (this.context && typeof this.context === 'object' && this.property) {
      (this.context as Record<string, unknown>)[this.property] = this.value;
    }
  }

  private emitChanged(reason: 'pick' | 'undo' | 'redo' | 'reset'): void {
    this.dispatchEvent(
      new CustomEvent(PositionEditorEvents.Changed, {
        detail: { value: this.value, fx: this.fx, fy: this.fy, unit: this.unit, reason },
        bubbles: true,
        composed: true,
      })
    );
  }

  // --- helpers --------------------------------------------------------------

  private resolveTarget(): void {
    if (!this.target && this.for) {
      const root = this.getRootNode() as Document | ShadowRoot;
      this.target =
        (root.querySelector?.(this.for) as HTMLElement | null) ??
        document.querySelector<HTMLElement>(this.for);
    }
  }

  /**
   * Where to draw the overlay, in viewport coordinates. Position comes from the
   * client rect (so it sits over the element as rendered); size comes from
   * {@link getBox} so the picking maths is done against the element's own,
   * transform-independent box — which is the coordinate space `transform-origin`
   * & friends are actually resolved in.
   */
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

  private seedValue(): string {
    if (this.value && this.value !== '50% 50%') return this.value;
    if (this.target && this.cssProperty) {
      const computed = getComputedStyle(this.target).getPropertyValue(this.cssProperty).trim();
      if (computed) return computed;
    }
    return this.value || '50% 50%';
  }

  private format(): string {
    return formatPosition(
      { fx: this.fx, fy: this.fy },
      { unit: this.unit, box: this.getBox(), precision: this.precision }
    );
  }

  render() {
    return html`
      <div class="toolbar">
        <juel-button @button-clicked=${this.startPicking}>${this.label}</juel-button>
        <button
          type="button"
          class="hist"
          aria-label="Undo"
          title="Undo"
          ?disabled=${!this.canUndo}
          @click=${() => this.undo()}
        >
          &#8630;
        </button>
        <button
          type="button"
          class="hist"
          aria-label="Redo"
          title="Redo"
          ?disabled=${!this.canRedo}
          @click=${() => this.redo()}
        >
          &#8631;
        </button>
        <code class="readout" part="readout">${this.value}</code>
      </div>
    `;
  }
}
