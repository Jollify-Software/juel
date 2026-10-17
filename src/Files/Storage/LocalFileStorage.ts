// An IFileStorage kept on this device, in two parts so memory, the browser
// (OPFS + IndexedDB) and tests can each stand in:
// - a Backend holds the bytes (and the folder tree);
// - an Index holds one record per item (size, type, dates, hash, id,
//   dimensions, a thumbnail), so listing and "is this here already?" never
//   read a file.
// The whole tree is held in memory once opened, so the sync helpers (`get`,
// `all`, `findByHash`, …) answer at once.
import {
    FileChange, FileMeta, FileRecord, FileStorageCapabilities, FileStorageError, IFileStorage, ListOptions, ListResult,
    PathChange, StorageQuota, WriteOptions, WriteResult,
} from './IFileStorage';
import { accepts, checkPath, nameOf, normalise, parentsOf, typeOf, uniquePath, within } from './Paths';
import { hashOf, newId } from './Hash';

/** An item as the Index keeps it. Files written before ids existed have none: they get one on open. */
export interface StoredRecord {
    path: string;
    id?: string;
    /** Absent for a file (older records), `folder` for a folder. */
    kind?: 'folder';
    size: number;
    type: string;
    /** ms since the epoch. */
    added: number;
    changed: number;
    hash?: string;
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: Blob;
    meta?: FileMeta;
}

export interface Backend {
    /** Every file's path. */
    list(): Promise<string[]>;
    /** Every folder's path, empty ones included. */
    folders(): Promise<string[]>;
    read(path: string): Promise<Blob | undefined>;
    /** Writes a file, making the folders it needs. */
    write(path: string, data: Blob): Promise<void>;
    remove(path: string): Promise<void>;
    makeFolder(path: string): Promise<void>;
    /** Removes a folder and everything left in it. */
    removeFolder(path: string): Promise<void>;
}

export interface Index {
    all(): Promise<StoredRecord[]>;
    put(record: StoredRecord): Promise<void>;
    remove(path: string): Promise<void>;
}

/** What can be told about a file beyond its bytes (dimensions, duration, thumbnail). */
export type Describe = (data: Blob) => Promise<Pick<StoredRecord, 'width' | 'height' | 'duration' | 'thumbnail'>>;

export interface LocalStorageOptions {
    describe?: Describe;
    /** False if the files won't outlive the page (memory). */
    lasting?: boolean;
    /** Space used and available. */
    estimate?: () => Promise<{ usage?: number; quota?: number }>;
}

export class LocalFileStorage implements IFileStorage {
    readonly capabilities: FileStorageCapabilities;

    private records = new Map<string, StoredRecord>();
    private listeners = new Set<(change: FileChange) => void>();
    private opened?: Promise<void>;
    private backend: Backend;
    private index: Index;
    private options: LocalStorageOptions;

    // Fields rather than parameter properties, so plain type-stripping tools can run this.
    constructor(backend: Backend, index: Index, options: LocalStorageOptions = {}) {
        this.backend = backend;
        this.index = index;
        this.options = options;
        this.capabilities = { write: true, copy: true, thumbnails: !!options.describe, quota: !!options.estimate, watch: false };
    }

    /**
     * Reads the index and squares it with the files: an item with no record
     * gets one (and every record an id), a record with nothing behind it goes.
     * Every other call does this first; safe to call more than once.
     */
    open(): Promise<void> {
        this.opened ??= (async () => {
            const [paths, folders, stored] = await Promise.all([this.backend.list(), this.backend.folders(), this.index.all()]);
            const files = new Set(paths);
            const dirs = new Set([...folders, ...paths.flatMap(parentsOf)]);
            for (const record of stored) {
                const present = record.kind === 'folder' ? dirs.has(record.path) : files.has(record.path);
                if (!present) { await this.index.remove(record.path); continue; }
                if (!record.id) { record.id = newId(); await this.index.put(record); }
                this.records.set(record.path, record);
            }
            const now = Date.now();
            for (const folder of dirs) {
                if (!this.records.has(folder)) await this.putFolder(folder, now);
            }
            for (const path of paths) {
                if (this.records.has(path)) continue;
                const data = await this.backend.read(path);
                if (data) await this.record(path, data, now);
            }
        })();
        return this.opened;
    }

    // --- reading -----------------------------------------------------------

    async list(folder: string, options: ListOptions = {}): Promise<ListResult> {
        await this.open();
        const f = normalise(folder);
        if (f && this.records.get(f)?.kind !== 'folder') throw new FileStorageError('not-found', `There's no folder "${f}"`, f);
        const search = options.search?.trim().toLowerCase();
        let items = [...this.records.values()].filter(r => {
            if (r.path === f || !within(r.path, f)) return false;
            const rest = f ? r.path.slice(f.length + 1) : r.path;
            if (!options.deep && rest.includes('/')) return false;
            if (search && !nameOf(r.path).toLowerCase().includes(search)) return false;
            return r.kind === 'folder' || accepts(options.accept, r);
        }).map(r => this.toRecord(r));
        items = sortRecords(items, options.sort ?? 'name', !!options.descending);
        const start = options.cursor ? Number(options.cursor) || 0 : 0;
        if (!options.limit) return { items: items.slice(start) };
        const end = start + options.limit;
        return { items: items.slice(start, end), next: end < items.length ? String(end) : undefined };
    }

    async stat(path: string): Promise<FileRecord | undefined> {
        await this.open();
        return this.get(path);
    }

    async read(path: string): Promise<Blob> {
        await this.open();
        const p = normalise(path);
        const record = this.records.get(p);
        const data = record && record.kind !== 'folder' ? await this.backend.read(p) : undefined;
        if (!data) throw new FileStorageError('not-found', `There's no file "${p}"`, p);
        return data;
    }

    async thumbnail(path: string): Promise<Blob | undefined> {
        await this.open();
        return this.records.get(normalise(path))?.thumbnail;
    }

    async quota(): Promise<StorageQuota> {
        let estimate: { usage?: number; quota?: number } = {};
        try { estimate = (await this.options.estimate?.()) ?? {}; } catch { /* unknown */ }
        return { usage: estimate.usage, quota: estimate.quota, lasting: this.options.lasting ?? false };
    }

    async uniquePath(path: string): Promise<string> {
        await this.open();
        return uniquePath(checkPath(path), p => this.records.has(p));
    }

    // --- sync helpers (after open) ------------------------------------------

    /** One item, or undefined. */
    get(path: string): FileRecord | undefined {
        const record = this.records.get(normalise(path));
        return record && this.toRecord(record);
    }

    /** Every item, folders and files, by path. */
    all(): FileRecord[] {
        return [...this.records.values()].sort((a, b) => a.path.localeCompare(b.path)).map(r => this.toRecord(r));
    }

    /** A file whose bytes hash to `hash`. */
    findByHash(hash: string): FileRecord | undefined {
        for (const r of this.records.values()) if (r.kind !== 'folder' && r.hash === hash) return this.toRecord(r);
        return undefined;
    }

    /** Files with this name, anywhere, shortest path first. */
    findByName(name: string): FileRecord[] {
        return [...this.records.values()]
            .filter(r => r.kind !== 'folder' && nameOf(r.path) === name)
            .sort((a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path))
            .map(r => this.toRecord(r));
    }

    // --- writing -----------------------------------------------------------

    async write(path: string, data: Blob, options: WriteOptions = {}): Promise<WriteResult> {
        await this.open();
        // Plain JavaScript may hand over a string (or an ArrayBuffer): make it a Blob.
        if (!(data instanceof Blob)) data = new Blob([data as BlobPart]);
        let target = checkPath(path);
        const hash = await hashOf(data);
        const existing = this.records.get(target);
        let outcome: WriteResult['outcome'] = 'added';
        if (existing?.kind === 'folder') throw new FileStorageError('exists', `"${target}" is a folder`, target);
        if (existing) {
            if (existing.hash === hash) return { record: this.toRecord(existing), outcome: 'same' };
            const onConflict = options.onConflict ?? 'replace';
            if (onConflict === 'fail') throw new FileStorageError('exists', `"${target}" already exists`, target);
            if (onConflict === 'keep-both') {
                target = uniquePath(target, p => this.records.has(p));
                outcome = 'renamed';
            } else {
                outcome = 'replaced';
            }
        }
        this.checkParents(target);
        await this.backend.write(target, data);
        await this.addParents(target);
        const replaced = outcome === 'replaced' ? existing : undefined;
        const record = await this.record(target, data, replaced?.added ?? Date.now(), hash, replaced?.id);
        this.emit(replaced ? { kind: 'changed', path: target, folder: false } : { kind: 'added', path: target, folder: false });
        return { record: this.toRecord(record), outcome };
    }

    async makeFolder(path: string): Promise<FileRecord> {
        await this.open();
        const p = checkPath(path);
        const existing = this.records.get(p);
        if (existing) {
            if (existing.kind === 'folder') return this.toRecord(existing);
            throw new FileStorageError('exists', `"${p}" is a file`, p);
        }
        this.checkParents(p);
        await this.backend.makeFolder(p);
        await this.addParents(p + '/x');
        return this.toRecord(this.records.get(p)!);
    }

    async move(from: string, to: string): Promise<PathChange[]> {
        await this.open();
        const source = normalise(from);
        const target = checkPath(to);
        const plan = this.plan(source, target);
        if (!plan) return [];
        const now = Date.now();
        // Files first (bytes, then records), then the folder records.
        for (const m of plan.files) {
            const data = await this.backend.read(m.from);
            if (data) await this.backend.write(m.to, data);
            await this.backend.remove(m.from);
        }
        if (plan.folders.length) {
            for (const m of plan.folders) await this.backend.makeFolder(m.to);
            await this.backend.removeFolder(source);
        }
        await this.addParents(target);
        for (const m of [...plan.folders, ...plan.files]) {
            const record = { ...this.records.get(m.from)!, path: m.to, changed: now };
            await this.index.remove(m.from);
            await this.index.put(record);
            this.records.delete(m.from);
            this.records.set(m.to, record);
        }
        this.emit({ kind: 'moved', from: source, to: target, folder: plan.folders.length > 0 });
        return [...plan.folders, ...plan.files];
    }

    async copy(from: string, to: string): Promise<PathChange[]> {
        await this.open();
        const source = normalise(from);
        const target = checkPath(to);
        if (source === target) throw new FileStorageError('exists', `"${target}" already exists`, target);
        const plan = this.plan(source, target);
        if (!plan) return [];
        const now = Date.now();
        for (const m of plan.folders) {
            await this.backend.makeFolder(m.to);
            await this.putFolder(m.to, now);
        }
        await this.addParents(target);
        for (const m of plan.files) {
            const original = this.records.get(m.from)!;
            const data = await this.backend.read(m.from);
            if (!data) continue;
            await this.backend.write(m.to, data);
            const record: StoredRecord = { ...original, path: m.to, id: newId(), added: now, changed: now };
            this.records.set(m.to, record);
            await this.index.put(record);
        }
        this.emit({ kind: 'added', path: target, folder: plan.folders.length > 0 });
        return [...plan.folders, ...plan.files];
    }

    async remove(path: string): Promise<string[]> {
        await this.open();
        const p = normalise(path);
        const record = this.records.get(p);
        if (!record) throw new FileStorageError('not-found', `There's no "${p}"`, p);
        const inside = [...this.records.values()].filter(r => within(r.path, p)).sort((a, b) => b.path.length - a.path.length);
        const files = inside.filter(r => r.kind !== 'folder').map(r => r.path).sort();
        for (const f of files) await this.backend.remove(f);
        if (record.kind === 'folder') await this.backend.removeFolder(p);
        for (const r of inside) {
            await this.index.remove(r.path);
            this.records.delete(r.path);
        }
        this.emit({ kind: 'removed', path: p, folder: record.kind === 'folder' });
        return files;
    }

    subscribe(listener: (change: FileChange) => void): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    // --- inside ------------------------------------------------------------

    /** The moves (or copies) that taking `source` to `target` means, after checking it can be done; undefined for "onto itself". */
    private plan(source: string, target: string): { files: PathChange[]; folders: PathChange[] } | undefined {
        if (source === target) return undefined;
        const record = this.records.get(source);
        if (!record) throw new FileStorageError('not-found', `There's no "${source}"`, source);
        if (within(target, source)) throw new FileStorageError('invalid-path', `Can't put "${source}" inside itself`, target);
        if (this.records.has(target)) throw new FileStorageError('exists', `"${target}" already exists`, target);
        this.checkParents(target);
        const changes = [...this.records.values()]
            .filter(r => within(r.path, source))
            .sort((a, b) => a.path.localeCompare(b.path))
            .map(r => ({ from: r.path, to: target + r.path.slice(source.length), folder: r.kind === 'folder' }));
        return {
            folders: changes.filter(c => c.folder).map(({ from, to }) => ({ from, to })),
            files: changes.filter(c => !c.folder).map(({ from, to }) => ({ from, to })),
        };
    }

    /** A path can't go under a file. */
    private checkParents(path: string) {
        for (const parent of parentsOf(path)) {
            const r = this.records.get(parent);
            if (r && r.kind !== 'folder') throw new FileStorageError('exists', `"${parent}" is a file`, parent);
        }
    }

    /** Records the folders a path implies, announcing new ones. */
    private async addParents(path: string) {
        const now = Date.now();
        for (const folder of parentsOf(path)) {
            if (this.records.has(folder)) continue;
            await this.putFolder(folder, now);
            this.emit({ kind: 'added', path: folder, folder: true });
        }
    }

    private async putFolder(path: string, when: number) {
        const record: StoredRecord = { path, id: newId(), kind: 'folder', size: 0, type: '', added: when, changed: when };
        this.records.set(path, record);
        await this.index.put(record);
    }

    private async record(path: string, data: Blob, added: number, hash?: string, id?: string): Promise<StoredRecord> {
        let described = {};
        try { described = (await this.options.describe?.(data)) ?? {}; } catch { /* not media this can read */ }
        const record: StoredRecord = {
            path, id: id ?? newId(), size: data.size, type: data.type || typeOf(path), added, changed: Date.now(),
            hash: hash ?? await hashOf(data), ...described,
        };
        this.records.set(path, record);
        await this.index.put(record);
        return record;
    }

    private toRecord(r: StoredRecord): FileRecord {
        const folder = r.kind === 'folder';
        const record: FileRecord = {
            id: r.id!, path: r.path, name: nameOf(r.path), kind: folder ? 'folder' : 'file',
            size: folder ? 0 : r.size, type: folder ? '' : r.type, created: r.added, modified: r.changed,
        };
        if (folder) {
            const prefix = r.path + '/';
            record.items = [...this.records.keys()].filter(k => k.startsWith(prefix) && !k.slice(prefix.length).includes('/')).length;
        } else {
            record.hash = r.hash;
            const meta: FileMeta = { ...r.meta };
            if (r.width !== undefined) meta.width = r.width;
            if (r.height !== undefined) meta.height = r.height;
            if (r.duration !== undefined) meta.duration = r.duration;
            if (r.thumbnail) meta.hasThumbnail = true;
            if (Object.keys(meta).length) record.meta = meta;
        }
        return record;
    }

    private emit(change: FileChange) {
        for (const listener of this.listeners) {
            try { listener(change); } catch (error) { console.error(error); }
        }
    }
}

/** Folders first, then by `key`; names compare naturally (`2` before `10`). */
export function sortRecords(items: FileRecord[], key: ListOptions['sort'], descending: boolean): FileRecord[] {
    const byName = (a: FileRecord, b: FileRecord) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    const compare: (a: FileRecord, b: FileRecord) => number =
        key === 'modified' ? (a, b) => a.modified - b.modified :
        key === 'size' ? (a, b) => a.size - b.size || (a.items ?? 0) - (b.items ?? 0) :
        key === 'type' ? (a, b) => a.type.localeCompare(b.type) :
        byName;
    const sign = descending ? -1 : 1;
    return [...items].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
        return sign * (compare(a, b) || byName(a, b));
    });
}
