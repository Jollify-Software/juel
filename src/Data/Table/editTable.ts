// The editable juel-table's model (`<juel-table editable>`): a grid of strings, the first row the
// column headers. Pure functions, each returning a new grid, so the component stays a thin view
// and the rules (never fewer than one body row or one column, paste grows the grid) are unit-tested.

/** An editable table's value: rows of cells, the first row being the headers. */
export type TableGrid = string[][];

/**
 * A grid every row of which is as wide as the widest (missing cells are ''), with a header row and
 * at least one body row and one column. `null`/`undefined` and non-string cells are tolerated.
 */
export function normaliseGrid(value: readonly (readonly unknown[])[] | null | undefined): TableGrid {
    const rows = (value ?? []).map(row => (row ?? []).map(cell => cell === null || cell === undefined ? '' : String(cell)));
    const width = Math.max(1, ...rows.map(r => r.length));
    while (rows.length < 2) rows.push([]);
    return rows.map(r => r.concat(Array(width - r.length).fill('')));
}

/** The grid with cell (`row`, `column`) set to `text` (row 0 is the header). Out of range: grown to fit. */
export function setCell(grid: TableGrid, row: number, column: number, text: string): TableGrid {
    const next = grid.map(r => [...r]);
    while (next.length <= row) next.push(Array(next[0]?.length ?? 1).fill(''));
    const width = Math.max(next[0]?.length ?? 1, column + 1);
    const out = next.map(r => r.concat(Array(width - r.length).fill('')));
    out[row][column] = text;
    return out;
}

/** The grid with an empty body row inserted before `at` (default: at the end). `at` is a grid row (≥ 1). */
export function addRow(grid: TableGrid, at = grid.length): TableGrid {
    const width = grid[0]?.length ?? 1;
    const index = Math.max(1, Math.min(at, grid.length));
    return [...grid.slice(0, index).map(r => [...r]), Array(width).fill(''), ...grid.slice(index).map(r => [...r])];
}

/** The grid with an empty column inserted before `at` (default: at the end). */
export function addColumn(grid: TableGrid, at?: number): TableGrid {
    return grid.map(r => {
        const index = at === undefined ? r.length : Math.max(0, Math.min(at, r.length));
        return [...r.slice(0, index), '', ...r.slice(index)];
    });
}

/** The grid without body row `row` (a grid row, ≥ 1); unchanged for the header or the last body row. */
export function removeRow(grid: TableGrid, row: number): TableGrid {
    if (row < 1 || row >= grid.length || grid.length <= 2) return grid;
    return grid.filter((_, i) => i !== row).map(r => [...r]);
}

/** The grid without column `column`; unchanged when it's the only column or out of range. */
export function removeColumn(grid: TableGrid, column: number): TableGrid {
    const width = grid[0]?.length ?? 0;
    if (width <= 1 || column < 0 || column >= width) return grid;
    return grid.map(r => r.filter((_, i) => i !== column));
}

/**
 * Pasted text as cells: lines (CRLF, CR or LF) of tab-separated cells, a final line break ignored
 * (spreadsheets add one). Quoted cells (Excel's, for a cell holding a tab or line break) are read too.
 */
export function readTsv(text: string): string[][] {
    const rows: string[][] = [[]];
    let cell = '';
    let quoted = false;
    let atStart = true;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cell += ch;
            continue;
        }
        if (ch === '"' && atStart) { quoted = true; atStart = false; continue; }
        if (ch === '\t') { rows[rows.length - 1].push(cell); cell = ''; atStart = true; continue; }
        if (ch === '\r' || ch === '\n') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            rows[rows.length - 1].push(cell);
            cell = '';
            atStart = true;
            rows.push([]);
            continue;
        }
        cell += ch;
        atStart = false;
    }
    rows[rows.length - 1].push(cell);
    // A trailing line break leaves one empty last row: drop it.
    const last = rows[rows.length - 1];
    if (rows.length > 1 && last.length === 1 && last[0] === '') rows.pop();
    return rows;
}

/** Whether pasted text is a block of cells (it has a tab or a line break) rather than one cell's text. */
export function isCellBlock(text: string): boolean {
    return /[\t\r\n]/.test(text.replace(/(\r\n|\r|\n)$/, ''));
}

/**
 * The grid with `cells` written from (`row`, `column`) right and down, growing it (rows and columns)
 * to fit. Returns the grid and the last cell written, so the caller can put the cursor there.
 */
export function pasteCells(grid: TableGrid, row: number, column: number, cells: string[][]): { grid: TableGrid; end: { row: number; column: number } } {
    let next = grid.map(r => [...r]);
    cells.forEach((line, dr) => line.forEach((text, dc) => { next = setCell(next, row + dr, column + dc, text); }));
    const lastRow = row + Math.max(0, cells.length - 1);
    const lastColumn = column + Math.max(0, (cells[cells.length - 1]?.length ?? 1) - 1);
    return { grid: next, end: { row: lastRow, column: lastColumn } };
}
