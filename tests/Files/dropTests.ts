// Reading a desktop drop (src/Files/FileManager/Drop.ts), with fake
// FileSystemEntry trees: Chrome's real entries can't be made in a test.
import { hasFiles, readDrop } from '../../src/Files/FileManager/Drop';

const file = (name: string) => ({
    name, isFile: true, isDirectory: false,
    file: (resolve: (f: File) => void) => resolve(new File([name], name)),
});

/** A folder whose reader hands out its children `batch` at a time, then `[]`, as Chrome does. */
const folder = (name: string, children: object[], batch = 100) => ({
    name, isFile: false, isDirectory: true,
    createReader: () => {
        let at = 0;
        return {
            readEntries: (resolve: (e: object[]) => void) => {
                const out = children.slice(at, at + batch);
                at += out.length;
                resolve(out);
            },
        };
    },
});

const transfer = (entries: object[], files: File[] = []) => ({
    types: ['Files'],
    items: entries.map(e => ({ kind: 'file', webkitGetAsEntry: () => e })),
    files,
}) as unknown as DataTransfer;

describe('readDrop', () => {
    test('keeps folders, with their paths; an empty folder comes through without a file', async () => {
        const items = await readDrop(transfer([
            folder('Trip', [file('a.png'), folder('Day 2', [file('b.png')]), folder('Empty', [])]),
            file('notes.md'),
        ]));
        expect(items.map(i => [i.relative, i.file?.name])).toEqual([
            ['Trip/a.png', 'a.png'],
            ['Trip/Day 2/b.png', 'b.png'],
            ['Trip/Empty', undefined],
            ['notes.md', 'notes.md'],
        ]);
    });

    test('reads a folder to the end, past one batch of entries', async () => {
        const many = Array.from({ length: 250 }, (_, i) => file(`f${i}.txt`));
        const items = await readDrop(transfer([folder('Big', many)]));
        expect(items).toHaveLength(250);
        expect(items[249].relative).toBe('Big/f249.txt');
    });

    test('without folders, or without entries, it is the files', async () => {
        const files = [new File(['x'], 'x.txt'), new File(['y'], 'y.txt')];
        expect((await readDrop(transfer([], files))).map(i => i.relative)).toEqual(['x.txt', 'y.txt']);
        expect((await readDrop(transfer([file('x.txt'), file('y.txt')], files))).map(i => i.file)).toEqual(files);
    });

    test('hasFiles is only for drags that carry files', () => {
        expect(hasFiles(transfer([]))).toBe(true);
        expect(hasFiles({ types: ['text/plain'] } as unknown as DataTransfer)).toBe(false);
        expect(hasFiles(null)).toBe(false);
    });
});
