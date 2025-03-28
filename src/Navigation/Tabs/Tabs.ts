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

  @queryAssignedElements({ selector: 'juel-tab' })
  private _tabs?: NodeListOf<JuelTab>;

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid #dee2e6;
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
    .tab:hover {
      background-color: #e9ecef;
      border-color: #ced4da;
    }
    .tab[selected] {
      font-weight: bold;
      border: 1px solid #ced4da;
      border-bottom: 1px solid white;
      background-color: white;
      color: #495057;
    }
  `;

  private _handleSlotChange() {
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="tabs">
        <slot name="prepend"></slot>
        ${map(this._tabs, (tab, index) => html`
          <div class="tab" ?selected=${this.selectedIndex === index} @click=${this.handleClick(index)}>
            ${tab.title}
          </div>
        `)}
        <slot name="append"></slot>
      </div>
      <slot @slotchange=${this._handleSlotChange}></slot>
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

  handleClick(index: number) {
    return (e: MouseEvent) => {
        if (e) {
            RippleEffect.createRipple(e);
        }
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
