import { LitElement, html, css } from 'lit-element';
import { customElement } from 'lit/decorators';

@customElement('juel-toolbar')
export class JuelToolbar extends LitElement {
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
      align-items: center;
      justify-content: space-between;
      gap: var(--toolbar-gap, 1rem);
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
      <div class="toolbar">
        <slot></slot>
      </div>
    `;
  }
}
