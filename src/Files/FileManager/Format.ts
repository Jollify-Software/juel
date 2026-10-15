// How the file manager shows sizes and dates, as OneDrive does: "5.95 MB",
// "4 items"; "14:05" today, "October 3" this year, "October 3, 2024" before.
import { FileRecord } from '../Storage/IFileStorage';

/** Bytes as people read them: `0 bytes`, `512 bytes`, `18.6 KB`, `5.95 MB`. */
export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024, unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
    const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${Number(value.toFixed(digits))} ${units[unit]}`;
}

/** A file's size, or a folder's item count. */
export function formatItemSize(record: FileRecord): string {
    if (record.kind === 'folder') return `${record.items ?? 0} ${record.items === 1 ? 'item' : 'items'}`;
    return formatSize(record.size);
}

/** A date in the list: the time if today, the day if this year, else the full date. */
export function formatDate(ms: number, now = new Date(), locale?: string): string {
    const date = new Date(ms);
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (date.getFullYear() === now.getFullYear()) return date.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** `1 item`, `3 items`, or a name when there's one. */
export function countLabel(records: FileRecord[]): string {
    if (records.length === 1) return `"${records[0].name}"`;
    return `${records.length} items`;
}
