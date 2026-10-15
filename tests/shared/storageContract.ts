// What every IFileStorage must do. Plain functions with their own asserts, so
// the same cases run under Jest (MemoryFileStorage) and in a real browser
// (BrowserFileStorage, tests/browser/files-contract.ts), and later against a
// server storage.
import { FileChange, FileStorageError, IFileStorage } from '../../src/Files/Storage/IFileStorage';

export interface ContractCase {
    name: string;
    run(storage: IFileStorage): Promise<void>;
}

class ContractFailure extends Error {}

function fail(message: string): never {
    throw new ContractFailure(message);
}

function equal(actual: unknown, expected: unknown, what = 'value') {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) fail(`${what}: expected ${e}, got ${a}`);
}

function ok(value: unknown, what: string) {
    if (!value) fail(what);
}

async function rejects(work: Promise<unknown>, code: string, what: string) {
    try {
        await work;
    } catch (error) {
        if (!(error instanceof FileStorageError)) fail(`${what}: threw ${error}, not a FileStorageError`);
        if ((error as FileStorageError).code !== code) fail(`${what}: code ${(error as FileStorageError).code}, expected ${code}`);
        return;
    }
    fail(`${what}: didn't throw`);
}

const text = (s: string, type = '') => new Blob([s], { type });
const names = async (storage: IFileStorage, folder: string) => (await storage.list(folder)).items.map(i => i.name);

export const storageContract: ContractCase[] = [
    {
        name: 'writes files, making their folders, and lists a folder: folders first',
        async run(s) {
            const w = await s.write('images/a.png', text('a', 'image/png'));
            equal(w.outcome, 'added', 'outcome');
            equal([w.record.path, w.record.name, w.record.kind, w.record.size, w.record.type], ['images/a.png', 'a.png', 'file', 1, 'image/png'], 'record');
            ok(w.record.id, 'a record has an id');
            await s.write('./images/sub/b.txt', text('bb'));
            await s.write('c.css', text('c'));
            equal(await names(s, ''), ['images', 'c.css'], 'root');
            equal(await names(s, 'images'), ['sub', 'a.png'], 'images');
            const folder = await s.stat('images');
            equal([folder?.kind, folder?.items, folder?.size, folder?.type], ['folder', 2, 0, ''], 'folder record');
            ok(folder?.id, 'a folder has an id');
            equal((await s.stat('images/sub/b.txt'))?.type, 'text/plain', 'type from the extension when the Blob has none');
            equal(await (await s.read('images/a.png')).text(), 'a', 'read');
            equal(await s.stat('nothing.png'), undefined, 'stat of nothing');
            await rejects(s.read('nothing.png'), 'not-found', 'read of nothing');
            await rejects(s.list('nowhere'), 'not-found', 'list of nothing');
        },
    },
    {
        name: 'the same bytes again write nothing; different bytes replace, keep both, or fail',
        async run(s) {
            const first = await s.write('a.png', text('one'));
            equal((await s.write('a.png', text('one'))).outcome, 'same', 'same bytes');
            const both = await s.write('a.png', text('two'), { onConflict: 'keep-both' });
            equal([both.outcome, both.record.path], ['renamed', 'a (2).png'], 'keep both');
            equal((await s.write('a.png', text('three'), { onConflict: 'keep-both' })).record.path, 'a (3).png', 'keep both again');
            await rejects(s.write('a.png', text('four'), { onConflict: 'fail' }), 'exists', 'fail');
            const replaced = await s.write('a.png', text('four'));
            equal(replaced.outcome, 'replaced', 'replace (the default)');
            equal(replaced.record.id, first.record.id, 'a replaced file keeps its id');
            equal(await (await s.read('a.png')).text(), 'four', 'replaced bytes');
            equal(await s.uniquePath('a.png'), 'a (4).png', 'uniquePath');
            equal(await s.uniquePath('free.png'), 'free.png', 'uniquePath of a free path');
        },
    },
    {
        name: 'folders: made with their parents, kept when empty, never on top of a file',
        async run(s) {
            const made = await s.makeFolder('photos/2026');
            equal([made.path, made.kind, made.items], ['photos/2026', 'folder', 0], 'made');
            equal((await s.makeFolder('photos/2026')).id, made.id, 'making it again changes nothing');
            equal(await names(s, 'photos'), ['2026'], 'parent made too');
            await s.write('photos/a.png', text('a'));
            await s.remove('photos/a.png');
            equal(await names(s, 'photos'), ['2026'], 'a folder stays when its last file goes');
            await s.write('b.png', text('b'));
            await rejects(s.makeFolder('b.png'), 'exists', 'a folder where a file is');
            await rejects(s.write('photos', text('x')), 'exists', 'a file where a folder is');
            await rejects(s.write('b.png/c.png', text('x')), 'exists', 'a file under a file');
        },
    },
    {
        name: 'moves and renames files and folders, keeping ids, never overwriting',
        async run(s) {
            const x = (await s.write('a/x.png', text('x'))).record;
            await s.write('a/b/y.png', text('y'));
            await s.makeFolder('a/empty');
            await s.write('z.png', text('z'));
            const folderId = (await s.stat('a'))!.id;
            const moves = await s.move('a', 'pics');
            equal(moves.map(m => `${m.from}>${m.to}`).sort(), ['a/b/y.png>pics/b/y.png', 'a/b>pics/b', 'a/empty>pics/empty', 'a/x.png>pics/x.png', 'a>pics'].sort(), 'moves');
            equal(await names(s, ''), ['pics', 'z.png'], 'root after');
            equal(await names(s, 'pics'), ['b', 'empty', 'x.png'], 'pics');
            equal((await s.stat('pics'))!.id, folderId, 'a moved folder keeps its id');
            equal((await s.stat('pics/x.png'))!.id, x.id, 'a moved file keeps its id');
            equal(await (await s.read('pics/b/y.png')).text(), 'y', 'bytes moved');
            equal(await s.stat('a'), undefined, 'the old folder has gone');
            equal(await s.move('z.png', 'z.png'), [], 'onto itself: nothing');
            await s.move('z.png', 'pics/renamed.png');
            equal(await names(s, 'pics'), ['b', 'empty', 'renamed.png', 'x.png'], 'renamed into a folder');
            await rejects(s.move('pics/x.png', 'pics/renamed.png'), 'exists', 'onto a file');
            await rejects(s.move('pics', 'pics/inner'), 'invalid-path', 'into itself');
            await rejects(s.move('nothing', 'else'), 'not-found', 'nothing to move');
        },
    },
    {
        name: 'copies files and folders, with new ids',
        async run(s) {
            if (!s.capabilities.copy) return;
            const a = (await s.write('a/x.png', text('x'))).record;
            await s.makeFolder('a/empty');
            const copies = await s.copy('a', 'b');
            equal(copies.map(c => c.to).sort(), ['b', 'b/empty', 'b/x.png'], 'copies');
            equal(await names(s, 'b'), ['empty', 'x.png'], 'copied');
            equal(await names(s, 'a'), ['empty', 'x.png'], 'original kept');
            ok((await s.stat('b/x.png'))!.id !== a.id, 'a copy has its own id');
            equal(await (await s.read('b/x.png')).text(), 'x', 'bytes copied');
            await s.copy('a/x.png', 'x copy.png');
            equal(await (await s.read('x copy.png')).text(), 'x', 'a file copied');
            await rejects(s.copy('a', 'b'), 'exists', 'onto an existing folder');
        },
    },
    {
        name: 'removes a file, or a folder and everything in it',
        async run(s) {
            await s.write('a/x.png', text('x'));
            await s.write('a/b/y.png', text('y'));
            await s.write('z.png', text('z'));
            equal((await s.remove('a')).sort(), ['a/b/y.png', 'a/x.png'], 'removed files');
            equal(await names(s, ''), ['z.png'], 'left');
            await rejects(s.read('a/x.png'), 'not-found', 'gone');
            await rejects(s.remove('a'), 'not-found', 'removing it again');
            await s.write('a/x.png', text('again'));
            equal(await (await s.read('a/x.png')).text(), 'again', 'the name is free again');
        },
    },
    {
        name: 'lists deep, searched, filtered, sorted and paged',
        async run(s) {
            await s.write('photos/harbour.jpg', text('1234', 'image/jpeg'));
            await s.write('photos/2026/Harbour night.png', text('12', 'image/png'));
            await s.write('data/sales.csv', text('1'));
            await s.write('slide 10.md', text('123'));
            await s.write('slide 2.md', text('12345'));
            equal((await s.list('', { deep: true, search: 'harbour' })).items.map(i => i.path), ['photos/2026/Harbour night.png', 'photos/harbour.jpg'], 'search');
            equal((await s.list('', { deep: true, accept: ['image/*'] })).items.filter(i => i.kind === 'file').map(i => i.name), ['Harbour night.png', 'harbour.jpg'], 'accept image/*');
            equal((await s.list('data', { accept: ['.csv'] })).items.map(i => i.name), ['sales.csv'], 'accept .csv');
            equal(await names(s, ''), ['data', 'photos', 'slide 2.md', 'slide 10.md'], 'natural name order, folders first');
            equal((await s.list('', { sort: 'size', descending: true })).items.filter(i => i.kind === 'file').map(i => i.name), ['slide 2.md', 'slide 10.md'], 'by size, largest first');
            const first = await s.list('', { limit: 3 });
            equal(first.items.map(i => i.name), ['data', 'photos', 'slide 2.md'], 'page 1');
            ok(first.next, 'page 1 has a next');
            const second = await s.list('', { limit: 3, cursor: first.next });
            equal(second.items.map(i => i.name), ['slide 10.md'], 'page 2');
            equal(second.next, undefined, 'page 2 is the last');
        },
    },
    {
        name: 'rejects paths that cannot be stored',
        async run(s) {
            await rejects(s.write('../a.png', text('a')), 'invalid-path', '..');
            await rejects(s.write('a/ /b.png', text('a')), 'invalid-path', 'blank part');
            await rejects(s.write('a:b.png', text('a')), 'invalid-path', 'colon');
            await rejects(s.write('', text('a')), 'invalid-path', 'empty');
            await rejects(s.makeFolder('a|b'), 'invalid-path', 'pipe');
        },
    },
    {
        name: 'tells subscribers what changed, until they stop',
        async run(s) {
            const seen: string[] = [];
            const show = (c: FileChange) => c.kind === 'moved' ? `moved ${c.from}>${c.to}` : `${c.kind} ${c.path}${c.folder ? '/' : ''}`;
            const stop = s.subscribe(c => seen.push(show(c)));
            await s.write('a/x.png', text('x'));
            await s.write('a/x.png', text('y'));
            await s.move('a', 'b');
            await s.remove('b');
            stop();
            await s.write('after.png', text('z'));
            equal(seen, ['added a/', 'added a/x.png', 'changed a/x.png', 'moved a>b', 'removed b/'], 'changes');
        },
    },
];

/** Runs every case, each on a fresh storage; returns the failures. */
export async function runContract(make: () => Promise<IFileStorage>): Promise<{ name: string; error?: string }[]> {
    const results: { name: string; error?: string }[] = [];
    for (const c of storageContract) {
        try {
            await c.run(await make());
            results.push({ name: c.name });
        } catch (error) {
            results.push({ name: c.name, error: String((error as Error)?.message ?? error) });
        }
    }
    return results;
}
