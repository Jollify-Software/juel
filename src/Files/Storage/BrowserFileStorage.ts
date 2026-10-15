// A file storage in the browser: the bytes in OPFS (the Origin Private File
// System, under a folder you name), the records in IndexedDB (a database you
// name), and dimensions, durations and thumbnails read with the browser's own
// decoders. Without OPFS (an old browser, or storage turned off) `open` falls
// back to memory, and `quota()` says the files won't last.
import { Backend, Describe, Index, LocalFileStorage, StoredRecord } from './LocalFileStorage';
import { MemoryBackend, MemoryIndex } from './MemoryFileStorage';
import { StorageQuota } from './IFileStorage';

export interface BrowserFileStorageOptions {
    /** The OPFS folder the files live in. Default `files`. */
    folder?: string;
    /** The IndexedDB database the records live in. Default `juel-files`. */
    database?: string;
    /** Longest side of a thumbnail, in px. Default 160; 0 for none. */
    thumbnailSize?: number;
}

const Store = 'files';

/** `entries()`, which TypeScript's DOM types only have with the DOM.AsyncIterable lib. */
type Entries = { entries(): AsyncIterable<[string, FileSystemHandle]> };

export class OpfsBackend implements Backend {
    private root: FileSystemDirectoryHandle;

    constructor(root: FileSystemDirectoryHandle) {
        this.root = root;
    }

    async list(): Promise<string[]> {
        const paths: string[] = [];
        await this.walk(this.root, '', (path, kind) => { if (kind === 'file') paths.push(path); });
        return paths;
    }

    async folders(): Promise<string[]> {
        const folders: string[] = [];
        await this.walk(this.root, '', (path, kind) => { if (kind === 'directory') folders.push(path); });
        return folders;
    }

    async makeFolder(path: string): Promise<void> {
        await this.folder(path.split('/'), true);
    }

    async removeFolder(path: string): Promise<void> {
        const parts = path.split('/');
        const name = parts.pop()!;
        try {
            await (await this.folder(parts, false)).removeEntry(name, { recursive: true });
        } catch { /* already gone */ }
    }

    async read(path: string): Promise<Blob | undefined> {
        try {
            return await (await this.file(path, false)).getFile();
        } catch {
            return undefined;
        }
    }

    async write(path: string, data: Blob): Promise<void> {
        const handle = await this.file(path, true);
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
    }

    async remove(path: string): Promise<void> {
        const parts = path.split('/');
        const name = parts.pop()!;
        try {
            // Its folder stays, even when empty: folders are the user's, as on a disk.
            await (await this.folder(parts, false)).removeEntry(name);
        } catch { /* already gone */ }
    }

    private async walk(dir: FileSystemDirectoryHandle, prefix: string, visit: (path: string, kind: FileSystemHandleKind) => void) {
        for await (const [name, handle] of (dir as unknown as Entries).entries()) {
            visit(prefix + name, handle.kind);
            if (handle.kind === 'directory') await this.walk(handle as FileSystemDirectoryHandle, `${prefix}${name}/`, visit);
        }
    }

    private async folder(parts: string[], create: boolean): Promise<FileSystemDirectoryHandle> {
        let dir = this.root;
        for (const part of parts) dir = await dir.getDirectoryHandle(part, { create });
        return dir;
    }

    private async file(path: string, create: boolean): Promise<FileSystemFileHandle> {
        const parts = path.split('/');
        const name = parts.pop()!;
        return (await this.folder(parts, create)).getFileHandle(name, { create });
    }
}

/** Records in an IndexedDB object store `files`, keyed by path. */
export class IdbIndex implements Index {
    private db: Promise<IDBDatabase>;

    constructor(database: string) {
        this.db = new Promise((resolve, reject) => {
            const request = indexedDB.open(database, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(Store, { keyPath: 'path' });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async all(): Promise<StoredRecord[]> {
        return this.run('readonly', store => store.getAll());
    }

    async put(record: StoredRecord): Promise<void> {
        await this.run('readwrite', store => store.put(record));
    }

    async remove(path: string): Promise<void> {
        await this.run('readwrite', store => store.delete(path));
    }

    private async run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
        const db = await this.db;
        return new Promise((resolve, reject) => {
            const request = work(db.transaction(Store, mode).objectStore(Store));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

/** Dimensions and a thumbnail for pictures; dimensions, duration and (if a frame decodes in time) a thumbnail for video; duration for sound. */
export function describeMedia(thumbnailSize = 160): Describe {
    return async (data) => {
        const type = data.type;
        if (type.startsWith('image/')) {
            const bitmap = await createImageBitmap(data);
            try {
                return { width: bitmap.width, height: bitmap.height, thumbnail: await thumbnail(bitmap, bitmap.width, bitmap.height, thumbnailSize) };
            } finally {
                bitmap.close();
            }
        }
        if (type.startsWith('video/') || type.startsWith('audio/')) {
            const url = URL.createObjectURL(data);
            try {
                const media = document.createElement(type.startsWith('video/') ? 'video' : 'audio');
                media.muted = true;
                media.preload = 'metadata';
                media.src = url;
                await withTimeout(new Promise((resolve, reject) => { media.onloadedmetadata = resolve; media.onerror = reject; }), 5000);
                const duration = Number.isFinite(media.duration) ? media.duration : undefined;
                if (!(media instanceof HTMLVideoElement)) return { duration };
                const described: Awaited<ReturnType<Describe>> = { width: media.videoWidth, height: media.videoHeight, duration };
                try {
                    media.currentTime = Math.min(1, (duration ?? 0) / 2);
                    await withTimeout(new Promise(resolve => { media.onseeked = resolve; }), 3000);
                    described.thumbnail = await thumbnail(media, media.videoWidth, media.videoHeight, thumbnailSize);
                } catch { /* no frame in time: no thumbnail */ }
                return described;
            } finally {
                URL.revokeObjectURL(url);
            }
        }
        return {};
    };
}

async function thumbnail(source: CanvasImageSource, width: number, height: number, size: number): Promise<Blob | undefined> {
    if (!width || !height || !size) return undefined;
    const scale = Math.min(1, size / Math.max(width, height));
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);
}

export class BrowserFileStorage extends LocalFileStorage {
    /**
     * Opens the storage: OPFS + IndexedDB, or memory if the browser has no
     * OPFS. Ask for lasting storage (`keep()`) when the user first adds
     * something, not before: browsers may ask them.
     */
    static async open(options: BrowserFileStorageOptions = {}): Promise<BrowserFileStorage> {
        const describe = describeMedia(options.thumbnailSize ?? 160);
        let storage: BrowserFileStorage;
        try {
            const root = await (await navigator.storage.getDirectory()).getDirectoryHandle(options.folder ?? 'files', { create: true });
            storage = new BrowserFileStorage(new OpfsBackend(root), new IdbIndex(options.database ?? 'juel-files'), describe, true);
        } catch {
            console.warn('No OPFS here: files are kept in memory and go when the page closes');
            storage = new BrowserFileStorage(new MemoryBackend(), new MemoryIndex(), describe, false);
        }
        await storage.open();
        return storage;
    }

    private constructor(backend: Backend, index: Index, describe: Describe, lasting: boolean) {
        super(backend, index, { describe, lasting, estimate: () => navigator.storage.estimate() });
    }

    /** `lasting` only when the files are in OPFS and the browser has agreed not to clear them (`keep()`). */
    async quota(): Promise<StorageQuota> {
        const quota = await super.quota();
        let persisted = false;
        try { persisted = await navigator.storage.persisted(); } catch { /* unknown */ }
        return { ...quota, lasting: quota.lasting && persisted };
    }

    /** Asks the browser not to clear the files under storage pressure. True if it agreed. */
    async keep(): Promise<boolean> {
        try {
            return (await navigator.storage.persisted()) || (await navigator.storage.persist());
        } catch {
            return false;
        }
    }
}
