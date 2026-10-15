// The file manager's pure parts: selection rules and formatting. The
// component itself is tested in Chrome (tests/e2e/file-manager.spec.ts).
import { Selection } from '../../src/Files/FileManager/Selection';
import { formatDate, formatItemSize, formatSize } from '../../src/Files/FileManager/Format';
import { FileRecord } from '../../src/Files/Storage/IFileStorage';

const items = ['a', 'b', 'c', 'd', 'e'];
const make = (mode: 'multiple' | 'single' | 'none' = 'multiple') => {
    const s = new Selection(mode);
    s.setItems(items);
    return s;
};

describe('Selection', () => {
    test('click selects one; Ctrl toggles; Shift selects a range from the anchor', () => {
        const s = make();
        s.click('b');
        expect(s.paths).toEqual(['b']);
        s.click('d', { toggle: true });
        expect(s.paths).toEqual(['b', 'd']);
        s.click('b', { toggle: true });
        expect(s.paths).toEqual(['d']);
        s.click('d', { range: true }); // the anchor is b, the last one Ctrl-clicked
        expect(s.paths).toEqual(['b', 'c', 'd']);
        s.click('a', { range: true, toggle: true });
        expect(s.paths).toEqual(['a', 'b', 'c', 'd']);
        s.click('e');
        expect(s.paths).toEqual(['e']);
    });

    test('checkboxes add and remove without clearing', () => {
        const s = make();
        s.toggle('a');
        s.toggle('c');
        expect(s.paths).toEqual(['a', 'c']);
        s.toggle('a');
        expect(s.paths).toEqual(['c']);
    });

    test('arrows move and select; Shift extends; Ctrl only moves the focus', () => {
        const s = make();
        expect(s.move(1)).toBe('a');
        expect(s.paths).toEqual(['a']);
        s.move(1, { extend: true });
        s.move(1, { extend: true });
        expect(s.paths).toEqual(['a', 'b', 'c']);
        s.move(-1, { extend: true });
        expect(s.paths).toEqual(['a', 'b']);
        s.move(1, { keep: true });
        expect([s.focus, s.paths]).toEqual(['c', ['a', 'b']]);
        s.move('last');
        expect(s.paths).toEqual(['e']);
        s.move(10);
        expect(s.focus).toBe('e');
        s.move('first', { extend: true });
        expect(s.paths).toEqual(items);
    });

    test('all, clear, and a changed list keeps what is still there', () => {
        const s = make();
        s.all();
        expect(s.size).toBe(5);
        s.setItems(['a', 'c', 'x']);
        expect(s.paths).toEqual(['a', 'c']);
        s.clear();
        expect(s.size).toBe(0);
    });

    test('single and none', () => {
        const single = make('single');
        single.click('a');
        single.click('b', { toggle: true });
        single.toggle('c');
        expect(single.paths).toEqual(['c']);
        single.all();
        expect(single.paths).toEqual(['c']);
        const none = make('none');
        none.click('a');
        none.toggle('b');
        expect([none.size, none.focus]).toEqual([0, 'b']);
    });

    test('set selects only paths that are listed', () => {
        const s = make();
        s.set(['b', 'zz', 'd']);
        expect([s.paths, s.focus]).toEqual([['b', 'd'], 'd']);
    });
});

describe('Format', () => {
    test('sizes', () => {
        expect(formatSize(0)).toBe('0 bytes');
        expect(formatSize(1)).toBe('1 byte');
        expect(formatSize(1023)).toBe('1023 bytes');
        expect(formatSize(19046)).toBe('18.6 KB');
        expect(formatSize(6239027)).toBe('5.95 MB');
        expect(formatSize(1536)).toBe('1.5 KB');
        expect(formatSize(300 * 1024 * 1024)).toBe('300 MB');
        const folder = { kind: 'folder', items: 1 } as FileRecord;
        expect(formatItemSize(folder)).toBe('1 item');
        expect(formatItemSize({ ...folder, items: 4 })).toBe('4 items');
    });

    test('dates: time today, day this year, full date before', () => {
        const now = new Date(2026, 9, 15, 18, 0);
        expect(formatDate(new Date(2026, 9, 15, 9, 5).getTime(), now, 'en-GB')).toBe('09:05');
        expect(formatDate(new Date(2026, 1, 9).getTime(), now, 'en-US')).toBe('February 9');
        expect(formatDate(new Date(2024, 8, 13).getTime(), now, 'en-US')).toBe('September 13, 2024');
    });
});
