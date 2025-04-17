import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('juel-menu-item')
export class JuelMenuItem extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) label = '';

  static styles = css`
    :host {
      position: relative;
    }
    .item {
      padding: 8px 12px;
      cursor: pointer;
      white-space: nowrap;
    }
    .item:hover {
      background: #eee;
    }
    .submenu {
      position: absolute;
      top: 0;
      left: 100%;
      display: none;
      background: white;
      border: 1px solid #ccc;
      min-width: 160px;
      z-index: 1000;
    }
    :host(:hover) .submenu.has-children {
      display: block;
    }
  `;

  firstUpdated() {
    const parent = this.parentElement;

    if (parent && parent.shadowRoot) {
      const submenu = parent.shadowRoot.querySelector('.submenu');
      if (submenu) {
        submenu.classList.add('has-children');
      }
    }
  }

  render() {
    return html`
      <div class="item">
        ${this.label}
        <slot name="icon"></slot>
      </div>
      <div class="submenu">
        <slot></slot>
      </div>
    `;
  }
}