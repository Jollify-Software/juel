import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { JuelNumber } from '../Number/Number';

@customElement('juel-point-selector')
export class JuelPointSelector extends LitElement {
  @state()
  private selecting: boolean = false;

  @property({ type: Boolean })
  private input: boolean = false; // New property to allow user input

  private manualX: number | null = null; // Store manual X coordinate
  private manualY: number | null = null; // Store manual Y coordinate

  private handleClickOutside = (event: MouseEvent) => {
    if (!this.selecting) return;

    if (event.button === 2) {
      // Right click cancels
      this.cancelSelection();
      this.dispatchEvent(
        new CustomEvent('point-cancelled', { bubbles: true, composed: true })
      );
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

    this.manualX = x; // Update manual X coordinate
    this.manualY = y; // Update manual Y coordinate

    this.endSelection();

    this.dispatchEvent(
      new CustomEvent('point-selected', {
        detail: { x, y },
        bubbles: true,
        composed: true,
      })
    );
  };

  private handleKeydown = (event: KeyboardEvent) => {
    if (!this.selecting) return;
    if (event.key === 'Escape') {
      this.cancelSelection();
      this.dispatchEvent(
        new CustomEvent('point-cancelled', { bubbles: true, composed: true })
      );
    }
  };

  private startSelection = () => {
    if (this.selecting) return;

    this.selecting = true;

    // Dynamically add global styles for crosshair-cursor
    const styleElement = document.createElement('style');
    styleElement.id = 'crosshair-cursor-style';
    styleElement.textContent = `
      .crosshair-cursor {
        cursor: var(--icon-crosshair) 18 18, auto;
      }
      .selection-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        z-index: 9999;
        pointer-events: none;
      }
    `;
    document.head.appendChild(styleElement);

    // Add overlay to the body
    const overlay = document.createElement('div');
    overlay.id = 'selection-overlay';
    overlay.className = 'selection-overlay';
    document.body.appendChild(overlay);

    document.body.classList.add('crosshair-cursor');
    document.addEventListener('click', this.handleClickOutside, true);
    document.addEventListener('contextmenu', this.handleClickOutside, true);
    document.addEventListener('keydown', this.handleKeydown, true);
  };

  private endSelection = () => {
    this.selecting = false;

    // Remove global styles for crosshair-cursor
    const styleElement = document.getElementById('crosshair-cursor-style');
    if (styleElement) {
      styleElement.remove();
    }

    // Remove overlay from the body
    const overlay = document.getElementById('selection-overlay');
    if (overlay) {
      overlay.remove();
    }

    document.body.classList.remove('crosshair-cursor');
    document.removeEventListener('click', this.handleClickOutside, true);
    document.removeEventListener('contextmenu', this.handleClickOutside, true);
    document.removeEventListener('keydown', this.handleKeydown, true);
  };

  private cancelSelection = () => {
    this.endSelection();
  };

  private handleInputChange = (event: Event) => {
    const target = event.target as JuelNumber;
    const value = target.value;

    if (target.label === 'X') {
      this.manualX = value;
    } else if (target.label === 'Y') {
      this.manualY = value;
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