import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('juel-point-selector')
export class JuelPointSelector extends LitElement {
  @state()
  private selecting: boolean = false;

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
  `;

  render() {
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