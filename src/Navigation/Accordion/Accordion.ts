import { LitElement, html, css, PropertyValues, PropertyValueMap } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { map } from 'lit/directives/map';
import { NavigationBase } from '../NavigationBase';
import { JuelComponent } from '../../_Base/JuelComponent';

let sectionId = 0;

@customElement('juel-accordion-section')
export class JuelAccordionSection extends JuelComponent {
  @property({ type: String }) title = '';
  @property({ type: String }) glyph: string;
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) trigger: 'hover' | 'click' | string = 'click';

  private readonly _headerId = `juel-accordion-header-${++sectionId}`;
  private readonly _contentId = `juel-accordion-content-${sectionId}`;
  private readonly _boundExternalToggle = this._externalToggle.bind(this);

  static styles = css`
    :host {
      display: flex;
      flex-direction: var(--direction);
      border: 1px solid #ccc;
      margin: 4px;
      border-radius: 0.25rem;
      transition: box-shadow 0.3s ease;
      flex: 0 0 auto;
    }
    :host([open]) {
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    }
    .header {
      position: relative;
      background: #f8f9fa; /* Light gray background similar to Bootstrap */
      padding: 0.75rem 1.25rem;
      cursor: pointer;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      white-space: nowrap;
      border-bottom: 1px solid #dee2e6;
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
    }
    :host([open]) .header {
      background: var(--active, #e7f1ff);
      box-shadow: inset 0 -1px 0 rgba(0,0,0,.125);
    }
    .header:focus-visible {
      outline: 2px solid var(--active, #0d6efd);
      outline-offset: -2px;
    }
    .icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      background: var(--glyph, var(--icon-chevron-down));
      transition: transform 0.3s ease;
    }
    :host([open]) .icon:not(.glyph) {
      transform: rotate(-180deg);
    }
    .content {
      display: block;
      max-width: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-width 0.3s ease, max-height 0.3s ease, padding 0.3s ease;
      padding: 0 1.25rem;
    }
    :host([open]) .content {
      max-width: var(--max-width, 10000px);
      max-height: var(--max-height, 10000px);
      padding: 1rem 1.25rem;
      overflow: auto;
      border-top: 1px solid #dee2e6;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (this.trigger && this.trigger !== 'hover' && this.trigger !== 'click') {
      const externalTrigger = document.querySelector(this.trigger);
      if (externalTrigger) {
        externalTrigger.addEventListener('click', this._boundExternalToggle);
      }
    }
  }

  disconnectedCallback() {
    if (this.trigger && this.trigger !== 'hover' && this.trigger !== 'click') {
      const externalTrigger = document.querySelector(this.trigger);
      if (externalTrigger) {
        externalTrigger.removeEventListener('click', this._boundExternalToggle);
      }
    }
    super.disconnectedCallback();
  }

  render() {
    let iconStyle = this.glyph ? `--glyph: var(--icon-${this.glyph})` : '';
    let iconClass = this.glyph ? `icon glyph` : 'icon';

    return html`
      <div
        class="header"
        role="button"
        tabindex="0"
        id="${this._headerId}"
        aria-expanded="${this.open}"
        aria-controls="${this._contentId}"
        @click="${this.trigger === 'click' ? this.toggle : null}"
        @keydown="${this.trigger === 'click' ? this._onHeaderKeydown : null}"
        @mouseenter="${this.trigger === 'hover' ? this.toggle : null}">
        <slot name="header">
          <span>${this.title}</span>
        </slot>
        <span style="${iconStyle}" class="${iconClass}"></span>
      </div>
      <div class="content" role="region" id="${this._contentId}" aria-labelledby="${this._headerId}"><slot></slot></div>
    `;
  }

  toggle(e: Event) {
    if (e instanceof MouseEvent) {
      super.handleClick(e);
    }
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('toggle', { detail: this.open, bubbles: true, composed: true }));
  }

  private _onHeaderKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggle(e);
    }
  }

  private _externalToggle() {
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('toggle', { detail: this.open, bubbles: true, composed: true }));
  }
}

@customElement('juel-accordion')
export class JuelAccordion extends NavigationBase {
  @property({ type: Boolean }) multiple = false;
  @property({ type: String }) direction: 'vertical' | 'horizontal' = 'vertical';

  @queryAssignedElements({ selector: 'juel-accordion-section' })
  private _sections?: NodeListOf<JuelAccordionSection>;

  private readonly _wiredSections = new WeakSet<JuelAccordionSection>();

  static styles = css`
    :host {
      display: flex;
      flex-direction: var(--direction, column); /* Default to vertical layout */
    }
  `;

  constructor() {
    super();
    this.ripple = false; // Handled by sections
  }

  render() {
    return html`
      <slot @slotchange="${this._handleSlotChange}"></slot>
    `;
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);

    if (changedProperties.has('direction')) {
      const isHorizontal = this.direction === 'horizontal';
      this.style.setProperty('--direction', isHorizontal ? 'row' : 'column');
      // Large fixed caps rather than `none`/`unset` on the unconstrained axis: `max-width`/
      // `max-height` can only transition smoothly between two lengths, not to/from a keyword.
      this.style.setProperty('--max-width', isHorizontal ? '400px' : '10000px');
      this.style.setProperty('--max-height', isHorizontal ? '10000px' : '400px');
    }
  }

  private _handleSlotChange() {
    let lastOpen: JuelAccordionSection | undefined;
    this._sections?.forEach((section) => {
      if (section.open) lastOpen = section;
      if (this._wiredSections.has(section)) return;
      this._wiredSections.add(section);
      section.addEventListener('toggle', (e: Event) => this._handleToggle(e, section));
    });

    if (!this.multiple && lastOpen) {
      this._sections?.forEach((section) => {
        if (section !== lastOpen) section.open = false;
      });
    }
  }

  private _handleToggle(event: Event, toggledSection: JuelAccordionSection) {
    if (!this.multiple) {
      this._sections?.forEach((section) => {
        if (section !== toggledSection) {
          section.open = false;
        }
      });
    }
  }
}