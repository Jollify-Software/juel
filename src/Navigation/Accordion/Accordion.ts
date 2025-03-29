import { LitElement, html, css } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { map } from 'lit/directives/map';
import { NavigationBase } from '../NavigationBase';
import { JuelComponent } from '../../_Base/JuelComponent';

@customElement('juel-accordion-section')
export class JuelAccordionSection extends JuelComponent {
  @property({ type: String }) title = '';
  @property({ type: Boolean, reflect: true }) open = false;

  static styles = css`
    :host {
      display: block;
      border: 1px solid #ccc;
      margin-bottom: 4px;
    }
    .header {
      position: relative;
      background: #f0f0f0;
      padding: 10px;
      cursor: pointer;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      background: var(--icon-chevron-down);
      transition: transform 0.3s ease;
    }
    :host([open]) .icon {
      transform: rotate(-180deg);
    }
    .content {
      display: block;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
      padding: 0 10px;
      border-top: 1px solid #ccc;
    }
    :host([open]) .content {
      max-height: 200px; /* Adjust based on expected content size */
      padding: 10px;
    }
  `;

  render() {
    return html`
      <div class="header" @click="${this.toggle}">
        <span>${this.title}</span>
        <span class="icon"></span>
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
  @property({ type: Boolean }) allowMultiple = false;

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
      ${map(this._sections,
        (section) => html`
          <div
            .title=${section.title} 
            .open=${section.open} 
            @toggle=${(e) => this._handleToggle(e, section)}>
            <slot name="${section.getAttribute('slot') || ''}"></slot>
          </div>
        `
      )}
      <slot @slotchange=${this._handleSlotChange}></slot>
    `;
  }

  private _handleSlotChange() {
    const currentSections = this._sections;
    if (currentSections && Array.from(currentSections).some(section => !section.isConnected)) {
      this.requestUpdate();
    }
  }

  private _handleToggle(event: MouseEvent, toggledSection: JuelAccordionSection) {
    super.handleClick(event);
    if (!this.allowMultiple && event instanceof CustomEvent) {
      this._sections?.forEach(section => {
        if (section !== toggledSection) section.open = false;
      });
    }
  }
}