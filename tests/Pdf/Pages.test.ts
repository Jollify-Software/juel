import { parsePages } from '../../src/Display/Pdf/Pages';

describe('parsePages', () => {
    test('a range, single pages and lists', () => {
        expect(parsePages('4-6')).toEqual([4, 5, 6]);
        expect(parsePages('2, 5, 9-10')).toEqual([2, 5, 9, 10]);
        expect(parsePages(' 3 ')).toEqual([3]);
    });
    test('a range backwards goes backwards', () => {
        expect(parsePages('6-4')).toEqual([6, 5, 4]);
    });
    test('pages past the end, page 0 and words are left out', () => {
        expect(parsePages('2-5', 3)).toEqual([2, 3]);
        expect(parsePages('0, 1, x, 2-')).toEqual([1]);
        expect(parsePages('')).toEqual([]);
        expect(parsePages(null)).toEqual([]);
    });
    test('a huge range stops at 1000 pages', () => {
        expect(parsePages('1-999999999')).toHaveLength(1000);
        expect(parsePages('999999999-1', 3)).toEqual([3, 2, 1]);
    });
});
