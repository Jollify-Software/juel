/**
 * @jest-environment node
 */
// Node, not jsdom: it has Blob.stream/text, crypto.subtle and DecompressionStream.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { storageContract } from '../shared/storageContract';
import { MemoryBackend, MemoryFileStorage, MemoryIndex } from '../../src/Files/Storage/MemoryFileStorage';
import { LocalFileStorage } from '../../src/Files/Storage/LocalFileStorage';
import { FileStorageError } from '../../src/Files/Storage/IFileStorage';
import { accepts, checkPath, kindOf, normalise, uniquePath } from '../../src/Files/Storage/Paths';
import { hashOf, sha256 } from '../../src/Files/Storage/Hash';
import { crc32, readZip, writeZip, ZipError } from '../../src/Files/Zip/Zip';
import { unzipInto, zipFolder } from '../../src/Files/Zip/Transfer';

const text = (s: string, type = '') => new Blob([s], { type });

describe('IFileStorage contract: MemoryFileStorage', () => {
    for (const c of storageContract) test(c.name, () => c.run(new MemoryFileStorage()));
});

describe('LocalFileStorage', () => {
    test('open squares the index with the files, and gives older records ids', async () => {
        const backend = new MemoryBackend(), index = new MemoryIndex();
        backend.files.set('kept.png', text('k'));
        backend.files.set('photos/unindexed.png', text('u'));
        backend.dirs.add('empty');
        // Records as the Jollify app wrote them before ids: no id, no kind.
        await index.put({ path: 'kept.png', size: 1, type: 'image/png', added: 1, changed: 1, hash: 'h', width: 4, height: 3 });
        await index.put({ path: 'gone.png', size: 1, type: 'image/png', added: 1, changed: 1, hash: 'g' });
        const storage = new LocalFileStorage(backend, index);
        await storage.open();
        expect(storage.all().map(r => `${r.kind} ${r.path}`)).toEqual(['folder empty', 'file kept.png', 'folder photos', 'file photos/unindexed.png']);
        expect(index.records.has('gone.png')).toBe(false);
        const kept = storage.get('kept.png')!;
        expect(kept.hash).toBe('h'); // an indexed file isn't re-read
        expect(kept.meta).toEqual({ width: 4, height: 3 });
        expect(kept.id).toBeTruthy();
        expect(index.records.get('kept.png')!.id).toBe(kept.id); // the id is saved
        expect(index.records.get('photos')!.kind).toBe('folder');

        const reopened = new LocalFileStorage(backend, index);
        await reopened.open();
        expect(reopened.get('kept.png')!.id).toBe(kept.id);
        expect(reopened.get('photos')!.id).toBe(storage.get('photos')!.id);
    });

    test('describes media, and finds by hash and by name', async () => {
        const storage = new MemoryFileStorage({
            describe: async () => ({ width: 10, height: 5, thumbnail: text('thumb', 'image/webp') }),
        });
        await storage.write('brand/logo.png', text('1', 'image/png'));
        await storage.write('deep/er/logo.png', text('2', 'image/png'));
        expect(storage.capabilities.thumbnails).toBe(true);
        expect(storage.get('brand/logo.png')!.meta).toEqual({ width: 10, height: 5, hasThumbnail: true });
        expect(await (await storage.thumbnail('brand/logo.png'))!.text()).toBe('thumb');
        expect(storage.findByHash(await hashOf(text('2')))!.path).toBe('deep/er/logo.png');
        expect(storage.findByName('logo.png').map(r => r.path)).toEqual(['brand/logo.png', 'deep/er/logo.png']);
    });

    test('starts with the files and folders it is given', async () => {
        const storage = new MemoryFileStorage({ files: { 'a/b.txt': 'bee' }, folders: ['empty/inner'] });
        expect((await storage.list('', { deep: true })).items.map(i => i.path)).toEqual(['a', 'empty', 'empty/inner', 'a/b.txt']);
        expect((await storage.quota()).lasting).toBe(false);
    });
});

describe('hash', () => {
    test('the plain-JS SHA-256 matches Web Crypto', async () => {
        const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
        expect(hex(sha256(new Uint8Array()))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        expect(hex(sha256(new TextEncoder().encode('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
        for (const size of [55, 56, 63, 64, 65, 1000, 100_003]) {
            const bytes = new Uint8Array(size).map((_, i) => (i * 31 + 7) & 255);
            expect(hex(sha256(bytes))).toBe(await hashOf(new Blob([bytes])));
        }
    });
});

describe('paths', () => {
    test('normalise and check', () => {
        expect(normalise('./a\\b//c/')).toBe('a/b/c');
        expect(checkPath('/images/a.png')).toBe('images/a.png');
        expect(() => checkPath('../a.png')).toThrow(FileStorageError);
    });

    test('uniquePath counts on from an existing number', () => {
        const taken = new Set(['a.png', 'a (2).png', 'folder']);
        expect(uniquePath('a (2).png', p => taken.has(p))).toBe('a (3).png');
        expect(uniquePath('folder', p => taken.has(p))).toBe('folder (2)');
        expect(uniquePath('.hidden', p => p === '.hidden')).toBe('.hidden (2)');
    });

    test('kinds and accept lists', () => {
        const file = (p: string, type = '') => ({ kind: 'file' as const, path: p, type });
        expect(['a.png', 'a.mp4', 'a.mp3', 'a.woff2', 'a.csv', 'a.md', 'a.pdf', 'a.zip', 'a.bin'].map(p => kindOf(file(p))))
            .toEqual(['picture', 'video', 'sound', 'font', 'data', 'text', 'document', 'archive', 'other']);
        expect(accepts(['image/*'], file('a.PNG'))).toBe(true);
        expect(accepts(['.CSV'], file('data/sales.csv'))).toBe(true);
        expect(accepts(['text/css'], file('a.css', 'text/css'))).toBe(true);
        expect(accepts(['image/*', '.csv'], file('a.mp4'))).toBe(false);
        expect(accepts([], file('anything'))).toBe(true);
    });
});

describe('zip', () => {
    test('crc32 matches the standard check value', async () => {
        expect(await crc32(text('123456789'))).toBe(0xcbf43926);
        expect(await crc32(text(''))).toBe(0);
    });

    test('writes a zip that reads back: files, folders, UTF-8 names', async () => {
        const zip = await writeZip([
            { path: 'images/', modified: Date.UTC(2026, 9, 15) },
            { path: 'images/harbour â€“ dawn.png', data: new Blob([new Uint8Array([137, 80, 78, 71, 0, 255])]) },
            { path: 'notes.txt', data: text('hello') },
            { path: 'empty/' },
        ]);
        const entries = await readZip(zip);
        expect(entries.map(e => [e.path, e.folder])).toEqual([['images', true], ['images/harbour â€“ dawn.png', false], ['notes.txt', false], ['empty', true]]);
        expect([...new Uint8Array(await entries[1].data.arrayBuffer())]).toEqual([137, 80, 78, 71, 0, 255]);
        expect(await entries[2].data.text()).toBe('hello');
    });

    test("another tool reads what it writes, and it reads another tool's deflated zip", async () => {
        let python = '';
        for (const candidate of ['python', 'python3']) {
            try { execFileSync(candidate, ['--version'], { stdio: 'ignore' }); python = candidate; break; } catch { /* not this one */ }
        }
        if (!python) return; // no Python here: the round trip above still ran
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'juel-zip-'));
        try {
            const ours = path.join(dir, 'ours.zip');
            fs.writeFileSync(ours, Buffer.from(await (await writeZip([{ path: 'a/b.txt', data: text('bee') }, { path: 'c.txt', data: text('sea') }])).arrayBuffer()));
            const check = execFileSync(python, ['-I', '-c', 'import sys, zipfile; z = zipfile.ZipFile(sys.argv[1]); print(z.testzip(), z.read("a/b.txt").decode())', ours]).toString().trim();
            expect(check).toBe('None bee');
            const theirs = path.join(dir, 'theirs.zip');
            execFileSync(python, ['-I', '-c', 'import sys, zipfile\nwith zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as z:\n    z.writestr("deep/x.txt", "x" * 5000)\n    z.writestr("__MACOSX/._x", "junk")', theirs]);
            const entries = await readZip(new Blob([new Uint8Array(fs.readFileSync(theirs))]));
            expect(entries.map(e => e.path)).toEqual(['deep/x.txt']); // clutter skipped
            expect(await entries[0].data.text()).toBe('x'.repeat(5000));
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test("refuses what isn't a zip", async () => {
        await expect(readZip(text('not a zip at all'))).rejects.toThrow(ZipError);
    });

    test('a folder zips out of one storage and into another, empty folders and clashes too', async () => {
        const from = new MemoryFileStorage({ files: { 'trip/a.txt': 'a', 'trip/day 2/b.txt': 'b', 'other.txt': 'o' }, folders: ['trip/empty'] });
        const { zip, name, files } = await zipFolder(from, 'trip');
        expect([name, files]).toEqual(['trip.zip', 2]);
        const to = new MemoryFileStorage({ files: { 'in/a.txt': 'different' } });
        const result = await unzipInto(to, zip, 'in');
        expect(result).toEqual({ files: 2, renamed: [{ from: 'in/a.txt', to: 'in/a (2).txt' }] });
        expect((await to.list('in', { deep: true })).items.map(i => i.path)).toEqual(['in/day 2', 'in/empty', 'in/a (2).txt', 'in/a.txt', 'in/day 2/b.txt']);
        expect(await (await to.read('in/a (2).txt')).text()).toBe('a');
        expect((await zipFolder(from, '')).name).toBe('files.zip');
    });
});
