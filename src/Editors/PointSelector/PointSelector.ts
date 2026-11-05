import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { parsePercentPoint, percentPointText, pointFromField, type PercentPoint } from './pointValue';

/**
 * `<juel-point-selector>` — picks a point. By default a button that takes the next click anywhere on
 * the screen (`point-selected` `{ x, y, pageX, pageY }`, in window px).
 *
 * With `box`, a point on an element instead (`transform-origin`, say): the element is a box in the
 * proportions `aspect` (width over height), with room around it because a point can lie outside. Click
 * or drag to place the point, or use one of the nine dots or the arrow keys (Shift for ten). `value` is
 * the point as CSS (`50% 50%`). `point-preview` `{ x, y, value }` fires as it drags, `point-selected`
 * `{ x, y, value }` on letting go, with x and y in percent of the element.
 */
@customElement('juel-point-selector')
export class JuelPointSelector extends LitElement {
  /** Pick a point on an element's box, not on the screen. */
  @property({ type: Boolean, reflect: true }) box = false;
  /** With `box`: the element's width over its height. */
  @property({ type: Number }) aspect = 1.6;
  /** With `box`: the point, as CSS. */
  @property({ type: String }) value = '50% 50%';
  /** With `box`: where the point is while it's being dragged. */
  @state() private dragged: PercentPoint | null = null;

  @state()
  private selecting: boolean = false;

  private fireBox(type: 'point-preview' | 'point-selected', point: PercentPoint) {
    this.dispatchEvent(new CustomEvent(type, { detail: { ...point, value: percentPointText(point) }, bubbles: true, composed: true }));
  }

  private onFieldDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const field = e.currentTarget as HTMLElement;
    field.focus({ preventScroll: true });
    const at = (ev: PointerEvent) => {
      const r = field.getBoundingClientRect();
      return pointFromField((ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
    };
    try { field.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer */ }
    this.dragged = at(e);
    this.fireBox('point-preview', this.dragged);
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      this.dragged = at(ev);
      this.fireBox('point-preview', this.dragged);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const point = this.dragged ?? at(ev);
      this.dragged = null;
      this.value = percentPointText(point);
      this.fireBox('point-selected', point);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  private onFieldKey = (e: KeyboardEvent) => {
    const step = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
    if (!step) return;
    e.preventDefault();
    const by = e.shiftKey ? 10 : 1;
    const now = parsePercentPoint(this.value) ?? { x: 50, y: 50 };
    this.choose({ x: Math.max(-100, Math.min(200, now.x + step[0] * by)), y: Math.max(-100, Math.min(200, now.y + step[1] * by)) });
  };

  private choose(point: PercentPoint) {
    this.value = percentPointText(point);
    this.fireBox('point-selected', point);
  }

  private renderBox() {
    const point = this.dragged ?? parsePercentPoint(this.value) ?? { x: 50, y: 50 };
    const aspect = this.aspect > 0 && Number.isFinite(this.aspect) ? Math.min(4, Math.max(0.25, this.aspect)) : 1.6;
    // The field's middle third is the element: x% of the element is (x + 100) / 3 % of the field.
    const place = (n: number) => `${(n + 100) / 3}%`;
    // A press on a dot goes on to the field, which snaps to it, so a drag can start from a dot too.
    const dot = (x: number, y: number) => html`<button type="button" class="preset" tabindex="-1" style="left: ${place(x)}; top: ${place(y)}"
      title="${x}% ${y}%" aria-label="Point at ${x}% ${y}%"></button>`;
    return html`<div class="field" tabindex="0" role="slider" aria-label="Point" aria-valuetext=${percentPointText(point)}
        style="aspect-ratio: ${aspect}" @pointerdown=${this.onFieldDown} @keydown=${this.onFieldKey}>
      <div class="element"></div>
      ${[0, 50, 100].map(y => [0, 50, 100].map(x => dot(x, y)))}
      <div class="point" style="left: ${place(Math.max(-100, Math.min(200, point.x)))}; top: ${place(Math.max(-100, Math.min(200, point.y)))}"></div>
    </div>
    <div class="readout">${percentPointText(point)}</div>`;
  }

  @property({ type: Boolean })
  private input: boolean = false; // New property to allow user input

  @state()
  private manualX: number | null = null; // Store manual X coordinate
  @state()
  private manualY: number | null = null; // Store manual Y coordinate

  // Full-viewport overlay that captures the next click anywhere on screen. Because
  // it sits above the page and takes pointer events, the pick does not also
  // activate whatever is underneath (links, buttons, other components).
  private overlay: HTMLDivElement | null = null;

  private handleOverlayClick = (event: MouseEvent) => {
    // Right button is handled via contextmenu; ignore it here.
    if (event.button === 2) return;
    event.preventDefault();
    event.stopPropagation();

    const x = event.clientX;
    const y = event.clientY;

    this.manualX = x;
    this.manualY = y;

    this.endSelection();

    this.dispatchEvent(
      new CustomEvent('point-selected', {
        detail: { x, y, pageX: event.pageX, pageY: event.pageY },
        bubbles: true,
        composed: true,
      })
    );
  };

  private handleOverlayContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.cancelSelection();
  };

  private handleKeydown = (event: KeyboardEvent) => {
    if (!this.selecting) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelSelection();
    }
  };

  private startSelection = () => {
    if (this.selecting) return;

    this.selecting = true;

    const overlay = document.createElement('div');
    overlay.setAttribute('part', 'selection-overlay');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      background: 'rgba(0, 0, 0, 0.3)',
      cursor: 'crosshair',
    } as Partial<CSSStyleDeclaration>);

    overlay.addEventListener('click', this.handleOverlayClick, true);
    overlay.addEventListener('contextmenu', this.handleOverlayContextMenu, true);
    document.addEventListener('keydown', this.handleKeydown, true);

    document.body.appendChild(overlay);
    this.overlay = overlay;
  };

  private endSelection = () => {
    if (!this.selecting && !this.overlay) return;
    this.selecting = false;

    if (this.overlay) {
      this.overlay.removeEventListener('click', this.handleOverlayClick, true);
      this.overlay.removeEventListener('contextmenu', this.handleOverlayContextMenu, true);
      this.overlay.remove();
      this.overlay = null;
    }
    document.removeEventListener('keydown', this.handleKeydown, true);
  };

  private cancelSelection = () => {
    this.endSelection();
    this.dispatchEvent(
      new CustomEvent('point-cancelled', { bubbles: true, composed: true })
    );
  };

  disconnectedCallback() {
    super.disconnectedCallback();
    this.endSelection();
  }

  private handleInputChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.value === '' ? null : Number(target.value);

    if (target.name === 'x-coordinate') {
      this.manualX = value;
    } else if (target.name === 'y-coordinate') {
      this.manualY = value;
    }

    if (this.manualX !== null && this.manualY !== null) {
      this.dispatchEvent(
        new CustomEvent('point-selected', {
          detail: { x: this.manualX, y: this.manualY },
          bubbles: true,
          composed: true,
        })
      );
    }
  };

  static styles = css`
    button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      cursor: pointer;
    }

    :host {
      all: initial;
    }

    :host([box]) { all: unset; display: block; font: inherit; color: var(--juel-text, inherit); }
    .field {
      position: relative; width: 100%; max-width: 18rem; margin: 0 auto; touch-action: none; cursor: crosshair;
      border: 1px dashed var(--juel-border, #ced4da); border-radius: var(--juel-radius-sm, 4px);
      background: var(--juel-sunken, rgba(127, 127, 127, 0.08)); outline-offset: 1px;
    }
    .field:focus-visible { outline: 2px solid var(--juel-accent, #3b5bdb); }
    .element {
      position: absolute; left: 33.333%; top: 33.333%; width: 33.333%; height: 33.333%; box-sizing: border-box;
      border: 1px solid var(--juel-text, #212529); background: var(--juel-surface, #fff); border-radius: 2px; pointer-events: none;
    }
    .preset {
      position: absolute; width: 8px; height: 8px; margin: -4px 0 0 -4px; padding: 0; cursor: pointer;
      border: 1px solid var(--juel-text, #212529); border-radius: 50%; background: var(--juel-surface, #fff);
    }
    .preset:hover { background: var(--juel-accent, #3b5bdb); }
    .point {
      position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; box-sizing: border-box; pointer-events: none;
      border: 2px solid var(--juel-surface, #fff); border-radius: 50%; background: var(--juel-accent, #3b5bdb);
      box-shadow: 0 0 0 1px var(--juel-accent, #3b5bdb);
    }
    .readout { margin-top: 0.25rem; text-align: center; font-size: 0.75rem; opacity: 0.75; }
  `;

  render() {
    if (this.box) return this.renderBox();
    return html`
      <juel-button @button-clicked=${this.startSelection}>Select Point</juel-button>
      ${this.input
        ? html`
            <div style="display: inline-block; margin-left: 1rem;">
              <label style="margin-right: 0.5rem;">
                X:
                <input
                  type="number"
                  name="x-coordinate"
                  .value=${this.manualX ?? ''}
                  @input=${this.handleInputChange}
                  style="width: 4rem; margin-right: 0.5rem;"
                />
              </label>
              <label>
                Y:
                <input
                  type="number"
                  name="y-coordinate"
                  .value=${this.manualY ?? ''}
                  @input=${this.handleInputChange}
                  style="width: 4rem;"
                />
              </label>
            </div>
          `
        : ''}
    `;
  }
}