import { LitElement, html, css, PropertyValues } from 'lit-element';
import { customElement, property, state } from 'lit/decorators';
import { autoUpdate, computePosition, flip, offset, shift, Placement, VirtualElement } from '@floating-ui/dom';

/** A box in the window's px, as `getBoundingClientRect()` gives. */
export interface AnchorRect { x: number; y: number; width: number; height: number; }

/** What an anchored toolbar floats by. */
export type ToolbarAnchor = string | Element | AnchorRect | (() => AnchorRect | null);

/**
 * `<juel-toolbar>`: a row (or column) of controls.
 *
 * Anchored, it floats by something instead: a formatting bar over selected
 * text, tools by a picked element.
 * - `anchor`: what it floats by. An element, an element's id (attribute), or
 *   a rect in the window's px (property) for things that aren't elements of
 *   this page, or a function giving that rect, read afresh each time it is
 *   placed so it follows scrolling and resizing (text in an iframe: see
 *   `juel-frame`'s `toViewportRect`).
 * - `placement` (default `top`): the side it prefers; it flips to the other
 *   side when there's no room, and shifts along to stay in view. The side it
 *   ended up on is `data-placement`.
 * - `anchor-offset` (default 8): the gap between it and the anchor, in px.
 * - `boundary`: a selector for the ancestor it keeps inside (its nearest
 *   match); otherwise its clipping ancestors.
 * - `keep-selection`: pressing it doesn't take focus or the text selection
 *   away from what it formats.
 * It positions itself absolutely, against its offset parent.
 *
 * `overflow` keeps it to one row: items that don't fit are hidden from the
 * end (`data-overflowed`) and offered in a "…" menu at its end, which clicks
 * a hidden button, or lists a hidden juel-menu's items and fires that menu's
 * `menu-select`. `.spacer` and `.gap` children are never listed; a `.gap`
 * goes when the group on either side of it has gone. Items go in order of
 * `data-overflow-priority` (a number, 0 if unset): the lowest first, and among
 * equals the last first, so with none set it is simply from the end.
 */
@customElement('juel-toolbar')
export class JuelToolbar extends LitElement {
  @property({ type: String, reflect: true }) direction: 'horizontal' | 'vertical' = 'horizontal';
  @property({ attribute: 'anchor' }) anchor: ToolbarAnchor | null = null;
  @property({ type: String }) placement: Placement = 'top';
  @property({ type: Number, attribute: 'anchor-offset' }) anchorOffset = 8;
  @property({ type: String }) boundary: string | null = null;
  @property({ type: Boolean, attribute: 'keep-selection' }) keepSelection = false;
  /** One row; what doesn't fit goes into a "…" menu (see above). */
  @property({ type: Boolean, reflect: true }) overflow = false;
  @state() private overflowed: HTMLElement[] = [];
  private resizeObserver: ResizeObserver | null = null;
  /** A hidden menu's items can change (or still be parsing) without a `slotchange`. */
  private mutationObserver: MutationObserver | null = null;

  static styles = css`
    :host {
      display: block;
      box-shadow: var(--toolbar-box-shadow, var(--juel-shadow-1, 0px 2px 4px rgba(0, 0, 0, 0.1)));
      background-color: var(--toolbar-background-color, var(--juel-surface, #ffffff));
      color: var(--toolbar-color, var(--juel-text, #000000));
      padding: var(--toolbar-padding, 0.5rem 1rem);
    }

    :host([hidden]) {
      display: none;
    }

    :host([anchored]) {
      position: absolute;
      left: 0;
      top: 0;
      width: max-content;
      z-index: var(--toolbar-z-index, 10);
    }

    /* Until it has been placed, so it never shows in the corner first. */
    :host([anchored]:not([data-placement])) {
      visibility: hidden;
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

    :host([anchored]) .toolbar {
      flex-wrap: nowrap;
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

    :host([overflow]) .toolbar {
      flex-wrap: nowrap;
      overflow: hidden;
    }

    ::slotted([data-overflowed]) {
      display: none !important;
    }

    .more {
      flex-shrink: 0;
    }

    .more[hidden] {
      display: none;
    }
  `;

  /** What floating-ui positions against: reads `anchor` afresh each time. */
  private reference: VirtualElement = {
    getBoundingClientRect: () => {
      const anchor = this.resolveAnchor();
      if (anchor instanceof Element) return anchor.getBoundingClientRect();
      const r = anchor ?? { x: 0, y: 0, width: 0, height: 0 };
      return new DOMRect(r.x, r.y, r.width, r.height);
    },
  };
  /** The element `autoUpdate` watches (null for a rect: its owner re-sets it as it moves). */
  private watched: Element | null | undefined;
  private stopAutoUpdate: (() => void) | null = null;

  private onMouseDown = (e: MouseEvent) => {
    if (this.keepSelection) e.preventDefault();
  };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('mousedown', this.onMouseDown);
    if (this.anchor) this.requestUpdate('anchor');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('mousedown', this.onMouseDown);
    this.unanchor();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
  }

  updated(changed: PropertyValues) {
    if (changed.has('overflow')) this.watchOverflow();
    if (!['anchor', 'placement', 'anchorOffset', 'boundary'].some(p => changed.has(p))) return;
    const anchor = this.resolveAnchor();
    if (!anchor) {
      this.unanchor();
      return;
    }
    this.toggleAttribute('anchored', true);
    // A new rect just moves it; a new element (or the first anchor) also
    // changes what to follow as the page scrolls and resizes.
    const element = anchor instanceof Element ? anchor : null;
    if (!this.stopAutoUpdate || element !== this.watched) {
      this.stopAutoUpdate?.();
      this.watched = element;
      const reference = element ? { getBoundingClientRect: this.reference.getBoundingClientRect, contextElement: element } : this.reference;
      this.stopAutoUpdate = autoUpdate(reference, this, () => this.reposition());
    } else {
      this.reposition();
    }
  }

  /** Places it by its anchor again (it does so itself as things move and resize). */
  async reposition() {
    if (!this.stopAutoUpdate) return;
    const boundaryElement = this.boundary ? this.parentElement?.closest(this.boundary) : null;
    const boundary = boundaryElement ?? 'clippingAncestors';
    const { x, y, placement } = await computePosition(this.reference, this, {
      strategy: 'absolute',
      placement: this.placement,
      middleware: [offset(this.anchorOffset), flip({ boundary, padding: 4 }), shift({ boundary, padding: 4 })],
    });
    if (!this.stopAutoUpdate) return;
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
    this.dataset.placement = placement;
  }

  render() {
    return html`
      <div class="toolbar" role="toolbar" aria-orientation="${this.direction}">
        <slot @slotchange=${this.fit}></slot>
        ${this.overflow ? html`
          <juel-menu class="more" part="more" trigger="click" ?hidden=${!this.overflowed.length} @menu-select=${this.onMore}>
            <juel-button slot="trigger" type="plain" glyph="lucide-ellipsis" button-label="More" title="More"></juel-button>
            ${this.overflowed.flatMap((el, i) => el.localName === 'juel-menu'
              ? JuelToolbar.menuItems(el).map((item, j) =>
                html`<juel-menu-item value="${i}:${j}" label=${item.getAttribute('label') ?? item.textContent?.trim() ?? ''}></juel-menu-item>`)
              : html`<juel-menu-item value="${i}" label=${JuelToolbar.labelOf(el)}></juel-menu-item>`)}
          </juel-menu>` : ''}
      </div>
    `;
  }

  /** A menu's own items (not a nested menu's). */
  private static menuItems(menu: HTMLElement): HTMLElement[] {
    return [...menu.querySelectorAll<HTMLElement>('juel-menu-item')].filter(item => item.closest('juel-menu') === menu);
  }

  private static labelOf(el: HTMLElement) {
    return el.getAttribute('button-label') || el.getAttribute('label') || el.getAttribute('title') || el.textContent?.trim() || '';
  }

  private watchOverflow() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    if (this.overflow) {
      this.resizeObserver = new ResizeObserver(() => this.fit());
      this.resizeObserver.observe(this);
      this.mutationObserver = new MutationObserver(() => { if (this.overflowed.length) this.requestUpdate(); });
      this.mutationObserver.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['label', 'button-label', 'title'] });
      this.fit();
    } else {
      for (const el of this.slottedItems()) el.removeAttribute('data-overflowed');
      this.overflowed = [];
    }
  }

  private slottedItems(): HTMLElement[] {
    const slot = this.renderRoot?.querySelector('slot');
    return (slot?.assignedElements() ?? []) as HTMLElement[];
  }

  /** Hides trailing items until the row fits (the "…" button's room kept while it measures). */
  private fit = () => {
    if (!this.overflow) return;
    const bar =this.renderRoot.querySelector<HTMLElement>('.toolbar');
    if (!bar) return;
    const items = this.slottedItems();
    for (const el of items) el.removeAttribute('data-overflowed');
    const more = this.renderRoot.querySelector<HTMLElement>('.more');
    more?.removeAttribute('hidden');
    const isGap = (el: HTMLElement) => el.classList.contains('gap');
    const priority = (el: HTMLElement) => Number(el.dataset.overflowPriority) || 0;
    // The order they go in: lowest priority first, the last first among equals.
    const candidates = items.filter(el => !el.classList.contains('spacer') && !isGap(el))
      .map((el, i) => ({ el, i }))
      .sort((a, b) => priority(a.el) - priority(b.el) || b.i - a.i)
      .map(c => c.el);
    while (bar.scrollWidth > bar.clientWidth + 1 && candidates.length) {
      candidates.shift()!.setAttribute('data-overflowed', '');
      JuelToolbar.tidyGaps(items);
    }
    const listed = items.filter(el => el.hasAttribute('data-overflowed') && !isGap(el));
    more?.toggleAttribute('hidden', !listed.length);
    if (listed.length !== this.overflowed.length || listed.some((el, i) => el !== this.overflowed[i])) this.overflowed = listed;
  };

  /**
   * Show a gap only between two groups that still show something: it needs a
   * shown item since the last gap shown, and one before the next gap.
   */
  private static tidyGaps(items: HTMLElement[]) {
    const shown = (el: HTMLElement) => !el.hasAttribute('data-overflowed') && !el.classList.contains('spacer');
    let before = false;
    items.forEach((el, i) => {
      if (!el.classList.contains('gap')) { if (shown(el)) before = true; return; }
      let after = false;
      for (const next of items.slice(i + 1)) {
        if (next.classList.contains('gap')) break;
        if (shown(next)) { after = true; break; }
      }
      const show = before && after;
      el.toggleAttribute('data-overflowed', !show);
      if (show) before = false;
    });
  }

  private onMore = (e: CustomEvent<{ value: string | null }>) => {
    e.stopPropagation();
    const [i, j] = (e.detail.value ?? '').split(':').map(Number);
    const el = this.overflowed[i];
    if (!el) return;
    if (j === undefined || Number.isNaN(j)) {
      el.click();
      return;
    }
    const item = JuelToolbar.menuItems(el)[j];
    if (item) el.dispatchEvent(new CustomEvent('menu-select', {
      detail: { item, value: item.getAttribute('value') }, bubbles: true, composed: true,
    }));
  };

  private resolveAnchor(): Element | AnchorRect | null {
    const anchor = this.anchor;
    if (!anchor) return null;
    if (typeof anchor === 'function') return anchor();
    if (typeof anchor !== 'string') return anchor;
    const root = this.getRootNode() as Document | ShadowRoot;
    return root.getElementById?.(anchor) ?? document.getElementById(anchor);
  }

  private unanchor() {
    this.stopAutoUpdate?.();
    this.stopAutoUpdate = null;
    this.watched = undefined;
    if (!this.hasAttribute('anchored')) return;
    this.removeAttribute('anchored');
    delete this.dataset.placement;
    this.style.left = this.style.top = '';
  }
}
