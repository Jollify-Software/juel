// Reading what was dropped from the desktop: files, and folders with what's
// in them (empty ones too), each with its path relative to the drop.

/** A dropped file, or (no `file`) an empty folder. */
export interface DroppedItem {
    relative: string;
    file?: File;
}

/** Whether a drag carries files from outside the page. */
export function hasFiles(data: DataTransfer | null): boolean {
    return !!data && [...data.types].includes('Files');
}

/**
 * What a drop holds. Call it synchronously in the `drop` handler: the
 * DataTransfer's items are gone after the first `await`. Folders come through
 * `webkitGetAsEntry`; without entries (a synthetic DataTransfer), the files.
 */
export function readDrop(data: DataTransfer): Promise<DroppedItem[]> {
    const entries = [...data.items]
        .filter(i => i.kind === 'file')
        .map(i => i.webkitGetAsEntry?.())
        .filter((e): e is FileSystemEntry => !!e);
    const files = [...data.files];
    if (!entries.length || !entries.some(e => e.isDirectory)) {
        return Promise.resolve(files.map(file => ({ relative: file.name, file })));
    }
    return walk(entries, '');
}

async function walk(entries: FileSystemEntry[], prefix: string): Promise<DroppedItem[]> {
    const out: DroppedItem[] = [];
    for (const entry of entries) {
        const relative = prefix + entry.name;
        if (entry.isFile) {
            out.push({ relative, file: await fileOf(entry as FileSystemFileEntry) });
            continue;
        }
        const children = await childrenOf(entry as FileSystemDirectoryEntry);
        if (!children.length) out.push({ relative });
        else out.push(...await walk(children, relative + '/'));
    }
    return out;
}

function fileOf(entry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
}

/** All of a folder's entries: `readEntries` gives them a batch (≤100 in Chrome) at a time, then `[]`. */
async function childrenOf(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
    const reader = entry.createReader();
    const all: FileSystemEntry[] = [];
    for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (!batch.length) return all;
        all.push(...batch);
    }
}
