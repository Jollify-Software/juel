import { LitElement, html, css } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';

export enum SelectionMode {
  None = 'none',
  Single = 'single',
  Multiple = 'multiple',
  Check = 'check'
}

@customElement('juel-table')
export class JuelTable extends LitElement {
  @property({ type: Array }) data: Record<string, any>[] = [];
  @property({ type: String }) selection: SelectionMode = SelectionMode.None;

  @queryAssignedElements({ slot: 'columns' }) columns?: JuelColumn[];

  private selectedRows: Set<number> = new Set();

  private handleCellClick(row: Record<string, any>, column: string, event: Event) {
    //event.stopPropagation(); // Prevent event bubbling
    this.dispatchEvent(new CustomEvent('cell-clicked', {
      detail: { row, column, value: row[column] },
      bubbles: true,
      composed: true
    }));
  }

  private handleRowClick(row: Record<string, any>, index: number, event: Event) {
    if (this.selection === SelectionMode.Single) {
      this.selectedRows.clear();
      this.selectedRows.add(index);
    } else if (this.selection === SelectionMode.Multiple) {
      if (this.selectedRows.has(index)) {
        this.selectedRows.delete(index);
      } else {
        this.selectedRows.add(index);
      }
    }
    this.dispatchEvent(new CustomEvent('row-selected', {
      detail: { selectedRows: Array.from(this.selectedRows) },
      bubbles: true,
      composed: true
    }));
    this.requestUpdate();
  }

  private handleCheckboxChange(index: number, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedRows.add(index);
    } else {
      this.selectedRows.delete(index);
    }
    this.dispatchEvent(new CustomEvent('row-selected', {
      detail: { selectedRows: Array.from(this.selectedRows) },
      bubbles: true,
      composed: true
    }));
    this.requestUpdate();
  }

  static styles = css`
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    th {
      background-color: #f4f4f4;
      text-align: left;
    }
    tr:hover {
      background-color: var(--hover-color, #f9f9f9);
      cursor: pointer;
    }
    tr.selected {
      background-color: var(--selected-color, #d3e4ff);
    }
  `;

  render() {
    const hasCustomColumns = this.columns && this.columns.length > 0;
    const columns = hasCustomColumns
      ? this.columns!.map(el => el.field || '')
      : this.data.length > 0 ? Object.keys(this.data[0]) : [];

    return html`
      <table>
        <thead>
          <tr>
            ${this.selection === SelectionMode.Check ? html`<th></th>` : ''}
            ${columns.map(col => html`<th>${col}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${this.data.map((row, index) => html`
            <tr class=${this.selectedRows.has(index) ? 'selected' : ''}>
              ${this.selection === SelectionMode.Check ? html`
                <td>
                  <input 
                    type="checkbox" 
                    .checked=${this.selectedRows.has(index)} 
                    @change=${(event: Event) => this.handleCheckboxChange(index, event)}
                  />
                </td>
              ` : ''}
              ${columns.map(col => html`
                <td 
                  @click=${(event: Event) => {
                    if (this.selection !== SelectionMode.Check && this.selection !== SelectionMode.None) {
                      this.handleRowClick(row, index, event);
                    }
                    this.handleCellClick(row, col, event);
                  }}
                >
                  ${row[col]}
                </td>
              `)}
            </tr>
          `)}
        </tbody>
      </table>
      <slot name="columns" hidden></slot>
    `;
  }
}

@customElement('juel-column')
export class JuelColumn extends LitElement {
  @property({ type: String }) field = '';
  @property({ type: String }) header = '';

  render() {
    return html`<slot></slot>`;
  }
}