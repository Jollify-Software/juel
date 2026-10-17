// The viewer's table preview (src/Files/FileManager/Table.ts).
import { MaxTableRows, parseCsvLine, tableOf } from '../../src/Files/FileManager/Table';

describe('tableOf', () => {
    test('a CSV: the header and rows, quoted cells kept whole', () => {
        expect(tableOf('sales.csv', 'Month,Sales\r\nJan,"1,200"\nFeb,"say ""hi"""\n\n')).toEqual([
            ['Month', 'Sales'], ['Jan', '1,200'], ['Feb', 'say "hi"'],
        ]);
    });
    test('a long CSV shows the header and the first rows', () => {
        const text = ['n', ...Array.from({ length: 50 }, (_, i) => String(i))].join('\n');
        expect(tableOf('long.CSV', text)).toHaveLength(MaxTableRows + 1);
    });
    test('a JSON array of objects: every key, blanks where one is missing', () => {
        expect(tableOf('q.json', '[{"a":1,"b":true},{"a":2,"c":"x"}]')).toEqual([
            ['a', 'b', 'c'], ['1', 'true', ''], ['2', '', 'x'],
        ]);
    });
    test('anything else is not a table', () => {
        expect(tableOf('q.json', '{"a":1}')).toBeUndefined();
        expect(tableOf('q.json', '[1,2]')).toBeUndefined();
        expect(tableOf('q.json', '[{"a":')).toBeUndefined();
        expect(tableOf('empty.csv', '\n\n')).toBeUndefined();
        expect(tableOf('notes.md', 'a,b\n1,2')).toBeUndefined();
    });
    test('parseCsvLine', () => {
        expect(parseCsvLine('a,,"b,c"')).toEqual(['a', '', 'b,c']);
    });
});
