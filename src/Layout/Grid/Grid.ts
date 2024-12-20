import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement('juel-grid')
export class JuelGridComponent extends LitElement {
  // Define grid template columns (e.g., "1fr 1fr 1fr" or "repeat(3, 1fr)").
  @property({ type: String })
  columns: string = 'repeat(auto-fill, minmax(100px, 1fr))';

  // Define grid gap.
  @property({ type: String })
  gap: string = '1rem';

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .grid {
      display: grid;
      grid-template-columns: var(--grid-columns);
      gap: var(--grid-gap);
    }
  `;

  render() {
    return html`
      <style>
        :host {
          --grid-columns: ${this.columns};
          --grid-gap: ${this.gap};
        }
      </style>
      <div class="grid">
        <slot></slot>
      </div>
    `;
  }
}