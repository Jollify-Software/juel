import { LitElement, html, css } from 'lit-element';
import { customElement, property } from 'lit/decorators';

@customElement('juel-toolbar')
export class JuelToolbar extends LitElement {
  @property({ type: String, reflect: true }) direction: 'horizontal' | 'vertical' = 'horizontal';

  static styles = css`
    :host {
      display: block;
      box-shadow: var(--toolbar-box-shadow, 0px 2px 4px rgba(0, 0, 0, 0.1));
      background-color: var(--toolbar-background-color, #ffffff);
      color: var(--toolbar-color, #000000);
      padding: var(--toolbar-padding, 0.5rem 1rem);
    }

    .toolbar {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--toolbar-gap, 1rem);
      /* Fills whatever height the host ends up with (auto by default, or an
         explicit height set by the consumer) so a .spacer child has actual
         room to grow into — this matters most for direction="vertical". */
      height: 100%;
      box-sizing: border-box;
    }

    :host([direction="vertical"]) .toolbar {
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: stretch;
    }

    ::slotted(*) {
      flex-shrink: 0;
    }

    ::slotted(.spacer) {
      flex-grow: 1;
    }
  `;

  render() {
    return html`
      <div class="toolbar" role="toolbar" aria-orientation="${this.direction}">
        <slot></slot>
      </div>
    `;
  }
}
