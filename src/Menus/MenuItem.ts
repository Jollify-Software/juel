import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * An item in a `juel-menu`: `label` is what's shown; children make a
 * submenu that opens on hover (CSS `:hover`, and `open` while a pointer is
 * over it, so a pointer the page moves itself, such as a demo's, opens it too). Focusable (role="menuitem"), and Enter or
 * Space activates it like a click. `value` is passed on in the menu's
 * `menu-select` event.
 */
@customElement('juel-menu-item')
export class JuelMenuItem extends LitElement {
  /** Its submenu shows: set while a pointer is over the item (pointerenter / pointerleave). */
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) label = '';
  @property({ type: String, reflect: true }) value: string | undefined;
  @property({ type: Boolean, reflect: true }) disabled = false;

  static styles = css`
    :host {
      display: block;
      position: relative;
      outline: none;
    }
    :host([disabled]) {
      opacity: 0.5;
      pointer-events: none;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: var(--menu-item-padding, 6px 14px);
      cursor: pointer;
      white-space: nowrap;
    }
    .item:hover,
    :host(:focus-visible) .item {
      background: var(--menu-item-hover-background, var(--juel-hover, #eef3ff));
    }
    :host(:focus-visible) .item {
      outline: 2px solid var(--juel-focus, var(--primary, #0d6efd));
      outline-offset: -2px;
    }
    .submenu {
      position: absolute;
      top: 0;
      left: 100%;
      display: none;
      background: var(--juel-surface, white);
      border: 1px solid var(--juel-border, #ccc);
      min-width: 160px;
      z-index: 1000;
    }
    :host(:hover) .submenu.has-children,
    :host([open]) .submenu.has-children {
      display: block;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'menuitem');
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
    this.addEventListener('keydown', this.onKeydown);
    this.addEventListener('pointerenter', this.onPointerEnter);
    this.addEventListener('pointerleave', this.onPointerLeave);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKeydown);
    this.removeEventListener('pointerenter', this.onPointerEnter);
    this.removeEventListener('pointerleave', this.onPointerLeave);
    this.open = false;
  }

  private onPointerEnter = () => {
    if (this.querySelector(':scope > juel-menu-item')) this.open = true;
  };

  private onPointerLeave = () => {
    this.open = false;
  };

  updated() {
    this.setAttribute('aria-disabled', String(this.disabled));
  }

  private onKeydown = (e: KeyboardEvent) => {
    if (e.target !== this || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    this.click();
  };

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
      <div class="item" part="item">
        <slot name="icon"></slot>
        ${this.label}
      </div>
      <div class="submenu">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'juel-menu-item': JuelMenuItem }
}
