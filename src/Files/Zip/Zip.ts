// Zip files: download a folder (or everything) of a file storage as one .zip,
// and import one (Transfer.ts does both for an IFileStorage). Writing stores files as they are
// (no compression: photos and video are compressed already), streamed from
// their Blobs, so a big library isn't copied into memory. Reading handles
// stored and deflated entries (DecompressionStream). No Zip64: a zip over
// 4 GB, or of more than 65 535 entries, is refused.

export interface ZipEntry {
    /** Library path; a folder ends with `/`. */
    path: string;
    data?: Blob;
    /** ms since the epoch. */
    modified?: number;
}

export class ZipError extends Error {}

const Max32 = 0xffffffff;

let table: Uint32Array | undefined;

function crcTable(): Uint32Array {
    if (table) return table;
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
}

/** CRC-32 of a Blob, read as a stream. */
export async function crc32(data: Blob): Promise<number> {
    const t = crcTable();
    let crc = 0xffffffff;
    const reader = data.stream().getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (let i = 0; i < value.length; i++) crc = t[(crc ^ value[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(ms: number): { time: number; date: number } {
    const d = new Date(ms);
    const year = Math.max(1980, d.getFullYear());
    return {
        time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
        date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    };
}

/** A .zip of `entries`, files stored as they are. */
export async function writeZip(entries: ZipEntry[]): Promise<Blob> {
    if (entries.length > 0xffff) throw new ZipError('Too many files for one zip (65 535 at most)');
    const encoder = new TextEncoder();
    const parts: BlobPart[] = [];
    const central: Uint8Array<ArrayBuffer>[] = [];
    let offset = 0;
    for (const entry of entries) {
        const name = encoder.encode(entry.path);
        const data = entry.data ?? new Blob([]);
        if (data.size > Max32 || offset > Max32) throw new ZipError('Too big for one zip (4 GB at most)');
        const crc = entry.path.endsWith('/') ? 0 : await crc32(data);
        const { time, date } = dosTime(entry.modified ?? Date.now());

        const local = new Uint8Array(30 + name.length);
        const l = new DataView(local.buffer);
        l.setUint32(0, 0x04034b50, true);
        l.setUint16(4, 20, true);
        l.setUint16(6, 0x0800, true); // UTF-8 names
        l.setUint16(8, 0, true); // stored
        l.setUint16(10, time, true);
        l.setUint16(12, date, true);
        l.setUint32(14, crc, true);
        l.setUint32(18, data.size, true);
        l.setUint32(22, data.size, true);
        l.setUint16(26, name.length, true);
        local.set(name, 30);

        const record = new Uint8Array(46 + name.length);
        const c = new DataView(record.buffer);
        c.setUint32(0, 0x02014b50, true);
        c.setUint16(4, 20, true);
        c.setUint16(6, 20, true);
        c.setUint16(8, 0x0800, true);
        c.setUint16(10, 0, true);
        c.setUint16(12, time, true);
        c.setUint16(14, date, true);
        c.setUint32(16, crc, true);
        c.setUint32(20, data.size, true);
        c.setUint32(24, data.size, true);
        c.setUint16(28, name.length, true);
        c.setUint32(38, entry.path.endsWith('/') ? 0x10 : 0, true); // MS-DOS directory attribute
        c.setUint32(42, offset, true);
        record.set(name, 46);
        central.push(record);

        parts.push(local, data);
        offset += local.length + data.size;
    }
    const size = central.reduce((n, r) => n + r.length, 0);
    if (offset > Max32) throw new ZipError('Too big for one zip (4 GB at most)');
    const end = new Uint8Array(22);
    const e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, entries.length, true);
    e.setUint16(10, entries.length, true);
    e.setUint32(12, size, true);
    e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

/**
 * The entries of a .zip: files (stored or deflated) and folders. Skips the
 * clutter archivers add (`__MACOSX/`, `.DS_Store`, `Thumbs.db`).
 */
export async function readZip(zip: Blob): Promise<{ path: string; folder: boolean; data: Blob; modified: number }[]> {
    const tail = new DataView(await zip.slice(Math.max(0, zip.size - 65_557)).arrayBuffer());
    let eocd = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) {
        if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new ZipError("That isn't a zip file");
    const count = tail.getUint16(eocd + 10, true);
    const cdSize = tail.getUint32(eocd + 12, true);
    const cdOffset = tail.getUint32(eocd + 16, true);
    if (cdOffset === Max32 || count === 0xffff) throw new ZipError('Zip64 archives (over 4 GB) aren\'t supported');
    const cd = new DataView(await zip.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
    const decoder = new TextDecoder();
    const out: { path: string; folder: boolean; data: Blob; modified: number }[] = [];
    let p = 0;
    for (let i = 0; i < count; i++) {
        if (cd.getUint32(p, true) !== 0x02014b50) throw new ZipError('The zip is damaged');
        const method = cd.getUint16(p + 10, true);
        const time = cd.getUint16(p + 12, true), date = cd.getUint16(p + 14, true);
        const compressed = cd.getUint32(p + 20, true);
        const nameLength = cd.getUint16(p + 28, true), extraLength = cd.getUint16(p + 30, true), commentLength = cd.getUint16(p + 32, true);
        const localOffset = cd.getUint32(p + 42, true);
        const path = decoder.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLength)).replace(/\\/g, '/');
        p += 46 + nameLength + extraLength + commentLength;
        if (/(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$)/.test(path)) continue;
        const modified = new Date(1980 + (date >> 9), ((date >> 5) & 15) - 1, date & 31, time >> 11, (time >> 5) & 63, (time & 31) * 2).getTime();
        if (path.endsWith('/')) { out.push({ path: path.slice(0, -1), folder: true, data: new Blob([]), modified }); continue; }
        const local = new DataView(await zip.slice(localOffset, localOffset + 30).arrayBuffer());
        if (local.getUint32(0, true) !== 0x04034b50) throw new ZipError('The zip is damaged');
        const start = localOffset + 30 + local.getUint16(26, true) + local.getUint16(28, true);
        const raw = zip.slice(start, start + compressed);
        let data: Blob;
        if (method === 0) data = raw;
        else if (method === 8) data = await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
        else throw new ZipError(`${path} uses a compression this can't read`);
        out.push({ path, folder: false, data, modified });
    }
    return out;
}
