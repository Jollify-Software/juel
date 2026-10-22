// Moving a whole folder of an IFileStorage in and out: as a .zip, or into a
// real folder on disk (Chrome and Edge's showDirectoryPicker).
import { IFileStorage, OnConflict } from '../Storage/IFileStorage';
import { join, nameOf, typeOf } from '../Storage/Paths';
import { readZip, writeZip, ZipEntry } from './Zip';

/** A folder's files and empty folders (`''`: everything), with paths from inside it. */
export async function entriesUnder(storage: IFileStorage, folder: string): Promise<ZipEntry[]> {
    const prefix = folder ? folder + '/' : '';
    const { items } = await storage.list(folder, { deep: true });
    const entries: ZipEntry[] = [];
    for (const item of items) {
        const path = item.path.slice(prefix.length);
        if (item.kind === 'folder') {
            if (!item.items) entries.push({ path: path + '/', modified: item.modified });
            continue;
        }
        entries.push({ path, data: await storage.read(item.path), modified: item.modified });
    }
    return entries;
}

/** A .zip of a folder (`''`: everything), and how many files are in it. */
export async function zipFolder(storage: IFileStorage, folder: string): Promise<{ zip: Blob; name: string; files: number }> {
    const entries = await entriesUnder(storage, folder);
    return { zip: await writeZip(entries), name: `${folder ? nameOf(folder) : 'files'}.zip`, files: entries.filter(e => e.data).length };
}

export interface ImportResult {
    /** Files written (not counting `same`). */
    files: number;
    /** Paths that were taken, so the incoming file got a new name (with `keep-both`). */
    renamed: { from: string; to: string }[];
    /** Files already there with the same bytes, so left as they were. */
    same: number;
}

/**
 * Unpacks a .zip into a folder. A file already there with the same bytes is
 * left alone (so unpacking a backup twice changes nothing); any other clash
 * keeps both unless told otherwise.
 */
export async function unzipInto(storage: IFileStorage, zip: Blob, folder: string, onConflict: OnConflict = 'keep-both'): Promise<ImportResult> {
    const result: ImportResult = { files: 0, renamed: [], same: 0 };
    for (const entry of await readZip(zip)) {
        const target = join(folder, entry.path);
        if (entry.folder) { await storage.makeFolder(target); continue; }
        if (await sameBytes(storage, target, entry.data)) { result.same++; continue; }
        const written = await storage.write(target, new Blob([entry.data], { type: typeOf(entry.path) }), { onConflict });
        if (written.outcome === 'renamed') result.renamed.push({ from: target, to: written.record.path });
        result.files++;
    }
    return result;
}

async function sameBytes(storage: IFileStorage, path: string, data: Blob): Promise<boolean> {
    const existing = await storage.stat(path);
    if (!existing || existing.kind !== 'file' || existing.size !== data.size) return false;
    const incoming = new Uint8Array(await data.arrayBuffer());
    const bytes = new Uint8Array(await (await storage.read(path)).arrayBuffer());
    for (let i = 0; i < bytes.length; i++) if (bytes[i] !== incoming[i]) return false;
    return true;
}

/** Chrome and Edge can write into a folder on disk. */
export function canSaveToDisk(): boolean {
    return 'showDirectoryPicker' in globalThis;
}

/** Copies a folder (`''`: everything) into a folder on disk the user picked, making its subfolders. Returns how many files. */
export async function saveToDirectory(storage: IFileStorage, folder: string, root: FileSystemDirectoryHandle): Promise<number> {
    let count = 0;
    for (const entry of await entriesUnder(storage, folder)) {
        const parts = entry.path.replace(/\/$/, '').split('/');
        const name = entry.data ? parts.pop()! : undefined;
        let dir = root;
        for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
        if (!name || !entry.data) continue;
        const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
        await writable.write(entry.data);
        await writable.close();
        count++;
    }
    return count;
}
