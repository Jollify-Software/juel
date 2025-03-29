import { LitElement, html, css } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { map } from 'lit/directives/map';
import { NavigationBase } from '../NavigationBase';
import { RippleEffect } from '../../_Utils/RippleEffect';

@customElement('juel-tab')
export class JuelTab extends LitElement {
  @property({ type: String }) title = '';

  static styles = css`
    :host {
      display: none;
      padding: 16px;
      border: 1px solid #ccc;
      border-top: none;
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

@customElement('juel-tabs')
export class JuelTabs extends NavigationBase {
  @property({ type: Number }) selectedIndex = 0;
  @property({ type: String }) direction: 'horizontal' | 'vertical' = 'horizontal';

  @queryAssignedElements({ selector: 'juel-tab' })
  private _tabs?: NodeListOf<JuelTab>;

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }
    .tabs-container {
      display: flex;
      flex-direction: var(--container-direction, row);
    }
    :host([direction="vertical"]) .tabs-container {
      flex-direction: row;
    }
    .tabs {
      display: flex;
      flex-direction: var(--direction, row);
      border-bottom: 1px solid #dee2e6;
    }
    :host([direction="vertical"]) .tabs {
      flex-direction: column;
      border-bottom: none;
      border-right: 1px solid #dee2e6;
    }
    .tab {
      position: relative;
      padding: 10px 16px;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: 0.25rem 0.25rem 0 0;
      background-color: #f8f9fa;
      margin-right: 4px;
      transition: background-color 0.2s, border-color 0.2s;
    }
    :host([direction="vertical"]) .tab {
      border-bottom: 1px solid transparent;
      border-right: none;
      border-radius: 0.25rem 0 0 0.25rem;
      margin-right: 0;
      margin-bottom: 4px;
    }
    .tab:hover {
      background-color: #e9ecef;
      border-color: #ced4da;
    }
    .tab[selected] {
      font-weight: bold;
      border: 1px solid #ced4da;
      border-bottom: 1px solid white;
      background-color: var(--active, #e7f1ff);
      color: #495057;
    }
    :host([direction="vertical"]) .tab[selected] {
      border-bottom: 1px solid #ced4da;
      border-right: 1px solid white;
    }
    .tab-content {
      flex: 1;
      padding: 16px;
      border: 1px solid #ccc;
      border-left: none;
    }
    :host([direction="vertical"]) .tab-content {
      border-left: 1px solid #dee2e6;
    }
  `;

  private _handleSlotChange() {
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="tabs-container" style="--container-direction: ${this.direction === 'vertical' ? 'row' : 'column'};">
        <div class="tabs" style="--direction: ${this.direction === 'vertical' ? 'column' : 'row'};">
          <slot name="prepend"></slot>
          ${map(this._tabs, (tab, index) => html`
            <div class="tab" ?selected=${this.selectedIndex === index} @click=${this.clickFactory(index)}>
              ${tab.title}
            </div>
          `)}
          <slot name="append"></slot>
        </div>
        <div class="tab-content">
          <slot @slotchange=${this._handleSlotChange}></slot>
        </div>
      </div>
    `;
  }

  updated() {
    this._updateTabs();
  }

  private _updateTabs() {
    if (this._tabs) {
      this._tabs.forEach((tab, index) => {
        tab.style.display = index === this.selectedIndex ? 'block' : 'none';
      });
    }
  }

  clickFactory(index: number) {
    return (e: MouseEvent) => {
        super.handleClick(e);
        this.selectTab(index);
    }
}

  selectTab(index: number) {
    this.selectedIndex = index;
  }
}

// Usage Example
/*

*/
