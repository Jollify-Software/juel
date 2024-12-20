import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement('juel-grid-item')
export class JuelGridItem extends LitElement {
  // Optional property to span specific columns.
  @property({ type: String })
  columnSpan: string = 'auto';

  static styles = css`
    :host {
      display: block;
      grid-column: var(--grid-column-span, auto);
    }
  `;

  render() {
    return html`
      <style>
        :host {
          --grid-column-span: ${this.columnSpan};
        }
      </style>
      <slot></slot>
    `;
  }
}