import { LitElement, html, css } from 'lit';
import { customElement, property, queryAssignedElements, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { lucideIcon } from '../../_Modules/Icons/Lucide';
import { TableEvents } from './TableEvents';
import { CellCompare, SortDirection, sortRows } from './sortRows';
import { TableGrid, addColumn, addRow, isCellBlock, normaliseGrid, pasteCells, readTsv, removeColumn, removeRow, setCell } from './editTable';

export enum SelectionMode {
  None = 'none',
  Single = 'single',
  Multiple = 'multiple',
  Check = 'check'
}

/**
 * Sorting: `sortable` on the table makes every bound column sortable, or set
 * it per `<juel-column sortable>`. A sortable header is a button that cycles
 * ascending -> descending -> unsorted, and its `<th>` carries `aria-sort`.
 * `sort-field` / `sort-direction` hold the current sort (settable), each
 * change fires `sort-changed` `{ field, direction }`, and with
 * `external-sort` the table only shows the indicators and leaves ordering
 * `data` to the page (a server-side sort). Selection and every event's
 * `index` refer to the row's position in `data`, not on screen.
 *
 * Empty: with no rows, one full-width row shows the `empty` slot, or
 * `empty-text` (default "No rows").
 *
 * Editable (`<juel-table editable>`): a grid of text the user types into, for data such as a chart's.
 * The grid is `value` (`string[][]`, the first row being the column headings), not `data` or
 * `<juel-column>`s, and every edit fires `value-changed` `{ value }` with a new grid. Tab / Shift+Tab,
 * Enter and the arrow keys move between cells (left and right only at the start or end of the text);
 * Tab on the last cell, or Enter on the last row, adds a row. **+** adds a column (after the last) or
 * a row (under the last); **-** on a heading or a row, shown on hover or focus, removes it, never the
 * last column or body row. Pasting a block of cells (tab-separated lines, as a spreadsheet copies)
 * into a cell spreads it right and down, growing the grid. Each heading has a slot `column-<i>` and
 * each body row's first cell a slot `row-<i>` (both from 0) for the page's own controls, such as a
 * colour per series. Sorting and selection are off while editable.
 */
/** A Lucide glyph on one of the editable table's add and remove buttons. */
const toolIcon = (glyph: string) => html`<span class="tool-icon" aria-hidden="true" style=${`--icon: url("${lucideIcon(glyph)}")`}></span>`;

@customElement('juel-table')
export class JuelTable extends LitElement {
  @property({ type: Array }) data: Record<string, any>[] = [];
  @property({ type: String }) selection: SelectionMode = SelectionMode.None;
  @property({ type: Boolean }) sortable = false;
  @property({ type: String, attribute: 'sort-field', reflect: true }) sortField: string | null = null;
  @property({ type: String, attribute: 'sort-direction', reflect: true }) sortDirection: SortDirection | null = null;
  @property({ type: Boolean, attribute: 'external-sort' }) externalSort = false;
  @property({ type: String, attribute: 'empty-text' }) emptyText = 'No rows';
  /** Make the table a grid of text to type into (see the class notes); its content is then `value`. */
  @property({ type: Boolean, reflect: true }) editable = false;
  /** The editable grid: rows of cells, the first row the column headings. Normalised on each edit (rectangular, at least one column and one body row). */
  @property({ attribute: false }) value: string[][] = [];
  /** The editable table's own words, for another language: the add and remove buttons and the cells' accessible names. */
  @property({ attribute: false }) labels = {
    addRow: 'Add a row', addColumn: 'Add a column', removeRow: 'Remove this row', removeColumn: 'Remove this column',
    heading: (column: number) => `Column ${column + 1} heading`, cell: (row: number, column: number) => `Row ${row}, column ${column + 1}`,
  };

  /** The editable cell to focus after the next render (grid row, column), with the caret at its end. */
  private pendingFocus: { row: number; column: number } | null = null;

  @queryAssignedElements({ slot: 'columns' }) columns?: JuelColumn[];

  private selectedRows: Set<number> = new Set();

  // Roving tabindex: one row is in the tab order and the arrow keys move
  // between them, rather than every row being its own tab stop (40 rows would
  // otherwise mean 40 presses to get past the table).
  @state() private focusedRow = 0;

  // Rows are operable when the table has a selection mode. A selection="none"
  // table is display-only as far as the keyboard is concerned — it still
  // fires cell-clicked on a click, but nothing about it says "these rows do
  // something", so it gets no focus ring, no pointer cursor and no tab stop.
  private get interactive(): boolean {
    return this.selection !== SelectionMode.None;
  }

  private handleCellClick(row: Record<string, any>, column: string, event: Event) {
    //event.stopPropagation(); // Prevent event bubbling
    this.dispatchEvent(new CustomEvent(TableEvents.CellClicked, {
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
    this.dispatchEvent(new CustomEvent(TableEvents.RowSelected, {
      detail: { selectedRows: Array.from(this.selectedRows) },
      bubbles: true,
      composed: true
    }));
    this.requestUpdate();
  }

  // Both a click and Enter/Space land here, so a consumer that navigates on a
  // row reaches keyboard users as well as mouse users.
  private activateRow(row: Record<string, any>, index: number) {
    this.dispatchEvent(new CustomEvent(TableEvents.RowActivated, {
      detail: { row, index },
      bubbles: true,
      composed: true
    }));
  }

  private focusRow(index: number) {
    const rows = this.renderRoot.querySelectorAll<HTMLTableRowElement>('tbody tr');
    if (!rows.length) return;
    const clamped = Math.max(0, Math.min(index, rows.length - 1));
    this.focusedRow = clamped;
    // The tabindex swap is a render away, so focus after it lands.
    this.updateComplete.then(() => {
      this.renderRoot.querySelectorAll<HTMLTableRowElement>('tbody tr')[clamped]?.focus();
    });
  }

  // `index` is the row's place in `data`; `position` is where it is on screen.
  private handleRowKeydown(row: Record<string, any>, index: number, position: number, event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); this.focusRow(position + 1); break;
      case 'ArrowUp': event.preventDefault(); this.focusRow(position - 1); break;
      case 'Home': event.preventDefault(); this.focusRow(0); break;
      case 'End': event.preventDefault(); this.focusRow(this.data.length - 1); break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.selection === SelectionMode.Check) {
          if (this.selectedRows.has(index)) this.selectedRows.delete(index); else this.selectedRows.add(index);
          this.dispatchEvent(new CustomEvent(TableEvents.RowSelected, {
            detail: { selectedRows: Array.from(this.selectedRows) },
            bubbles: true,
            composed: true
          }));
          this.requestUpdate();
        } else {
          this.handleRowClick(row, index, event);
        }
        this.activateRow(row, index);
        break;
    }
  }

  private handleCheckboxChange(index: number, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedRows.add(index);
    } else {
      this.selectedRows.delete(index);
    }
    this.dispatchEvent(new CustomEvent(TableEvents.RowSelected, {
      detail: { selectedRows: Array.from(this.selectedRows) },
      bubbles: true,
      composed: true
    }));
    this.requestUpdate();
  }

  private isSortable(field: string, column?: JuelColumn): boolean {
    if (!field) return false; // an unbound column has nothing to sort by
    return column ? column.sortable || this.sortable : this.sortable;
  }

  // Click on a sortable header: ascending -> descending -> unsorted.
  private toggleSort(field: string) {
    let direction: SortDirection | null = 'asc';
    if (this.sortField === field) {
      direction = this.sortDirection === 'asc' ? 'desc' : this.sortDirection === 'desc' ? null : 'asc';
    }
    this.sortField = direction ? field : null;
    this.sortDirection = direction;
    this.dispatchEvent(new CustomEvent(TableEvents.SortChanged, {
      detail: { field: this.sortField, direction: this.sortDirection },
      bubbles: true,
      composed: true
    }));
  }

  // Indices into `data`, in display order.
  private displayOrder(): number[] {
    if (this.externalSort) return this.data.map((_, i) => i);
    const column = this.columns?.find(c => c.field === this.sortField);
    return sortRows(this.data, this.sortField, this.sortDirection, column?.compare ?? undefined);
  }

  private renderHeader(field: string, label: string, column?: JuelColumn) {
    if (!this.isSortable(field, column)) return html`<th>${label}</th>`;
    const direction = this.sortField === field ? this.sortDirection : null;
    const ariaSort = direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
    const indicator = direction === 'asc' ? '\u25B2' : direction === 'desc' ? '\u25BC' : '\u21C5';
    return html`
      <th aria-sort=${ariaSort} class="sortable">
        <button type="button" class="sort" @click=${() => this.toggleSort(field)}>
          <span>${label}</span><span class="sort-indicator" aria-hidden="true">${indicator}</span>
        </button>
      </th>`;
  }

  /** The editable grid as shown: `value`, normalised. */
  private get grid(): TableGrid {
    return normaliseGrid(this.value);
  }

  /** Sets the grid and says so (`value-changed`); `focus` names the cell to move to after the render. */
  private commitGrid(grid: TableGrid, focus?: { row: number; column: number }) {
    this.value = grid;
    if (focus) this.pendingFocus = focus;
    this.dispatchEvent(new CustomEvent(TableEvents.ValueChanged, {
      detail: { value: grid.map(r => [...r]) },
      bubbles: true,
      composed: true
    }));
  }

  /** Puts the cursor in cell (`row`, `column`) of the editable grid (row 0 is the headings), at the end of its text. */
  focusCell(row: number, column: number) {
    this.pendingFocus = { row, column };
    this.requestUpdate();
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    super.updated?.(changed);
    const target = this.pendingFocus;
    if (!target || !this.editable) return;
    this.pendingFocus = null;
    const input = this.renderRoot.querySelector<HTMLInputElement>(`input[data-row="${target.row}"][data-column="${target.column}"]`);
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }

  private onCellInput(row: number, column: number, event: Event) {
    this.commitGrid(setCell(this.grid, row, column, (event.target as HTMLInputElement).value));
  }

  private onCellPaste(row: number, column: number, event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!isCellBlock(text)) return; // one cell's text: the input pastes it itself
    event.preventDefault();
    const { grid, end } = pasteCells(this.grid, row, column, readTsv(text));
    this.commitGrid(grid, end);
  }

  private onCellKeydown(row: number, column: number, event: KeyboardEvent) {
    const grid = this.grid;
    const last = { row: grid.length - 1, column: grid[0].length - 1 };
    const input = event.target as HTMLInputElement;
    const move = (r: number, c: number) => { event.preventDefault(); this.focusCell(r, c); };
    switch (event.key) {
      case 'Tab':
        if (event.shiftKey) {
          if (column > 0) move(row, column - 1);
          else if (row > 0) move(row - 1, last.column);
          return; // Shift+Tab on the first heading leaves the table
        }
        if (column < last.column) move(row, column + 1);
        else if (row < last.row) move(row + 1, 0);
        else { event.preventDefault(); this.commitGrid(addRow(grid), { row: row + 1, column: 0 }); }
        return;
      case 'Enter':
        if (row < last.row) move(row + 1, column);
        else { event.preventDefault(); this.commitGrid(addRow(grid), { row: row + 1, column }); }
        return;
      case 'ArrowDown': if (row < last.row) move(row + 1, column); return;
      case 'ArrowUp': if (row > 0) move(row - 1, column); return;
      case 'ArrowLeft':
        if (column > 0 && input.selectionStart === 0 && input.selectionEnd === 0) move(row, column - 1);
        return;
      case 'ArrowRight':
        if (column < last.column && input.selectionStart === input.value.length && input.selectionEnd === input.value.length) move(row, column + 1);
        return;
    }
  }

  private renderEditable() {
    const grid = this.grid;
    const width = grid[0].length;
    const l = this.labels;
    const input = (row: number, column: number, label: string) => html`<input type="text" class="cell-input" data-row=${row} data-column=${column}
      aria-label=${label} .value=${live(grid[row][column])}
      @input=${(e: Event) => this.onCellInput(row, column, e)}
      @keydown=${(e: KeyboardEvent) => this.onCellKeydown(row, column, e)}
      @paste=${(e: ClipboardEvent) => this.onCellPaste(row, column, e)}>`;
    return html`
      <table class="editable">
        <thead>
          <tr>
            ${grid[0].map((_, column) => html`<th class="edit-heading">
              <div class="cell-box"><slot name="column-${column}"></slot>${input(0, column, l.heading(column))}
                <button type="button" class="remove remove-column" tabindex="-1" title=${l.removeColumn} aria-label="${l.removeColumn} (${column + 1})"
                  ?disabled=${width <= 1} @click=${() => this.commitGrid(removeColumn(grid, column))}>${toolIcon('lucide-trash-2')}</button></div>
            </th>`)}
            <th class="tools"><button type="button" class="add add-column" title=${l.addColumn} aria-label=${l.addColumn}
              @click=${() => this.commitGrid(addColumn(grid), { row: 0, column: width })}>${toolIcon('lucide-plus')}</button></th>
          </tr>
        </thead>
        <tbody>
          ${grid.slice(1).map((cells, i) => html`<tr>
            ${cells.map((_, column) => html`<td>
              <div class="cell-box">${column === 0 ? html`<slot name="row-${i}"></slot>` : ''}${input(i + 1, column, l.cell(i + 1, column))}</div>
            </td>`)}
            <td class="tools"><button type="button" class="remove remove-row" tabindex="-1" title=${l.removeRow} aria-label="${l.removeRow} (${i + 1})"
              ?disabled=${grid.length <= 2} @click=${() => this.commitGrid(removeRow(grid, i + 1))}>${toolIcon('lucide-trash-2')}</button></td>
          </tr>`)}
        </tbody>
        <tfoot>
          <tr><td class="tools" colspan=${width + 1}><button type="button" class="add add-row" title=${l.addRow} aria-label=${l.addRow}
            @click=${() => this.commitGrid(addRow(grid), { row: grid.length, column: 0 })}>${toolIcon('lucide-plus')}</button></td></tr>
        </tfoot>
      </table>
      <slot name="columns" hidden></slot>`;
  }

  private renderCellTemplate(template: HTMLTemplateElement, context: any) {
    const fragment = template.content.cloneNode(true) as DocumentFragment;

    // Helper to replace {{field}} in a string
    const replaceVars = (text: string) =>
      text.replace(/\{\{(.*?)\}\}/g, (_, key) => context[key.trim()] ?? '');

    // Replace in direct text nodes of the fragment
    fragment.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = replaceVars(node.textContent ?? '');
      }
    });

    // Replace in text nodes and attributes inside elements
    fragment.querySelectorAll('*').forEach(node => {
      // Replace in text nodes
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          child.textContent = replaceVars(child.textContent ?? '');
        }
      });
      // Replace in attributes
      Array.from(node.attributes ?? []).forEach(attr => {
        attr.value = replaceVars(attr.value);
      });
    });

    return html`${fragment}`;
  }

  static styles = css`
    /* The host defaulted to display:inline, so the block <table> inside it
       overflowed rather than being laid out by it — a table can't be sized,
       scrolled or margined predictably from a page that way. */
    :host {
      display: block;
      overflow-x: auto;
    }
    /* An editable table doesn't scroll itself: its cells' slotted controls (a colour picker) open
       popups that a scroller would clip. The page scrolls around it instead. */
    :host([editable]) {
      overflow: visible;
    }
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
    /* Only rows that actually do something get the affordance — a
       display-only table used to show a pointer cursor and a hover highlight
       that promised an interaction it didn't have. */
    tr.interactive:hover {
      background-color: var(--hover-color, #f9f9f9);
      cursor: pointer;
    }
    tr.interactive:focus-visible {
      outline: 2px solid var(--primary, #007bff);
      outline-offset: -2px;
    }
    tr.selected {
      background-color: var(--selected-color, #d3e4ff);
    }
    th.sortable { padding: 0; }
    button.sort {
      all: unset;
      box-sizing: border-box;
      display: flex;
      width: 100%;
      gap: 0.5em;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      font-weight: inherit;
    }
    button.sort:focus-visible {
      outline: 2px solid var(--primary, #007bff);
      outline-offset: -2px;
    }
    .sort-indicator { opacity: 0.4; font-size: 0.8em; }
    th[aria-sort="ascending"] .sort-indicator,
    th[aria-sort="descending"] .sort-indicator { opacity: 1; }
    /* Editable: cells are text boxes; minus shows on the heading's or row's hover/focus, + after the
       last column and under the last row. */
    table.editable th, table.editable td { padding: 0; }
    table.editable th { background-color: var(--juel-raised, #f4f4f4); }
    table.editable th, table.editable td:not(.tools) { border-color: var(--juel-border, #ddd); }
    .cell-box { display: flex; align-items: center; gap: 2px; position: relative; }
    .cell-box ::slotted(*) { flex: none; margin-left: 4px; }
    input.cell-input {
      flex: 1; min-width: 4em; box-sizing: border-box; width: 100%;
      border: 0; margin: 0; padding: 6px 8px; font: inherit; color: inherit; background: transparent;
    }
    th input.cell-input { font-weight: 600; }
    input.cell-input:focus { outline: 2px solid var(--juel-accent, var(--primary, #007bff)); outline-offset: -2px; }
    td.tools, th.tools { border: 0; background: none; width: 1%; white-space: nowrap; }
    tfoot td.tools { padding-top: 2px; }
    button.add, button.remove {
      font: inherit; line-height: 1; cursor: pointer; border-radius: var(--juel-radius-sm, 4px);
      border: 1px solid var(--juel-border, #ccc); background: var(--juel-surface, #fff); color: var(--juel-text, inherit);
      min-width: 1.6em; min-height: 1.6em; padding: 0 4px;
    }
    button.add:hover, button.remove:hover { background: var(--juel-hover, #f0f0f0); }
    button.add:focus-visible, button.remove:focus-visible { outline: 2px solid var(--juel-accent, #007bff); outline-offset: 1px; }
    button.add { color: var(--juel-add, #1f7a35); }
    button.add .tool-icon, button.remove .tool-icon { display: inline-block; width: 14px; height: 14px; vertical-align: -2px; background: currentColor;
      -webkit-mask: var(--icon) center / contain no-repeat; mask: var(--icon) center / contain no-repeat; }
    button.remove { visibility: hidden; }
    button.remove:hover { color: var(--juel-danger, #b42318); }
    button.remove:disabled { display: none; }
    th.edit-heading:hover button.remove, th.edit-heading:focus-within button.remove,
    tr:hover button.remove-row, tr:focus-within button.remove-row { visibility: visible; }
    th.edit-heading button.remove-column { margin-right: 4px; }
    td.empty {
      text-align: center;
      color: var(--secondary, #6c757d);
      padding: 1.5em 8px;
    }
  `;

  render() {
    if (this.editable) return this.renderEditable();
    const hasCustomColumns = this.columns && this.columns.length > 0;
    // Allow columns without a field property (unbound columns)
    const columns = hasCustomColumns
      ? this.columns!.map(el => el.field || '') // Keep empty string for unbound columns
      : this.data.length > 0 ? Object.keys(this.data[0]) : [];
    const interactive = this.interactive;
    // Keep the roving tab stop inside the table when rows come and go.
    const roving = Math.max(0, Math.min(this.focusedRow, this.data.length - 1));
    // Indices into `data` in display order; `position` below is a row's place on screen.
    const order = this.displayOrder();
    const span = Math.max(1, columns.length + (this.selection === SelectionMode.Check ? 1 : 0));

    const cell = (row: Record<string, any>, index: number, field: string, content: unknown) => html`
      <td
        @click=${(event: Event) => {
          if (this.selection !== SelectionMode.Check && this.selection !== SelectionMode.None) {
            this.handleRowClick(row, index, event);
          }
          this.handleCellClick(row, field, event);
          if (interactive) { this.focusedRow = order.indexOf(index); this.activateRow(row, index); }
        }}
      >${content}</td>`;

    return html`
      <table>
        <thead>
          <tr>
            ${this.selection === SelectionMode.Check ? html`<th></th>` : ''}
            ${hasCustomColumns
              ? this.columns!.map(col => this.renderHeader(col.field, col.header || col.field || '', col))
              : columns.map(col => this.renderHeader(col, col))}
          </tr>
        </thead>
        <tbody>
          ${order.length === 0 ? html`
            <tr class="empty-row"><td class="empty" colspan=${span}><slot name="empty">${this.emptyText}</slot></td></tr>
          ` : ''}
          ${order.map((index, position) => {
            const row = this.data[index];
            return html`
            <tr
              class="${this.selectedRows.has(index) ? 'selected' : ''} ${interactive ? 'interactive' : ''}"
              tabindex=${ifDefined(interactive ? (position === roving ? 0 : -1) : undefined)}
              aria-selected=${ifDefined(this.selection === SelectionMode.None ? undefined : this.selectedRows.has(index))}
              @focus=${() => { if (interactive) this.focusedRow = position; }}
              @keydown=${(event: KeyboardEvent) => { if (interactive) this.handleRowKeydown(row, index, position, event); }}
            >
              ${this.selection === SelectionMode.Check ? html`
                <td>
                  <input
                    type="checkbox"
                    .checked=${this.selectedRows.has(index)}
                    @change=${(event: Event) => this.handleCheckboxChange(index, event)}
                  />
                </td>
              ` : ''}
              ${hasCustomColumns
                ? this.columns!.map(columnEl => {
                    const template = columnEl.template;
                    const field = columnEl.field;
                    return cell(row, index, field, template
                      ? this.renderCellTemplate(template, row)
                      : (field ? row[field] : ''));
                  })
                : columns.map(col => cell(row, index, col, row[col]))
              }
            </tr>
          `;
          })}
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
  /** Sort by this column (see juel-table). */
  @property({ type: Boolean }) sortable = false;
  /** How to order this column's values; the default is compareCells. */
  @property({ attribute: false }) compare: CellCompare | null = null;

    @queryAssignedElements({ flatten: true })
  private _assignedElements?: HTMLElement[];

  get template(): HTMLTemplateElement | null {
    if (!this._assignedElements) return null;
    return this._assignedElements.find(
      el => el instanceof HTMLTemplateElement
    ) as HTMLTemplateElement | null;
  }

  render() {
    return html`<slot></slot>`;
  }
}
