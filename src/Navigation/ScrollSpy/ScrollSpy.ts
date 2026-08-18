import { LitElement, html, css } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { NavigationBase } from '../NavigationBase';
import { ScrollSpyEvents } from './ScrollSpyEvents';

@customElement('juel-scrollspy-item')
export class JuelScrollSpyItem extends LitElement {
  @property({ type: String }) href = '';
  @property({ type: Boolean, reflect: true }) active = false;

  static styles = css`
    :host {
      display: block;
    }
    a {
      display: block;
      padding: 0.375rem 0.75rem;
      color: var(--secondary, #6c757d);
      text-decoration: none;
      border-left: 2px solid transparent;
      transition: color 0.15s ease, border-color 0.15s ease;
    }
    a:hover {
      color: var(--dark, #343a40);
    }
    :host([active]) a {
      color: var(--primary, #007bff);
      border-left-color: var(--primary, #007bff);
      font-weight: bold;
    }
    a:focus-visible {
      outline: 2px solid var(--primary, #007bff);
      outline-offset: -2px;
    }
  `;

  render() {
    return html`<a href="${this.href}" aria-current="${this.active ? 'true' : 'false'}" @click="${this._onClick}"><slot></slot></a>`;
  }

  private _onClick(e: MouseEvent) {
    const target = this._targetElement();
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private _targetElement(): HTMLElement | null {
    if (!this.href.startsWith('#')) return null;
    return document.getElementById(this.href.slice(1));
  }
}

@customElement('juel-scrollspy')
export class JuelScrollSpy extends NavigationBase {
  // CSS selector for the scrollable container to watch. Left unset, the
  // browser viewport is watched instead — the sections being spied on must
  // be descendants of whichever one is used.
  @property({ type: String }) target: string = '';

  @queryAssignedElements({ selector: 'juel-scrollspy-item' })
  private _items?: NodeListOf<JuelScrollSpyItem>;

  private _observer?: IntersectionObserver;
  private readonly _intersecting = new Set<Element>();
  private _activeItem: JuelScrollSpyItem | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }
  `;

  constructor() {
    super();
    this.ripple = false;
  }

  disconnectedCallback() {
    this._observer?.disconnect();
    super.disconnectedCallback();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('target')) {
      this._setupObserver();
    }
  }

  private _handleSlotChange() {
    this._setupObserver();
  }

  render() {
    return html`
      <div role="list">
        <slot @slotchange="${this._handleSlotChange}"></slot>
      </div>
    `;
  }

  private _setupObserver() {
    this._observer?.disconnect();
    this._intersecting.clear();

    if (!this._items || this._items.length === 0) return;

    const root = this.target ? document.querySelector(this.target) : null;

    this._observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this._intersecting.add(entry.target);
        } else {
          this._intersecting.delete(entry.target);
        }
      });
      this._updateActive();
    }, {
      root,
      // Shrinks the effective observation area to a band across the top of
      // the root, so a section becomes "active" as its top edge crosses
      // into it while scrolling — the standard scrollspy technique, avoids
      // picking the wrong section when several are partially in view.
      rootMargin: '0px 0px -80% 0px',
      threshold: 0,
    });

    this._items.forEach((item) => {
      const id = item.href.startsWith('#') ? item.href.slice(1) : '';
      const el = id ? document.getElementById(id) : null;
      if (el) this._observer!.observe(el);
    });
  }

  private _updateActive() {
    // Keep whatever was last active rather than flickering to "nothing" in
    // the gap between one section leaving the detection band and the next
    // entering it.
    if (this._intersecting.size === 0) return;

    // When two sections both straddle the top detection band (one leaving,
    // one entering), the active one is whichever crossed the band most
    // recently — the largest .top among intersecting candidates, not the
    // smallest (that would favor a section that's mostly already scrolled
    // away over the one actually at the top edge right now).
    let topEl: Element | null = null;
    let topPosition = -Infinity;
    this._intersecting.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      if (top > topPosition) {
        topPosition = top;
        topEl = el;
      }
    });
    if (!topEl) return;

    const nextActive = (this._items ? Array.from(this._items) : []).find((item) => {
      const id = item.href.startsWith('#') ? item.href.slice(1) : '';
      return id && document.getElementById(id) === topEl;
    });
    if (!nextActive || nextActive === this._activeItem) return;

    if (this._activeItem) {
      this._activeItem.active = false;
    }
    this._activeItem = nextActive;
    nextActive.active = true;

    this.dispatchEvent(new CustomEvent(ScrollSpyEvents.ActiveChanged, {
      detail: { href: nextActive.href },
    }));
  }
}
