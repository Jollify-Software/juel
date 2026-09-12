import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { map } from 'lit/directives/map';
import interact from '@interactjs/interactjs';
import { NavigationBase } from '../NavigationBase';
import { TabsEvents } from './TabsEvents';

@customElement('juel-tab')
export class JuelTab extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: Boolean }) closable = false;

  @queryAssignedElements({ selector: 'juel-tab' })
  subTabs?: NodeListOf<JuelTab>;

  static styles = css`
    :host {
      display: none;
      height: 100%;
      padding: 16px;
      border: 1px solid #ccc;
      border-top: none;
      box-sizing: border-box;
      overflow: auto;
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
  // Drag-to-reorder top-level tabs. Off by default so plain <juel-tabs> use
  // (outside juel-mdi) doesn't pull in pointer-drag behavior unasked.
  @property({ type: Boolean }) reorderable = false;

  @queryAssignedElements({ selector: 'juel-tab' })
  private _tabs?: NodeListOf<JuelTab>;

  // Which sub-tab is showing within each parent tab that has sub-tabs, and
  // whether that parent's sub-tab list is expanded — keyed by the JuelTab
  // element itself so it works at any nesting depth. Defaults are filled in
  // lazily by _updateSubTabs() (called from updated(), not render()) rather
  // than mutated during render.
  private _subSelection = new Map<JuelTab, number>();
  private _subExpanded = new Map<JuelTab, boolean>();

  // The actual selected <juel-tab> element, tracked alongside selectedIndex
  // so that when a tab elsewhere in the list is added or removed — shifting
  // every index after it — the same panel keeps showing instead of the
  // selection silently following the now-stale index onto a different
  // panel. See selectTab()/selectSubTab() and _handleSlotChange().
  private _selectedTab?: JuelTab;

  static styles = css`
    :host {
      display: block;
      height: 100%;
      font-family: Arial, sans-serif;
    }
    .tabs-container {
      display: flex;
      flex-direction: var(--container-direction, row);
      height: 100%;
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
      display: flex;
      align-items: center;
      padding: 10px 16px;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: 0.25rem 0.25rem 0 0;
      background-color: #f8f9fa;
      margin-right: 4px;
      transition: background-color 0.2s, border-color 0.2s;
      user-select: none;
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
    .tab:focus-visible,
    .sub-tab:focus-visible {
      outline: 2px solid #0d6efd;
      outline-offset: -2px;
    }
    .tab-content {
      flex: 1;
      min-height: 0;
      padding: 16px;
      border: 1px solid #ccc;
      border-left: none;
      overflow: auto;
      box-sizing: border-box;
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
    .sub-tabs[expanded] {
      display: flex;
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
      border: none;
      padding: 0;
      mask-size: contain;
      mask-repeat: no-repeat;
      transition: transform 0.2s;
    }
    .expand-collapse-button[aria-expanded="true"] {
      mask-image: var(--icon-minus);
    }
    .expand-collapse-button[aria-expanded="false"] {
      mask-image: var(--icon-plus);
    }
    .expand-collapse-button:focus-visible {
      outline: 2px solid #0d6efd;
    }
    .close-button {
      width: 16px;
      height: 16px;
      margin-left: 8px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background-color: transparent;
      cursor: pointer;
      flex-shrink: 0;
    }
    .close-button:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
    .close-button:focus-visible {
      outline: 2px solid #0d6efd;
    }
    .close-button:after {
      content: '';
      display: block;
      width: 100%;
      height: 100%;
      mask-image: var(--icon-close);
      mask-size: 60%;
      mask-repeat: no-repeat;
      mask-position: center;
      -webkit-mask-image: var(--icon-close);
      -webkit-mask-size: 60%;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center;
      background-color: currentColor;
    }
    .tab.dragging {
      opacity: 0.6;
      z-index: 1;
    }
    .tab.drop-target {
      border-color: #0d6efd;
    }
  `;

  private _handleSlotChange() {
    // A tab added/removed at runtime (e.g. via a close button) can leave
    // selectedIndex stale. Prefer keeping the same panel visible by
    // identity — recomputing its (possibly shifted) index — over letting
    // the selection silently follow the old index onto a different panel.
    // Only fall back to positional clamping when the previously-selected
    // tab itself is gone (or this is the first run).
    const tabs = this._tabs ? Array.from(this._tabs) : [];
    if (tabs.length === 0) {
      this._selectedTab = undefined;
    } else if (this._selectedTab && tabs.includes(this._selectedTab)) {
      this.selectedIndex = tabs.indexOf(this._selectedTab);
    } else {
      if (this.selectedIndex >= tabs.length) this.selectedIndex = tabs.length - 1;
      this._selectedTab = tabs[this.selectedIndex];
    }
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="tabs-container" style="--container-direction: ${this.direction === 'vertical' ? 'row' : 'column'};">
        <div class="tabs" role="tablist" aria-orientation="${this.direction}" style="--direction: ${this.direction === 'vertical' ? 'column' : 'row'};">
          <slot name="prepend"></slot>
          ${map(this._tabs, (tab, index) => {
            const selected = this.selectedIndex === index;
            const hasSubTabs = !!tab.subTabs?.length;
            const expanded = hasSubTabs && !!this._subExpanded.get(tab);
            return html`
            <div
              class="tab"
              role="tab"
              id="tab-${index}"
              data-index="${index}"
              tabindex="${selected ? '0' : '-1'}"
              aria-selected="${selected}"
              aria-controls="tab-content"
              ?selected=${selected}
              @click=${this.clickFactory(tab, index)}
              @keydown=${(e: KeyboardEvent) => this._onTopTabKeydown(e, index)}>
                ${tab.title}
                ${hasSubTabs ? html`
                  <button
                    type="button"
                    class="expand-collapse-button"
                    aria-expanded="${expanded}"
                    aria-label="${expanded ? 'Collapse' : 'Expand'} ${tab.title} sub-tabs"
                    @click=${this.toggleSubTabsFactory(tab)}></button>
                ` : ''}
                ${tab.closable ? html`
                  <button
                    type="button"
                    class="close-button"
                    aria-label="Close ${tab.title}"
                    @click=${this.closeFactory(index)}></button>
                ` : ''}
              ${hasSubTabs ? this.renderSubTabs(tab.subTabs!, tab, index, expanded) : ''}
            </div>
          `;
          })}
          <slot name="append"></slot>
        </div>
        <div class="tab-content" id="tab-content" role="tabpanel" aria-labelledby="tab-${this.selectedIndex}">
          <slot @slotchange=${this._handleSlotChange}></slot>
        </div>
      </div>
    `;
  }

  private renderSubTabs(subTabs: NodeListOf<JuelTab>, parentTab: JuelTab, parentIndex: number, expanded: boolean): TemplateResult {
    const selectedSub = this._subSelection.get(parentTab) ?? 0;
    return html`
      <div class="sub-tabs" role="tablist" aria-orientation="${this.direction}" style="--sub-tabs-direction: ${this.direction === 'vertical' ? 'column' : 'row'};" ?expanded=${expanded}>
        ${Array.from(subTabs).map((subTab, subIndex) => {
          const selected = this.selectedIndex === parentIndex && subIndex === selectedSub;
          const hasSubTabs = !!subTab.subTabs?.length;
          const subExpanded = hasSubTabs && !!this._subExpanded.get(subTab);
          return html`
          <div
            class="sub-tab"
            role="tab"
            tabindex="0"
            aria-selected="${selected}"
            ?selected=${selected}
            @click=${this.clickFactory(parentTab, parentIndex, subIndex)}
            @keydown=${(e: KeyboardEvent) => this._onSubTabKeydown(e, parentTab, parentIndex, subIndex)}>
            ${subTab.title}
            ${hasSubTabs ? html`
              <button
                type="button"
                class="expand-collapse-button"
                aria-expanded="${subExpanded}"
                aria-label="${subExpanded ? 'Collapse' : 'Expand'} ${subTab.title} sub-tabs"
                @click=${this.toggleSubTabsFactory(subTab)}></button>
            ` : ''}
            ${hasSubTabs ? this.renderSubTabs(subTab.subTabs!, subTab, parentIndex, subExpanded) : ''}
          </div>`;
        })}
      </div>
    `;
  }

  updated(changedProperties: PropertyValues) {
    // Catches selectedIndex being set from outside (e.g. a controlling
    // parent like juel-mdi binding .selectedIndex=), so identity tracking
    // stays in sync even when selectTab()/selectSubTab() weren't the ones
    // that changed it.
    if (changedProperties.has('selectedIndex')) {
      this._selectedTab = this._tabs?.[this.selectedIndex];
    }
    this._updateTabs();
    if (this.reorderable) {
      this._wireReordering();
    }
  }

  // Drag-to-reorder: each top-level .tab is both draggable and a dropzone
  // for its siblings. Dropping tab A onto tab B moves A to B's index and
  // dispatches TabReorder — reordering the underlying data is the
  // consumer's job (the tabs re-render from that data on the next update),
  // this component doesn't own tab order itself.
  private _wireReordering() {
    const tabElements = this.shadowRoot?.querySelectorAll('.tabs > .tab');
    if (!tabElements) return;

    tabElements.forEach((el) => {
      const tab = el as HTMLElement;
      interact(tab).unset();

      interact(tab)
        .draggable({
          listeners: {
            start: () => {
              tab.classList.add('dragging');
            },
            move: (event) => {
              const x = (parseFloat(tab.dataset.dragX || '0')) + event.dx;
              const y = (parseFloat(tab.dataset.dragY || '0')) + event.dy;
              tab.style.transform = `translate(${x}px, ${y}px)`;
              tab.dataset.dragX = String(x);
              tab.dataset.dragY = String(y);
            },
            end: (event) => {
              tab.classList.remove('dragging');
              tab.style.transform = '';
              delete tab.dataset.dragX;
              delete tab.dataset.dragY;
              this.dispatchEvent(new CustomEvent(TabsEvents.TabDragEnd, {
                detail: { index: Number(tab.dataset.index), client: { x: event.client.x, y: event.client.y } },
                bubbles: true,
                composed: true,
              }));
            },
          },
        })
        .dropzone({
          accept: '.tab',
          overlap: 0.5,
          ondragenter: (event) => {
            (event.target as HTMLElement).classList.add('drop-target');
          },
          ondragleave: (event) => {
            (event.target as HTMLElement).classList.remove('drop-target');
          },
          ondrop: (event) => {
            const dropTarget = event.target as HTMLElement;
            const dragged = event.relatedTarget as HTMLElement;
            dropTarget.classList.remove('drop-target');
            const from = Number(dragged.dataset.index);
            const to = Number(dropTarget.dataset.index);
            if (Number.isNaN(from) || Number.isNaN(to) || from === to) return;
            this.dispatchEvent(new CustomEvent(TabsEvents.TabReorder, {
              detail: { from, to },
              bubbles: true,
              composed: true,
            }));
          },
        });
    });
  }

  private _updateTabs() {
    this._tabs?.forEach((tab, index) => {
      const active = index === this.selectedIndex;
      tab.style.display = active ? 'block' : 'none';
      this._updateSubTabs(tab, active);
    });
  }

  private _updateSubTabs(tab: JuelTab, ancestorActive: boolean) {
    const subTabs = tab.subTabs;
    if (!subTabs || subTabs.length === 0) return;

    if (!this._subSelection.has(tab)) {
      this._subSelection.set(tab, 0);
    }
    if (!this._subExpanded.has(tab)) {
      // Default a freshly-encountered branch open exactly when its parent is
      // the one currently on screen, so you don't land on a tab with no
      // visible sub-navigation and no visible content.
      this._subExpanded.set(tab, ancestorActive);
    }
    const selectedSub = this._subSelection.get(tab)!;

    Array.from(subTabs).forEach((subTab, subIndex) => {
      const subActive = ancestorActive && subIndex === selectedSub;
      subTab.style.display = subActive ? 'block' : 'none';
      this._updateSubTabs(subTab, subActive);
    });
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
    if (index === this.selectedIndex) return;
    const previousIndex = this.selectedIndex;
    this.selectedIndex = index;
    this._selectedTab = this._tabs?.[index];
    this.dispatchEvent(new CustomEvent(TabsEvents.TabChanged, {
      detail: { index, previousIndex },
    }));
  }

  selectSubTab(tab: JuelTab, parentIndex: number, subIndex: number) {
    const changingTab = parentIndex !== this.selectedIndex;
    const changingSub = this._subSelection.get(tab) !== subIndex;
    if (!changingTab && !changingSub) return;

    const previousIndex = this.selectedIndex;
    this.selectedIndex = parentIndex;
    this._selectedTab = tab;
    this._subSelection.set(tab, subIndex);
    this._subExpanded.set(tab, true);
    // _subSelection is a plain Map, not a reactive property, and when the
    // parent tab was already selected, the selectedIndex write above is a
    // same-value no-op that Lit's hasChanged skips — so a render isn't
    // guaranteed without asking for one explicitly.
    this.requestUpdate();

    this.dispatchEvent(new CustomEvent(TabsEvents.TabChanged, {
      detail: { index: parentIndex, previousIndex, subIndex },
    }));
  }

  closeFactory(index: number) {
    return (e: MouseEvent) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent(TabsEvents.TabClose, {
        detail: { index },
        bubbles: true,
        composed: true,
      }));
    };
  }

  toggleSubTabsFactory(tab: JuelTab) {
    return (e: MouseEvent) => {
      e.stopPropagation();
      this._subExpanded.set(tab, !this._subExpanded.get(tab));
      this.requestUpdate();
    };
  }

  private _onTopTabKeydown(e: KeyboardEvent, index: number) {
    const count = this._tabs?.length ?? 0;
    const target = this._resolveArrowTarget(e, index, count);
    if (target === null) return;
    e.preventDefault();
    this.selectTab(target);
    this.updateComplete.then(() => {
      (this.shadowRoot?.querySelectorAll('.tabs > .tab')[target] as HTMLElement)?.focus();
    });
  }

  private _onSubTabKeydown(e: KeyboardEvent, tab: JuelTab, parentIndex: number, subIndex: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.selectSubTab(tab, parentIndex, subIndex);
    }
  }

  private _resolveArrowTarget(e: KeyboardEvent, index: number, count: number): number | null {
    if (count === 0) return null;
    const isVertical = this.direction === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    if (e.key === nextKey) return (index + 1) % count;
    if (e.key === prevKey) return (index - 1 + count) % count;
    if (e.key === 'Home') return 0;
    if (e.key === 'End') return count - 1;
    return null;
  }
}
