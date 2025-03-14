import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('juel-list-item')
export class JuelListItem extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Boolean, reflect: true }) expanded = false;
  @property({ type: Array }) items = [];
  @property({ type: String }) filter = '';

  static styles = css`
    :host {
      display: block;
      border: 1px solid #ddd;
      padding: 10px;
      cursor: pointer;
      background: #fff;
    }
    :host([expandable]) {
      font-weight: bold;
    }
    .nested {
      margin-left: 20px;
      display: none;
    }
    :host([expanded]) .nested {
      display: block;
    }
  `;

  toggle() {
    if (this.items.length > 0 || this.querySelector('juel-list-item')) {
      this.expanded = !this.expanded;
    }
  }

  render() {
    const filteredItems = this.items.filter(item => item.label.toLowerCase().includes(this.filter.toLowerCase()));
    return html`
      <div @click="${() => this.toggle()}">
        ${this.label}
        ${filteredItems.length > 0 ? html`<span> ${this.expanded ? '-' : '+'} </span>` : ''}
      </div>
      <div class="nested">
        ${filteredItems.map(
          item => html`<juel-list-item .label="${item.label}" .items="${item.items || []}" .filter="${this.filter}"></juel-list-item>`
        )}
        <slot></slot>
      </div>
    `;
  }
}

@customElement('juel-list')
export class JuelList extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: Array }) items = [];
  @property({ type: Boolean, attribute: "enable-search" }) enableSearch = false;
  @state() filter = '';

  static styles = css`
    :host {
      display: block;
      border: 1px solid #ccc;
      border-radius: 5px;
      overflow: hidden;
      padding: 10px;
    }
    .search-box {
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  `;

  updateFilter(event) {
    this.filter = event.target.value;
  }

  render() {
    const filteredItems = this.items.filter(item => item.label.toLowerCase().includes(this.filter.toLowerCase()));
    return html`
      ${this.enableSearch ? html`<input type="text" class="search-box" @input="${this.updateFilter}" placeholder="Search..." />` : ''}
      ${this.title ? html`<div class="title">${this.title}</div>` : ''}
      ${filteredItems.map(
        item => html`<juel-list-item .label="${item.label}" .items="${item.items || []}" .filter="${this.filter}"></juel-list-item>`
      )}
      <slot></slot>
    `;
  }
}