import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators';

// Walks up through any nested tree-branch ancestors to the root <tree-menu>
// and applies its selectable mode — not just an immediate parent's literal
// true/"true" (which only covers one nesting level and ignores
// branchesOnly/leavesOnly entirely, even though TreeMenu's own type declares
// all four as valid modes).
function resolveTreeSelectable(el: Element, ownSelectable: boolean, isBranch: boolean): boolean {
  if (ownSelectable) return true;
  let ancestor: Element | null = el.parentElement;
  while (ancestor && ancestor.tagName !== 'TREE-MENU') {
    ancestor = ancestor.parentElement;
  }
  const mode = (ancestor as any)?.selectable;
  if (mode === true || mode === 'true') return true;
  if (mode === 'branchesOnly') return isBranch;
  if (mode === 'leavesOnly') return !isBranch;
  return false;
}

// =============================
// Tree Menu (Main Component)
// =============================

@customElement('tree-menu')
export class TreeMenu extends LitElement {
  @property({ type: Array }) data: any[] = [];
  @property({ type: String }) labelField: string = 'label';
  @property({ type: String }) itemsField: string = 'items';
  @property({ type: String }) selectableField: string = 'selectable';
  @property({ type: String }) selectable: 'false' | 'true' | 'branchesOnly' | 'leavesOnly' = 'false';

  // Data-driven mode: the currently-selected data object, tracked directly.
  private _selectedNode: any = null;
  // Declarative (slotted tree-branch/tree-leaf) mode: TreeMenu can't see
  // into sibling elements' state, so it coordinates single-selection itself
  // by listening for the (now bubbling) node-selected event and flipping
  // .selected on whichever element dispatched it, clearing the last one.
  private _selectedElement: any = null;

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      font-size: 0.9rem;
      color: var(--dark, #343a40);
    }
    ul {
      list-style: none;
      margin: 0;
      padding-left: 1.125rem;
      border-left: 1px solid #e9ecef;
    }
    :host > ul {
      padding-left: 0;
      border-left: none;
    }
    .node {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      min-height: 2rem;
      padding: 0 0.375rem;
      border-radius: 0.375rem;
      border-left: 3px solid transparent;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .node.hoverable:hover {
      background: #f1f3f5;
    }
    .node.selected {
      background: var(--active, #e7f1ff);
      border-left-color: var(--primary, #007bff);
    }
    .label {
      flex: 1;
      min-width: 0;
      padding: 0.375rem 0.5rem 0.375rem 0;
      cursor: default;
    }
    .label.selectable {
      cursor: pointer;
    }
    .node.selected .label {
      font-weight: bold;
      color: var(--primary, #007bff);
    }
    .label:focus-visible {
      outline: 2px solid var(--primary, #007bff);
      outline-offset: -2px;
      border-radius: 0.25rem;
    }
    .chevron {
      flex: 0 0 auto;
      width: 1.1em;
      height: 1.1em;
      background: var(--icon-chevron-down) no-repeat center;
      background-size: 0.7em;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .chevron.rotated {
      transform: rotate(180deg);
    }
    .leaf-bullet {
      flex: 0 0 auto;
      width: 1.1em;
      height: 1.1em;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .leaf-bullet::before {
      content: '';
      width: 0.3em;
      height: 0.3em;
      border-radius: 50%;
      background: #adb5bd;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('node-selected', this._onDeclarativeSelect);
  }

  disconnectedCallback() {
    this.removeEventListener('node-selected', this._onDeclarativeSelect);
    super.disconnectedCallback();
  }

  private _onDeclarativeSelect = (e: Event) => {
    if (this.data.length > 0) return; // data-driven mode tracks selection itself
    const target = e.target as any;
    if (target === this || !('selected' in target)) return;
    if (this._selectedElement && this._selectedElement !== target) {
      this._selectedElement.selected = false;
    }
    this._selectedElement = target;
    target.selected = true;
  };

  private toggle(node: any) {
    node._expanded = !node._expanded;
    this.requestUpdate();
  }

  private isSelectable(node: any, hasChildren: boolean): boolean {
    const explicit = node[this.selectableField];
    if (explicit === false) return false;

    switch (this.selectable) {
      case 'false': return false;
      case 'true': return true;
      case 'branchesOnly': return hasChildren;
      case 'leavesOnly': return !hasChildren;
      default: return false;
    }
  }

  private handleSelect(node: any, label: string) {
    this._selectedNode = node;
    this.dispatchEvent(new CustomEvent('node-selected', { detail: { label }, bubbles: true, composed: true }));
    this.requestUpdate();
  }

  private handleActivate(node: any, label: string, canSelect: boolean, hasChildren: boolean) {
    if (canSelect) {
      this.handleSelect(node, label);
    } else if (hasChildren) {
      this.toggle(node);
    }
  }

  private handleKeydown(e: KeyboardEvent, node: any, canSelect: boolean, hasChildren: boolean) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleActivate(node, node[this.labelField], canSelect, hasChildren);
    } else if (e.key === 'ArrowRight' && hasChildren && !node._expanded) {
      e.preventDefault();
      this.toggle(node);
    } else if (e.key === 'ArrowLeft' && hasChildren && node._expanded) {
      e.preventDefault();
      this.toggle(node);
    }
  }

  private renderNode(node: any) {
    const label = node[this.labelField];
    const children = node[this.itemsField];
    const hasChildren = Array.isArray(children) && children.length > 0;
    const canSelect = this.isSelectable(node, hasChildren);
    const isSelected = node === this._selectedNode;

    return html`
      <li role="treeitem" aria-expanded="${hasChildren ? (node._expanded ? 'true' : 'false') : nothing}" aria-selected="${canSelect ? (isSelected ? 'true' : 'false') : nothing}">
        <div class="node ${canSelect || hasChildren ? 'hoverable' : ''} ${isSelected ? 'selected' : ''}">
          ${hasChildren
            ? html`<span
                class="chevron ${node._expanded ? 'rotated' : ''}"
                @click="${() => this.toggle(node)}"
              ></span>`
            : html`<span class="leaf-bullet"></span>`}
          <span
            class="label ${canSelect ? 'selectable' : ''}"
            tabindex="${canSelect || hasChildren ? '0' : '-1'}"
            @click="${() => this.handleActivate(node, label, canSelect, hasChildren)}"
            @keydown="${(e: KeyboardEvent) => this.handleKeydown(e, node, canSelect, hasChildren)}"
          >
            ${label}
          </span>
        </div>
        ${hasChildren && node._expanded
          ? html`<ul role="group">${children.map((child: any) => this.renderNode(child))}</ul>`
          : ''}
      </li>
    `;
  }

  render() {
    if (this.data.length > 0) {
      return html`<ul role="tree">${this.data.map(item => this.renderNode(item))}</ul>`;
    }
    return html`<slot></slot>`;
  }
}

// =============================
// Tree Leaf Component
// =============================

@customElement('tree-leaf')
export class TreeLeaf extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Boolean }) selectable = false; // Default selectable to false
  @property({ type: Boolean, reflect: true }) selected = false;

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      font-size: 0.9rem;
      color: var(--dark, #343a40);
    }
    .leaf {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 2rem;
      padding: 0 0.5rem;
      cursor: default;
      border-radius: 0.375rem;
      border-left: 3px solid transparent;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .leaf.selectable {
      cursor: pointer;
    }
    .leaf.selectable:hover {
      background: #f1f3f5;
    }
    :host([selected]) .leaf {
      background: var(--active, #e7f1ff);
      border-left-color: var(--primary, #007bff);
      font-weight: bold;
      color: var(--primary, #007bff);
    }
    .leaf:focus-visible {
      outline: 2px solid var(--primary, #007bff);
      outline-offset: -2px;
    }
  `;

  private isSelectable(): boolean {
    return resolveTreeSelectable(this, this.selectable, false);
  }

  private handleClick() {
    if (this.isSelectable()) {
      this.selected = true;
      this.dispatchEvent(new CustomEvent('node-selected', { detail: { label: this.label }, bubbles: true, composed: true }));
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  }

  render() {
    const isSelectable = this.isSelectable();
    return html`
      <div
        class="leaf ${isSelectable ? 'selectable' : ''}"
        role="treeitem"
        tabindex="${isSelectable ? '0' : '-1'}"
        aria-selected="${isSelectable ? (this.selected ? 'true' : 'false') : nothing}"
        @click="${this.handleClick}"
        @keydown="${this.handleKeydown}"
      >
        ${isSelectable
          ? html`<juel-check .value="${this.selected}" @value-changed="${(e: Event) => e.stopPropagation()}"></juel-check>`
          : ''}
        ${this.label}
      </div>
    `;
  }
}

// =============================
// Tree Branch Component
// =============================

@customElement('tree-branch')
export class TreeBranch extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Boolean, reflect: true }) expanded = false;
  @property({ type: Boolean }) selectable = false; // Default selectable to false
  @property({ type: Boolean, reflect: true }) selected = false;

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      font-size: 0.9rem;
      color: var(--dark, #343a40);
    }
    .branch-header {
      cursor: pointer;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 2rem;
      padding: 0 0.5rem;
      border-radius: 0.375rem;
      border-left: 3px solid transparent;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .chevron {
      flex: 0 0 auto;
      width: 1.1em;
      height: 1.1em;
      background: var(--icon-chevron-down) no-repeat center;
      background-size: 0.7em;
      border-radius: 0.25rem;
      transition: transform 0.2s ease;
    }
    .chevron.rotated {
      transform: rotate(180deg);
    }
    .branch-header:hover {
      background: #f1f3f5;
    }
    :host([selected]) .branch-header {
      background: var(--active, #e7f1ff);
      border-left-color: var(--primary, #007bff);
      color: var(--primary, #007bff);
    }
    .branch-header:focus-visible {
      outline: 2px solid var(--primary, #007bff);
      outline-offset: -2px;
    }
    .children {
      margin-left: 0.9rem;
      padding-left: 0.75rem;
      border-left: 1px solid #e9ecef;
    }
    .children[hidden] {
      display: none;
    }
  `;

  private isSelectable(): boolean {
    return resolveTreeSelectable(this, this.selectable, true);
  }

  private handleClick() {
    if (this.isSelectable()) {
      this.selected = true;
      this.dispatchEvent(new CustomEvent('node-selected', { detail: { label: this.label }, bubbles: true, composed: true }));
    }
    this.toggle();
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    } else if (e.key === 'ArrowRight' && !this.expanded) {
      e.preventDefault();
      this.toggle();
    } else if (e.key === 'ArrowLeft' && this.expanded) {
      e.preventDefault();
      this.toggle();
    }
  }

  private toggle() {
    this.expanded = !this.expanded;
  }

  render() {
    const isSelectable = this.isSelectable();
    return html`
      <div
        class="branch-header ${isSelectable ? 'selectable' : ''}"
        role="treeitem"
        tabindex="0"
        aria-expanded="${this.expanded}"
        aria-selected="${isSelectable ? (this.selected ? 'true' : 'false') : nothing}"
        @click="${this.handleClick}"
        @keydown="${this.handleKeydown}">
        ${isSelectable
          ? html`<juel-check .value="${this.selected}" @value-changed="${(e: Event) => e.stopPropagation()}"></juel-check>`
          : ''}
        <span class="chevron ${this.expanded ? 'rotated' : ''}"></span>
        ${this.label}
      </div>
      <div class="children" role="group" ?hidden="${!this.expanded}">
        <slot></slot>
      </div>
    `;
  }
}
