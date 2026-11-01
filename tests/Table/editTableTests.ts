import { addColumn, addRow, isCellBlock, normaliseGrid, pasteCells, readTsv, removeColumn, removeRow, setCell } from '../../src/Data/Table/editTable';

const grid = () => [['Quarter', 'Sales'], ['Q1', '12'], ['Q2', '18']];

describe('editable juel-table model', () => {
    it('normalises ragged, short and empty values', () => {
        expect(normaliseGrid([['a', 'b', 'c'], ['1']])).toEqual([['a', 'b', 'c'], ['1', '', '']]);
        expect(normaliseGrid([['a']])).toEqual([['a'], ['']]);
        expect(normaliseGrid(null)).toEqual([[''], ['']]);
        expect(normaliseGrid([[1, null, undefined]])).toEqual([['1', '', ''], ['', '', '']]);
    });

    it('sets a cell without touching the input, growing to fit', () => {
        const g = grid();
        expect(setCell(g, 1, 1, '13')[1]).toEqual(['Q1', '13']);
        expect(g[1][1]).toBe('12');
        expect(setCell(g, 3, 2, 'x')).toEqual([['Quarter', 'Sales', ''], ['Q1', '12', ''], ['Q2', '18', ''], ['', '', 'x']]);
    });

    it('adds rows and columns at the end or at a place', () => {
        expect(addRow(grid())).toEqual([...grid(), ['', '']]);
        expect(addRow(grid(), 1)[1]).toEqual(['', '']);
        expect(addRow(grid(), 0)[0]).toEqual(['Quarter', 'Sales']);
        expect(addColumn(grid())).toEqual([['Quarter', 'Sales', ''], ['Q1', '12', ''], ['Q2', '18', '']]);
        expect(addColumn(grid(), 1)[0]).toEqual(['Quarter', '', 'Sales']);
    });

    it('removes rows and columns, never the header, the last body row or the last column', () => {
        expect(removeRow(grid(), 1)).toEqual([['Quarter', 'Sales'], ['Q2', '18']]);
        expect(removeRow(grid(), 0)).toEqual(grid());
        expect(removeRow([['a'], ['b']], 1)).toEqual([['a'], ['b']]);
        expect(removeColumn(grid(), 0)).toEqual([['Sales'], ['12'], ['18']]);
        expect(removeColumn([['a'], ['b']], 0)).toEqual([['a'], ['b']]);
        expect(removeColumn(grid(), 5)).toEqual(grid());
    });

    it('reads pasted TSV: CRLF, a trailing line break, quoted cells', () => {
        expect(readTsv('a\tb\r\n1\t2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
        expect(readTsv('one cell')).toEqual([['one cell']]);
        expect(readTsv('"a\tb"\t"say ""hi"""\n"two\nlines"\tx')).toEqual([['a\tb', 'say "hi"'], ['two\nlines', 'x']]);
        expect(readTsv('x\t\ty')).toEqual([['x', '', 'y']]);
    });

    it('tells a block of cells from one cell of text', () => {
        expect(isCellBlock('hello')).toBe(false);
        expect(isCellBlock('hello\n')).toBe(false);
        expect(isCellBlock('a\tb')).toBe(true);
        expect(isCellBlock('a\nb')).toBe(true);
    });

    it('pastes a block across cells, growing the grid, and says where it ended', () => {
        const { grid: g, end } = pasteCells(grid(), 2, 1, [['20', 'a'], ['30', 'b']]);
        expect(g).toEqual([['Quarter', 'Sales', ''], ['Q1', '12', ''], ['Q2', '20', 'a'], ['', '30', 'b']]);
        expect(end).toEqual({ row: 3, column: 2 });
    });
});
