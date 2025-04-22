import { LitElement, html, css, PropertyValues, PropertyValueMap } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { map } from 'lit/directives/map';
import { NavigationBase } from '../NavigationBase';
import { JuelComponent } from '../../_Base/JuelComponent';

@customElement('juel-accordion-section')
export class JuelAccordionSection extends JuelComponent {
  @property({ type: String }) title = '';
  @property({ type: String }) glyph;
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) trigger: 'hover' | 'click' | string = 'click';

  static styles = css`
    :host {
      display: flex;
      flex-direction: var(--direction);
      border: 1px solid #ccc;
      margin: 4px;
      border-radius: 0.25rem;
      transition: box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease;
      flex: 0 0 auto;
      width: var(--width);
      height: var(--height);
      overflow: hidden;
    }
    :host([open]) {
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
      width: var(--expand-width);
      height: var(--expand-height);
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
      border-bottom: 1px solid #dee2e6;
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
    }
    :host([open]) .header {
      background: var(--active, #e7f1ff);
      box-shadow: inset 0 -1px 0 rgba(0,0,0,.125);
    }
    .icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      background: var(--glyph, var(--icon-chevron-down));
      transition: transform 0.3s ease;
    }
    :host([open]) .icon:not(.glyph) {
      transform: rotate(-180deg);
    }
    .content {
      display: block;
      max-width: var(--max-width);
      max-height: var(--max-height);
      overflow: hidden;
      transition: max-width 0.3s ease, max-height 0.3s ease, padding 0.3s ease;
      padding: 0 1.25rem;
      border-top: 1px solid #dee2e6;
    }
    :host([open]) .content {
      max-width: var(--max-width);
      max-height: var(--max-height);
      padding: 1rem 1.25rem;
      overflow: auto;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (this.trigger && this.trigger !== 'hover' && this.trigger !== 'click') {
      const externalTrigger = document.querySelector(this.trigger);
      if (externalTrigger) {
        externalTrigger.addEventListener('click', this._externalToggle.bind(this));
      }
    }
  }

  disconnectedCallback() {
    if (this.trigger && this.trigger !== 'hover' && this.trigger !== 'click') {
      const externalTrigger = document.querySelector(this.trigger);
      if (externalTrigger) {
        externalTrigger.removeEventListener('click', this._externalToggle.bind(this));
      }
    }
    super.disconnectedCallback();
  }

  protected updated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    // Ensure the parent element exists and is a JuelAccordion
    const parent = this.parentElement as HTMLElement;
    if (parent && 'direction' in parent) {
    // Calculate the size of the header
    const header = this.shadowRoot?.querySelector('.header') as HTMLElement;
    if (header) {
      const isHorizontal = parent.direction === 'horizontal';
      const headerSize = isHorizontal ? header.offsetWidth : header.offsetHeight;

      // Set the size property on the parent
      parent.style.setProperty(isHorizontal ? '--width' : '--height', `${headerSize}px`);
    }
  }
  }

  render() {
    let iconStyle = this.glyph ? `--glyph: var(--icon-${this.glyph})` : '';
    let iconClass = this.glyph ? `icon glyph` : 'icon';

    return html`
      <div 
        class="header" 
        @click="${this.trigger === 'click' ? this.toggle : null}" 
        @mouseover="${this.trigger === 'hover' ? this.toggle : null}">
        <slot name="header">
          <span>${this.title}</span>
        </slot>
        <span style="${iconStyle}" class="${iconClass}"></span>
      </div>
      <div class="content"><slot></slot></div>
    `;
  }

  toggle(e: MouseEvent) {
    super.handleClick(e);
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('toggle', { detail: this.open, bubbles: true, composed: true }));
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
      this.style.setProperty('--max-width', isHorizontal ? '100%' : 'unset');
      this.style.setProperty('--max-height', isHorizontal ? 'unset' : '100%');
      this.style.setProperty('--expand-width', isHorizontal ? '400px' : 'unset');
      this.style.setProperty('--expand-height', isHorizontal ? 'unset' : '400px');
      this.style.setProperty('--width', isHorizontal ? '100px' : '100%');
      this.style.setProperty('--height', isHorizontal ? '100%' : '100px');
    }
  }

  private _handleSlotChange() {
    this._sections?.forEach((section) => {
      section.addEventListener('toggle', (e: Event) => this._handleToggle(e, section));
    });
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