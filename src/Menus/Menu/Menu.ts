import { html, css } from "lit";
import { customElement, query } from "lit/decorators.js";
import { offset, flip, shift } from "@floating-ui/dom";
import { CollapsibleBase } from "../../_Base/CollapsibleBase";

/** Detail of `menu-select`. */
export interface MenuSelectDetail {
  item: HTMLElement;
  /** The item's `value` attribute, if it has one. */
  value: string | null;
}

/**
 * A dropdown: the element in `slot="trigger"` opens the content (the
 * default slot). With `trigger="click"` (the usual choice for a menu bar)
 * a click outside or Escape closes it.
 *
 * As a menu: items are `<juel-menu-item>`s or any slotted element with
 * `role="menuitem"`. Activating one (click, Enter, Space) fires
 * `menu-select` and closes the menu. Opened from the keyboard, focus moves
 * to the first item; arrow keys, Home and End move between items, and
 * Escape closes the menu and returns focus to the trigger.
 *
 * The content floats with `position: fixed`, so a scrolling or clipped
 * ancestor (a juel-mdi pane, say) doesn't cut it off.
 *
 * As a context menu: `openAt(x, y)` opens it at a point in the viewport
 * (e.g. a `contextmenu` event's `clientX`/`clientY`) instead of under its
 * trigger, which it then needn't have. Escape, or choosing an item from
 * the keyboard, returns focus to where it was.
 */
@customElement('juel-menu')
export class JuelMenu extends CollapsibleBase {
  @query('[part="trigger"]')
  private triggerElement!: HTMLElement;

  @query('[part="content"]')
  private contentElement!: HTMLElement;

  private openedByKeyboard = false;

  /** Set while opened by `openAt`: the point, and the focus to go back to. */
  private point: { x: number; y: number; returnFocus: HTMLElement | null } | null = null;

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    [part="trigger"] {
      display: inline-block;
      cursor: pointer;
    }

    [part="content"] {
      /* No transition on visibility: focus moves to the first item as the
         menu opens, and an element mid-way through a visibility transition
         from hidden still counts as hidden, so it can't take focus. */
      transition: max-height 0.3s ease;
      max-height: 0;
      visibility: hidden;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1000;
      min-width: var(--menu-min-width, 10rem);
      padding: var(--menu-padding, 4px 0);
      color: var(--menu-color, var(--juel-text, inherit));
      background: var(--menu-background, var(--juel-surface, white));
      border: 1px solid var(--menu-border-color, var(--juel-border, rgba(0, 0, 0, 0.12)));
      border-radius: var(--menu-border-radius, var(--juel-radius-md, 6px));
      box-shadow: var(--juel-shadow-2, 0 4px 16px rgba(0, 0, 0, 0.15));
      box-sizing: border-box;
    }

    :host([collapse-mode="floating"]) [part="content"] {
      max-height: none;
    }

    :host([collapse-mode="push"]) [part="content"] {
      position: static;
      overflow: hidden;
      box-shadow: none;
    }
  `;

  constructor() {
    super();
    this.placement = 'bottom-start';
  }

  connectedCallback() {
    super.connectedCallback();
    this.ripple = false;
    if (!this.hasAttribute('collapse-mode')) this.setAttribute('collapse-mode', this.collapseMode);
  }

  getTriggerElement(): HTMLElement {
    return this.triggerElement;
  }

  getCollapseElement(): HTMLElement {
    return this.contentElement;
  }

  protected floatingReference(): any {
    const p = this.point;
    if (!p) return super.floatingReference();
    // A floating-ui virtual element: a zero-size box at the point.
    return {
      getBoundingClientRect: () => ({ x: p.x, y: p.y, left: p.x, top: p.y, right: p.x, bottom: p.y, width: 0, height: 0 }),
      contextElement: this,
    };
  }

  /**
   * Open at a point in the viewport, as a context menu. With `focusFirst`
   * (opened from the keyboard, say) focus moves to the first item.
   */
  async openAt(x: number, y: number, { focusFirst = false }: { focusFirst?: boolean } = {}) {
    const returnFocus = this.point?.returnFocus ?? (document.activeElement as HTMLElement | null);
    if (this.opened) {
      this.hide();
      await this.updateComplete;
    }
    this.point = { x, y, returnFocus };
    this.openedByKeyboard = focusFirst;
    this.show();
  }

  protected floatingOptions(): any {
    return {
      placement: this.placement,
      strategy: 'fixed',
      middleware: [offset(4), flip(), shift({ padding: 4 })],
    };
  }

  /** The menu's items, in order: juel-menu-items and elements with role="menuitem". */
  get items(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>(':scope > juel-menu-item, :scope > [role="menuitem"], :scope > * [role="menuitem"]'))
      .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');
  }

  show() {
    super.show();
    this.syncTriggerAria();
    if (this.openedByKeyboard) {
      this.openedByKeyboard = false;
      this.updateComplete.then(() => this.items[0]?.focus());
    }
  }

  hide() {
    this.openedByKeyboard = false;
    super.hide();
    this.syncTriggerAria();
  }

  protected updated(changed) {
    super.updated(changed);
    // Closed: the next show() is under the trigger again (the point is
    // only needed while the content is placed, on opening).
    if (changed.has('opened') && !this.opened) this.point = null;
  }

  protected onDismissedByKey() {
    this.focusTrigger();
  }

  private focusTrigger() {
    if (this.point) { this.point.returnFocus?.focus(); return; }
    const trigger = this.triggerSlotted();
    trigger?.focus();
  }

  private triggerSlotted(): HTMLElement | undefined {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]') ?? undefined;
  }

  private syncTriggerAria() {
    const trigger = this.triggerSlotted();
    if (!trigger) return;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', String(this.opened));
  }

  firstUpdated(changed) {
    super.firstUpdated(changed);
    this.syncTriggerAria();
  }

  // Enter/Space/ArrowDown on the trigger: remember it was the keyboard,
  // so opening moves focus into the menu.
  private onTriggerKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' && !this.opened) {
      e.preventDefault();
      this.openedByKeyboard = true;
      this.show();
    } else if (e.key === 'Enter' || e.key === ' ') {
      this.openedByKeyboard = true;
    }
  };

  private onContentKeydown = (e: KeyboardEvent) => {
    const items = this.items;
    if (!items.length) return;
    const current = items.findIndex(item => item === document.activeElement || item.contains(document.activeElement));
    let next = -1;
    if (e.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Tab') { this.hide(); return; }
    if (next < 0) return;
    e.preventDefault();
    items[next].focus();
  };

  private onContentClick = (e: Event) => {
    // The innermost item clicked: a submenu's item, not the item holding
    // the submenu. Clicking an item that only holds a submenu selects nothing.
    const items = this.items;
    const item = e.composedPath().find((n): n is HTMLElement => items.includes(n as HTMLElement));
    if (!item || item.querySelector(':scope > juel-menu-item, :scope > [role="menuitem"]')) return;
    this.dispatchEvent(new CustomEvent<MenuSelectDetail>('menu-select', {
      detail: { item, value: item.getAttribute('value') },
      bubbles: true,
      composed: true,
    }));
    const viaKeyboard = (e as PointerEvent).detail === 0;
    this.hide();
    if (viaKeyboard) this.focusTrigger();
  };

  render() {
    return html`
      <div part="trigger" @keydown=${this.onTriggerKeydown}>
        <slot name="trigger"></slot>
      </div>
      <div part="content" role="menu" @click=${this.onContentClick} @keydown=${this.onContentKeydown}>
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'juel-menu': JuelMenu }
}
