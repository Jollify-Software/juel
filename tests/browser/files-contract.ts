// The IFileStorage contract in a real browser, against BrowserFileStorage
// (OPFS + IndexedDB), plus what only a browser can show: files outlive the
// object, and records written by the Jollify app before ids existed still
// open. Built into dist/ by `npm run test:browser:build`; tests/e2e/files-storage.spec.ts
// opens files-contract.html and reads `window.contractResults`.
import { runContract } from '../shared/storageContract';
import { BrowserFileStorage } from '../../src/Files/Storage/BrowserFileStorage';

const run = Date.now().toString(36);
let n = 0;
/** A fresh storage: its own OPFS folder and database. */
const fresh = () => {
    n++;
    return BrowserFileStorage.open({ folder: `contract-${run}-${n}`, database: `contract-${run}-${n}` });
};

type Result = { name: string; error?: string };

async function check(name: string, work: () => Promise<void>): Promise<Result> {
    try {
        await work();
        return { name };
    } catch (error) {
        return { name, error: String((error as Error)?.message ?? error) };
    }
}

function assert(value: unknown, message: string) {
    if (!value) throw new Error(message);
}

async function browserOnly(): Promise<Result[]> {
    return [
        await check('files, folders and ids outlive the object', async () => {
            const names = { folder: `reopen-${run}`, database: `reopen-${run}` };
            const first = await BrowserFileStorage.open(names);
            const written = await first.write('photos/a.txt', new Blob(['kept']));
            await first.makeFolder('empty');
            const second = await BrowserFileStorage.open(names);
            assert(await (await second.read('photos/a.txt')).text() === 'kept', 'bytes kept');
            assert((await second.stat('photos/a.txt'))?.id === written.record.id, 'id kept');
            assert((await second.stat('empty'))?.kind === 'folder', 'empty folder kept');
            assert((await second.quota()).usage !== undefined, 'quota says something');
        }),
        await check('opens what the Jollify app wrote before ids (no id, no kind)', async () => {
            const folder = `legacy-${run}`, database = `legacy-${run}`;
            const root = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
            const writable = await (await (await root.getDirectoryHandle('images', { create: true })).getFileHandle('logo.png', { create: true }) as any).createWritable();
            await writable.write(new Blob(['png'], { type: 'image/png' }));
            await writable.close();
            await new Promise<void>((resolve, reject) => {
                const request = indexedDB.open(database, 1);
                request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'path' });
                request.onsuccess = () => {
                    const tx = request.result.transaction('files', 'readwrite');
                    tx.objectStore('files').put({ path: 'images/logo.png', size: 3, type: 'image/png', added: 1, changed: 2, hash: 'old', width: 8, height: 4 });
                    tx.oncomplete = () => { request.result.close(); resolve(); };
                    tx.onerror = () => reject(tx.error);
                };
                request.onerror = () => reject(request.error);
            });
            const storage = await BrowserFileStorage.open({ folder, database });
            const logo = await storage.stat('images/logo.png');
            assert(logo?.id, 'given an id');
            assert(logo?.hash === 'old' && logo?.meta?.width === 8 && logo?.modified === 2, 'its record kept, not re-read');
            assert((await storage.stat('images'))?.kind === 'folder', 'its folder has a record');
        }),
        await check('a picture gets dimensions and a thumbnail', async () => {
            const storage = await fresh();
            const canvas = new OffscreenCanvas(400, 200);
            canvas.getContext('2d')!.fillRect(0, 0, 400, 200);
            const png = await canvas.convertToBlob({ type: 'image/png' });
            const { record } = await storage.write('pic.png', png);
            assert(record.meta?.width === 400 && record.meta?.height === 200, `dimensions ${JSON.stringify(record.meta)}`);
            const thumb = await storage.thumbnail('pic.png');
            assert(thumb && thumb.type === 'image/webp', 'a WebP thumbnail');
        }),
    ];
}

(async () => {
    const results = [...await runContract(fresh), ...await browserOnly()];
    // Tidy up this run's folders and databases.
    try {
        const root = await navigator.storage.getDirectory();
        for await (const name of (root as any).keys() as AsyncIterable<string>) {
            if (name.includes(run)) await root.removeEntry(name, { recursive: true });
        }
        for (const db of await indexedDB.databases()) if (db.name?.includes(run)) indexedDB.deleteDatabase(db.name);
    } catch { /* leave it */ }
    (window as any).contractResults = results;
    document.body.textContent = results.map(r => `${r.error ? 'FAIL' : 'ok  '} ${r.name}${r.error ? ' — ' + r.error : ''}`).join('\n');
})();
