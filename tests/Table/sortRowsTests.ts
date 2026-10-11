import { compareCells, sortRows } from '../../src/Data/Table/sortRows';

const rows = [
    { name: 'item 10', n: 10, when: new Date(2026, 0, 3) },
    { name: 'Item 2', n: '2', when: new Date(2026, 0, 1) },
    { name: null, n: null, when: null },
    { name: 'item 1', n: 1.5, when: new Date(2026, 0, 2) },
];

describe('sortRows', () => {
    it('leaves the order alone without a field or direction', () => {
        expect(sortRows(rows, null, 'asc')).toEqual([0, 1, 2, 3]);
        expect(sortRows(rows, 'name', null)).toEqual([0, 1, 2, 3]);
    });

    it('sorts text naturally and ignoring case, empties last', () => {
        expect(sortRows(rows, 'name', 'asc')).toEqual([3, 1, 0, 2]);
        expect(sortRows(rows, 'name', 'desc')).toEqual([0, 1, 3, 2]);
    });

    it('sorts numbers and numeric strings by value', () => {
        expect(sortRows(rows, 'n', 'asc')).toEqual([3, 1, 0, 2]);
        expect(sortRows(rows, 'n', 'desc')).toEqual([0, 1, 3, 2]);
    });

    it('sorts dates by time', () => {
        expect(sortRows(rows, 'when', 'asc')).toEqual([1, 3, 0, 2]);
    });

    it('is stable for equal values', () => {
        const same = [{ k: 'a', id: 0 }, { k: 'b', id: 1 }, { k: 'a', id: 2 }, { k: 'A', id: 3 }];
        expect(sortRows(same, 'k', 'asc')).toEqual([0, 2, 3, 1]);
        expect(sortRows(same, 'k', 'desc')).toEqual([1, 0, 2, 3]);
    });

    it('takes a custom compare', () => {
        const byLength = (a: unknown, b: unknown) => String(a).length - String(b).length;
        expect(sortRows([{ s: 'ccc' }, { s: 'a' }, { s: 'bb' }], 's', 'asc', byLength)).toEqual([1, 2, 0]);
    });

    it('compareCells mixes numbers and text without throwing', () => {
        expect(compareCells(2, 10)).toBeLessThan(0);
        expect(compareCells('abc', 5)).not.toBeNaN();
    });
});
