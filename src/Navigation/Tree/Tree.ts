import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';

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

  static styles = css`
    ul {
      list-style: none;
      padding-left: 1rem;
      margin: 0;
    }
    .node {
      cursor: pointer;
      display: flex;
      align-items: center;
    }
    .label {
      padding: 2px 4px;
    }
    .label.selectable:hover {
      background: #efefef;
    }
    .chevron {
      width: 1em;
      height: 1em;
      background: var(--icon-chevron-down) no-repeat center;
      background-size: contain;
      transition: transform 0.3s ease;
      margin-right: 0.5em;
    }
    .chevron.rotated {
      transform: rotate(180deg);
    }
  `;

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
    }
  }

  private handleSelect(label: string) {
    this.dispatchEvent(new CustomEvent('node-selected', { detail: { label } }));
  }

  private renderNode(node: any) {
    const label = node[this.labelField];
    const children = node[this.itemsField];
    const hasChildren = Array.isArray(children) && children.length > 0;
    const canSelect = this.isSelectable(node, hasChildren);

    return html`
      <li>
        <div class="node">
          ${hasChildren
            ? html`<span
                class="chevron ${node._expanded ? 'rotated' : ''}"
                @click="${() => this.toggle(node)}"
              ></span>`
            : html`<span style="width: 1em; margin-right: 0.5em;">•</span>`}
          <span
            class="label ${canSelect ? 'selectable' : ''}"
            @click="${() => canSelect && this.handleSelect(label)}"
          >
            ${label}
          </span>
        </div>
        ${hasChildren && node._expanded
          ? html`<ul>${children.map((child: any) => this.renderNode(child))}</ul>`
          : ''}
      </li>
    `;
  }

  render() {
    if (this.data.length > 0) {
      return html`<ul>${this.data.map(item => this.renderNode(item))}</ul>`;
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

  static styles = css`
    :host {
      display: block;
      padding-left: 1rem;
    }
    .leaf {
      cursor: default;
    }
    .leaf.selectable {
      cursor: pointer;
    }
    .leaf.selectable:hover {
      background: #efefef;
    }
  `;

  private isParentSelectable(): boolean {
    const parent = this.parentElement as any;
    this.selectable = ('selectable' in parent && (parent?.selectable === true || parent?.selectable == 'true')) ??
      this.selectable;
    return this.selectable;
  }

  private handleClick() {
    if (this.isParentSelectable()) {
      this.dispatchEvent(new CustomEvent('node-selected', { detail: { label: this.label } }));
    }
  }

  render() {
    const isSelectable = this.isParentSelectable();
    return html`
      <div
        class="leaf ${isSelectable ? 'selectable' : ''}"
        @click="${this.handleClick}"
      >
        ${isSelectable
          ? html`<juel-check @value-changed="${(e: Event) => e.stopPropagation()}"></juel-check>`
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

  static styles = css`
    :host {
      display: block;
      padding-left: 1rem;
    }
    .branch-header {
      cursor: pointer;
      font-weight: bold;
      display: flex;
      align-items: center;
    }
    .chevron {
      width: 1em;
      height: 1em;
      background: var(--icon-chevron-down) no-repeat center;
      background-size: contain;
      transition: transform 0.3s ease;
      margin-right: 0.5em;
    }
    .chevron.rotated {
      transform: rotate(180deg);
    }
    .branch-header.selectable:hover {
      background: #efefef;
    }
    .children {
      margin-left: 1rem;
    }
    .children[hidden] {
      display: none;
    }
  `;

  private isParentSelectable(): boolean {
    const parent = this.parentElement as any;
    this.selectable = ('selectable' in parent && (parent?.selectable === true || parent?.selectable == 'true')) ??
      this.selectable;
    return this.selectable;
  }

  private handleClick() {
    if (this.isParentSelectable()) {
      this.dispatchEvent(new CustomEvent('node-selected', { detail: { label: this.label } }));
    }
    this.toggle();
  }

  private toggle() {
    this.expanded = !this.expanded;
  }

  render() {
    const isSelectable = this.isParentSelectable();
    return html`
      <div
        class="branch-header ${isSelectable ? 'selectable' : ''}"
        @click="${this.handleClick}"
      >
        ${isSelectable
          ? html`<juel-check @value-changed="${(e: Event) => e.stopPropagation()}"></juel-check>`
          : ''}
        <span class="chevron ${this.expanded ? 'rotated' : ''}"></span>
        ${this.label}
      </div>
      <div class="children" ?hidden="${!this.expanded}">
        <slot></slot>
      </div>
    `;
  }
}