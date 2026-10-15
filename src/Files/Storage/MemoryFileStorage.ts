// A file storage held in memory: for examples, tests, and as the fallback
// when the browser has no lasting storage. Gone with the page.
import { Backend, Describe, Index, LocalFileStorage, StoredRecord } from './LocalFileStorage';
import { parentsOf, within } from './Paths';

export class MemoryBackend implements Backend {
    files = new Map<string, Blob>();
    dirs = new Set<string>();
    async list() { return [...this.files.keys()]; }
    async folders() { return [...new Set([...this.dirs, ...[...this.files.keys()].flatMap(parentsOf)])]; }
    async read(path: string) { return this.files.get(path); }
    async write(path: string, data: Blob) { this.files.set(path, data); for (const f of parentsOf(path)) this.dirs.add(f); }
    async remove(path: string) { this.files.delete(path); }
    async makeFolder(path: string) { for (const f of parentsOf(path + '/x')) this.dirs.add(f); }
    async removeFolder(path: string) {
        for (const f of [...this.dirs]) if (within(f, path)) this.dirs.delete(f);
        for (const f of [...this.files.keys()]) if (within(f, path)) this.files.delete(f);
    }
}

export class MemoryIndex implements Index {
    records = new Map<string, StoredRecord>();
    async all() { return [...this.records.values()].map(r => ({ ...r })); }
    async put(record: StoredRecord) { this.records.set(record.path, { ...record }); }
    async remove(path: string) { this.records.delete(path); }
}

export interface MemoryFileStorageOptions {
    /** Files to start with, by path. */
    files?: Record<string, Blob | string>;
    /** Empty folders to start with. */
    folders?: string[];
    describe?: Describe;
}

export class MemoryFileStorage extends LocalFileStorage {
    /** The bytes, for tests to look at. */
    readonly memory: MemoryBackend;

    constructor(options: MemoryFileStorageOptions = {}) {
        const backend = new MemoryBackend();
        for (const [path, data] of Object.entries(options.files ?? {})) backend.write(path, typeof data === 'string' ? new Blob([data]) : data);
        for (const folder of options.folders ?? []) backend.makeFolder(folder);
        super(backend, new MemoryIndex(), { describe: options.describe, lasting: false });
        this.memory = backend;
    }
}
