import { LitElement, html, css } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { map } from 'lit/directives/map';
import { NavigationBase } from '../NavigationBase';
import { JuelComponent } from '../../_Base/JuelComponent';

@customElement('juel-accordion-section')
export class JuelAccordionSection extends JuelComponent {
  @property({ type: String }) title = '';
  @property({ type: String }) glyph;
  @property({ type: Boolean, reflect: true }) open = false;

  static styles = css`
    :host {
      display: block;
      border: 1px solid #ccc;
      margin-bottom: 4px;
      border-radius: 0.25rem;
      transition: box-shadow 0.3s ease;
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
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
      padding: 0 1.25rem;
      border-top: 1px solid #dee2e6;
    }
    :host([open]) .content {
      max-height: 200px; /* Adjust based on expected content size */
      padding: 1rem 1.25rem;
    }
  `;

  render() {
    let iconStyle = this.glyph ? `--glyph: var(--icon-${this.glyph})` : '';
    let iconClass = this.glyph ? `icon glyph` : 'icon';

    return html`
      <div class="header" @click="${this.toggle}">
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
}

@customElement('juel-accordion')
export class JuelAccordion extends NavigationBase {
  @property({ type: Boolean }) multiple = false;

  @queryAssignedElements({ selector: 'juel-accordion-section' })
  private _sections?: NodeListOf<JuelAccordionSection>;

  static styles = css`
    :host {
      display: block;
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