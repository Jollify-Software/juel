import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { map } from 'lit/directives/map';
import { NavigationBase } from '../NavigationBase';
import { RippleEffect } from '../../_Utils/RippleEffect';

@customElement('juel-tab')
export class JuelTab extends LitElement {
  @property({ type: String }) title = '';

  @queryAssignedElements({ selector: 'juel-tab' })
  subTabs?: NodeListOf<JuelTab>;

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
    .sub-tabs {
      display: none;
      flex-direction: var(--sub-tabs-direction, row);
      margin-left: var(--sub-tabs-indent, 0);
      border-left: var(--sub-tabs-border-left, none);
      border-right: var(--sub-tabs-border-right, none);
      border-top: var(--sub-tabs-border-top, none);
      border-bottom: var(--sub-tabs-border-bottom, none);
    }
    :host([direction="vertical"]) .sub-tabs {
      flex-direction: column;
      margin-left: 16px;
      border-left: 1px solid #dee2e6;
    }
    :host([direction="horizontal"]) .sub-tabs {
      border-top: 1px solid #dee2e6;
      border-bottom: 1px solid #dee2e6;
    }
    .sub-tab {
      position: relative;
      padding: 8px 12px;
      cursor: pointer;
      background-color: #f1f3f5;
      border: 1px solid transparent;
      transition: background-color 0.2s, border-color 0.2s;
    }
    .sub-tab:hover {
      background-color: #e9ecef;
      border-color: #ced4da;
    }
    .sub-tab[selected] {
      font-weight: bold;
      background-color: var(--active, #e7f1ff);
      color: #495057;
    }
    .expand-collapse-button {
      width: 16px;
      height: 16px;
      margin-left: 8px;
      cursor: pointer;
      background-color: black;
      mask-size: contain;
      mask-repeat: no-repeat;
      transition: transform 0.2s;
    }
    .expand-collapse-button[expanded] {
      mask-image: var(--icon-minus);
    }
    .expand-collapse-button:not([expanded]) {
      mask-image: var(--icon-plus);
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
            <div class="tab" ?selected=${this.selectedIndex === index}>
              <div @click=${this.clickFactory(tab, index)}>
                ${tab.title}
                ${tab.subTabs?.length ? html`
                  <button class="expand-collapse-button" @click=${this.toggleSubTabs(index)}></button>
                ` : ''}
              </div>
              ${tab.subTabs?.length ? this.renderSubTabs(tab.subTabs, tab, index) : ''}
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

  private renderSubTabs(subTabs: NodeListOf<JuelTab>, parentTab: JuelTab, parentIndex: number): TemplateResult {
    return html`
      <div class="sub-tabs" style="--sub-tabs-direction: ${this.direction === 'vertical' ? 'column' : 'row'};">
        ${Array.from(subTabs).map((subTab, subIndex) => html`
          <div class="sub-tab" ?selected=${this.selectedIndex === parentIndex && subTab.style.display === 'block'} @click=${this.clickFactory(parentTab, parentIndex, subIndex)}>
            ${subTab.title}
            ${subTab.subTabs?.length ? html`
              <button class="expand-collapse-button" @click=${this.toggleSubTabs(parentIndex, subIndex)}></button>
            ` : ''}
            ${subTab.subTabs?.length ? this.renderSubTabs(subTab.subTabs, subTab, parentIndex) : ''}
          </div>
        `)}
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

  clickFactory(tab: JuelTab, parentIndex: number, subIndex?: number) {
    return (e: MouseEvent) => {
      super.handleClick(e);
      if (subIndex !== undefined) {
        this.selectSubTab(tab, parentIndex, subIndex);
      } else {
        this.selectTab(parentIndex);
      }
    };
  }

  selectTab(index: number) {
    this.selectedIndex = index;
  }

  selectSubTab(tab: JuelTab, parentIndex: number, subIndex: number) {
    this.selectedIndex = parentIndex;
    const subTabs = tab.subTabs;
    if (subTabs) {
      Array.from(subTabs).forEach((subTab, index) => {
        subTab.style.display = index === subIndex ? 'block' : 'none';
      });
    }
  }

  toggleSubTabs(parentIndex: number, subIndex?: number) {
    return (e: MouseEvent) => {
      e.stopPropagation();
      const button = e.target as HTMLElement;
      const tab = button.closest(subIndex !== undefined ? '.sub-tab' : '.tab') as HTMLElement;
      if (tab) {
        const subTabsContainer = tab.querySelector('.sub-tabs') as HTMLElement;
        if (subTabsContainer) {
          const isExpanded = subTabsContainer.style.display === 'flex';
          subTabsContainer.style.display = isExpanded ? 'none' : 'flex';
          if (isExpanded) {
            button.removeAttribute('expanded');
          } else {
            button.setAttribute('expanded', 'true');
          }
        }
      }
    };
  }
}

// Usage Example
/*

*/
