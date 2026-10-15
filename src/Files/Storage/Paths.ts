// Paths in a file storage: `/`-separated from the root, no leading slash,
// NFC. The same rules for every storage, so a path that works in the browser
// works on a server.
import { FileStorageError } from './IFileStorage';

/** `./a//b\c/` → `a/b/c`. */
export function normalise(path: string): string {
    return path.normalize('NFC').replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '').replace(/\/{2,}/g, '/').replace(/\/$/, '').trim();
}

const Unsafe = /[\u0000-\u001f<>:"|?*]/;

/** A normalised path, or an `invalid-path` error for one that can't be stored. */
export function checkPath(path: string): string {
    const p = normalise(path);
    if (!p) throw new FileStorageError('invalid-path', 'A file needs a name', path);
    for (const part of p.split('/')) {
        if (!part.trim() || part === '.' || part === '..') throw new FileStorageError('invalid-path', `"${path}" isn't a valid path`, path);
        if (Unsafe.test(part)) throw new FileStorageError('invalid-path', `"${part}" has a character a file name can't have`, path);
    }
    return p;
}

/** `a/b/c.png` → `['a', 'a/b']`. */
export function parentsOf(path: string): string[] {
    const parts = path.split('/').slice(0, -1);
    return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}

/** `a/b/c.png` → `c.png`. */
export function nameOf(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1);
}

/** `a/b/c.png` → `a/b`; `c.png` → `''`. */
export function folderOf(path: string): string {
    const slash = path.lastIndexOf('/');
    return slash < 0 ? '' : path.slice(0, slash);
}

/** `a` + `b.png` → `a/b.png`; `''` + `b.png` → `b.png`. */
export function join(folder: string, name: string): string {
    return folder ? `${folder}/${name}` : name;
}

/** True if `path` is `folder` or inside it. */
export function within(path: string, folder: string): boolean {
    return !folder || path === folder || path.startsWith(folder + '/');
}

/** The first of `name.ext`, `name (2).ext`, `name (3).ext`, … that `taken` says is free. */
export function uniquePath(path: string, taken: (path: string) => boolean): string {
    const p = normalise(path);
    if (!taken(p)) return p;
    const slash = p.lastIndexOf('/');
    const dot = p.lastIndexOf('.');
    const [stem, ext] = dot > slash + 1 ? [p.slice(0, dot), p.slice(dot)] : [p, ''];
    const base = stem.replace(/ \(\d+\)$/, '');
    for (let n = 2; ; n++) {
        const candidate = `${base} (${n})${ext}`;
        if (!taken(candidate)) return candidate;
    }
}

const Types: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon', bmp: 'image/bmp',
    mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/opus', flac: 'audio/flac',
    css: 'text/css', json: 'application/json', csv: 'text/csv', md: 'text/markdown', txt: 'text/plain', html: 'text/html', htm: 'text/html',
    js: 'text/javascript', xml: 'application/xml', yaml: 'application/yaml', yml: 'application/yaml', pdf: 'application/pdf', zip: 'application/zip',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
};

/** A media type from the extension, for files whose Blob has none. */
export function typeOf(path: string): string {
    return Types[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
}

export type FileKind = 'folder' | 'picture' | 'video' | 'sound' | 'font' | 'data' | 'text' | 'document' | 'archive' | 'other';

/** What sort of thing a file is, for its icon and its preview. */
export function kindOf(record: { kind: 'file' | 'folder'; type: string; path: string }): FileKind {
    if (record.kind === 'folder') return 'folder';
    const type = record.type || typeOf(record.path);
    if (type.startsWith('image/')) return 'picture';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'sound';
    if (type.startsWith('font/')) return 'font';
    if (/json|csv|yaml|xml/.test(type)) return 'data';
    if (type === 'application/pdf') return 'document';
    if (type === 'application/zip') return 'archive';
    if (type.startsWith('text/')) return 'text';
    return 'other';
}

/** True if a file matches an `accept` list (`image/*`, `.csv`, `text/css`); an empty list matches everything. */
export function accepts(accept: string[] | undefined, record: { type: string; path: string }): boolean {
    if (!accept?.length) return true;
    const type = (record.type || typeOf(record.path)).toLowerCase();
    const name = record.path.toLowerCase();
    return accept.some(a => {
        const rule = a.trim().toLowerCase();
        if (!rule) return false;
        if (rule.startsWith('.')) return name.endsWith(rule);
        if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
        return type === rule;
    });
}
