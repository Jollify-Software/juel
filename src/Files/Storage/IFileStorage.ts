// The one thing <juel-file-manager> talks to: a tree of files and folders,
// wherever it is kept. Juel ships two (MemoryFileStorage, BrowserFileStorage);
// a server one (an API over a document database) implements the same
// interface. So everything is async, nothing assumes the bytes are local,
// every record has a stable `id` as well as its `path`, and a listing comes a
// page at a time.

/** A file or a folder. */
export interface FileRecord {
    /** Stable for the life of the item: a move or rename changes `path`, not `id`. */
    id: string;
    /** From the storage's root, `/`-separated, no leading slash: `images/harbour.jpg`. */
    path: string;
    /** The last part of the path. */
    name: string;
    kind: 'file' | 'folder';
    /** Bytes; 0 for a folder. */
    size: number;
    /** A media type (`image/png`); '' for a folder. */
    type: string;
    /** ms since the epoch. */
    created: number;
    modified: number;
    /** SHA-256 of the bytes, hex (files only, where the storage knows it). */
    hash?: string;
    /** Folders: how many items are directly inside. */
    items?: number;
    /** What the storage knows beyond the bytes: dimensions, duration, … Storages may add their own. */
    meta?: FileMeta;
}

export interface FileMeta {
    width?: number;
    height?: number;
    /** Seconds, for video and audio. */
    duration?: number;
    [key: string]: unknown;
}

export type FileSortKey = 'name' | 'modified' | 'size' | 'type';

export interface ListOptions {
    /** Match names containing this (case-insensitive). With `deep`, across every folder below. */
    search?: string;
    /** Everything below the folder, not just what's directly in it. */
    deep?: boolean;
    /** Default `name`. Folders always come before files. */
    sort?: FileSortKey;
    descending?: boolean;
    /** Only files whose type matches one of these (`image/*`, `.csv`, `text/css`); folders are always listed. */
    accept?: string[];
    /** The page size; default: all. */
    limit?: number;
    /** `next` from the previous page. */
    cursor?: string;
}

export interface ListResult {
    items: FileRecord[];
    /** Pass as `cursor` for the next page; absent on the last. */
    next?: string;
}

/** What to do when a write's path already holds a different file. */
export type OnConflict = 'replace' | 'keep-both' | 'fail';

export interface WriteOptions {
    /** Default `replace`. */
    onConflict?: OnConflict;
}

export interface WriteResult {
    record: FileRecord;
    /** `same`: the path already held these bytes, so nothing was written. `renamed`: kept both, under a new name. */
    outcome: 'added' | 'replaced' | 'renamed' | 'same';
}

/** One item that moved or was copied, from where to where. */
export interface PathChange {
    from: string;
    to: string;
}

export type FileChange =
    | { kind: 'added' | 'changed' | 'removed'; path: string; folder: boolean }
    | { kind: 'moved'; from: string; to: string; folder: boolean };

export interface StorageQuota {
    /** Bytes used and available, as far as the storage knows. */
    usage?: number;
    quota?: number;
    /** False when the files may not outlive the session (memory, or storage the browser may clear). */
    lasting: boolean;
}

/** What a storage can do; the UI hides the rest. */
export interface FileStorageCapabilities {
    write: boolean;
    copy: boolean;
    thumbnails: boolean;
    quota: boolean;
    /** `subscribe` reports changes made elsewhere too, not only through this object. */
    watch: boolean;
}

export type FileStorageErrorCode = 'not-found' | 'exists' | 'invalid-path' | 'quota' | 'offline' | 'forbidden' | 'conflict' | 'unsupported';

export class FileStorageError extends Error {
    readonly code: FileStorageErrorCode;
    /** The path the error is about, if one. */
    readonly path?: string;

    constructor(code: FileStorageErrorCode, message: string, path?: string) {
        super(message);
        this.name = 'FileStorageError';
        this.code = code;
        this.path = path;
    }
}

export interface IFileStorage {
    readonly capabilities: FileStorageCapabilities;

    /** What's in a folder (`''` is the root). */
    list(folder: string, options?: ListOptions): Promise<ListResult>;
    /** One item, or undefined. */
    stat(path: string): Promise<FileRecord | undefined>;
    /** A file's bytes. Throws `not-found`. */
    read(path: string): Promise<Blob>;
    /** A URL for a file, where the storage can give one (a server's signed link); else undefined, and callers read the Blob. */
    urlFor?(path: string): Promise<string | undefined>;
    /** A small preview image for a picture or video, if the storage has one. */
    thumbnail?(path: string): Promise<Blob | undefined>;

    /** Writes a file, making the folders it needs. */
    write(path: string, data: Blob, options?: WriteOptions): Promise<WriteResult>;
    /** Makes a folder and its parents; nothing happens if it's there. Throws `exists` if a file has the path. */
    makeFolder(path: string): Promise<FileRecord>;
    /** Moves or renames a file, or a folder and everything in it. Never overwrites: throws `exists`. */
    move(from: string, to: string): Promise<PathChange[]>;
    /** Copies a file, or a folder and everything in it. Never overwrites: throws `exists`. */
    copy(from: string, to: string): Promise<PathChange[]>;
    /** Removes a file, or a folder and everything in it. Returns the paths of the files that went. */
    remove(path: string): Promise<string[]>;

    /** A free path like this one: `name (2).ext`, `name (3).ext`, … */
    uniquePath(path: string): Promise<string>;
    quota?(): Promise<StorageQuota>;
    /** Called on every change; returns a function that stops it. */
    subscribe(listener: (change: FileChange) => void): () => void;
}
