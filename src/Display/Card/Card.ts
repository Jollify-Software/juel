import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('juel-card')
export class JuelCard extends LitElement {
  static styles = css`
    .card {
    background: var(--light);
      border: 1px solid #e0e0e0;
      border-radius: 0.5rem;
      display: inline-flex;
    flex-direction: column;
    }

    .card-image ::slotted(*) {
      width: 100%;
          display: block;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
    }

    .card-header {
      display: flex;
    padding: 16px;
    align-items: center;
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
    }

    .card-body {
          flex-grow: 1;
    padding: 16px;
    }

    .card-footer {
      display: flex;
    padding: 8px;
    align-items: center;
    }

    ::slotted([slot='header']),
    ::slotted([slot='footer']) {
      display: block;
    }
  `;

  render() {
    return html`
      <div class="card" part="card">
        <div class="card-header" part="header">
          <slot name="header"></slot>
        </div>
        <div class="card-image" part="image">
          <slot name="image"></slot>
        </div>
        <div class="card-body" part="body">
          <slot></slot>
        </div>
        <div class="card-footer" part="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }
}
