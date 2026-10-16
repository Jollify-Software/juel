// Pictures for the grid view and the details pane: the storage's thumbnail
// where it has one, else a small enough picture itself. Object URLs, loaded a
// few at a time and kept until the view lets them go.
import { FileRecord, IFileStorage } from '../Storage/IFileStorage';
import { kindOf } from '../Storage/Paths';

/** Pictures bigger than this aren't read whole just for a thumbnail. */
const MaxWhole = 4 * 1024 * 1024;
const AtOnce = 4;

export class Thumbnails {
    /** url, or null for "none"; absent while loading or not asked for. */
    private urls = new Map<string, string | null>();
    private queue: { key: string; storage: IFileStorage; record: FileRecord }[] = [];
    private running = 0;
    private storage?: IFileStorage;

    /** `changed` runs when a thumbnail arrives, so the view can re-render. */
    constructor(private changed: () => void) {}

    /** A thumbnail's URL if it's ready; asks for it if not. */
    get(storage: IFileStorage, record: FileRecord): string | undefined {
        if (storage !== this.storage) { this.clear(); this.storage = storage; }
        const key = keyOf(record);
        const url = this.urls.get(key);
        if (url !== undefined) return url ?? undefined;
        if (!this.queue.some(q => q.key === key) && wanted(record)) {
            this.queue.push({ key, storage, record });
            this.pump();
        }
        return undefined;
    }

    /** Lets every URL go. */
    clear() {
        for (const url of this.urls.values()) if (url) URL.revokeObjectURL(url);
        this.urls.clear();
        this.queue = [];
    }

    private pump() {
        while (this.running < AtOnce && this.queue.length) {
            const { key, storage, record } = this.queue.shift()!;
            this.running++;
            void load(storage, record)
                .catch(() => undefined)
                .then(blob => {
                    this.running--;
                    // Cleared (or the storage changed) while loading: drop it.
                    if (storage === this.storage) {
                        this.urls.set(key, blob ? URL.createObjectURL(blob) : null);
                        this.changed();
                    }
                    this.pump();
                });
        }
    }
}

function keyOf(record: FileRecord) {
    return `${record.id}:${record.modified}`;
}

function wanted(record: FileRecord) {
    const kind = kindOf(record);
    return kind === 'picture' || kind === 'video';
}

async function load(storage: IFileStorage, record: FileRecord): Promise<Blob | undefined> {
    if (storage.capabilities.thumbnails && storage.thumbnail && record.meta?.hasThumbnail !== false) {
        const small = await storage.thumbnail(record.path);
        if (small) return small;
    }
    if (kindOf(record) === 'picture' && record.size <= MaxWhole) return storage.read(record.path);
    return undefined;
}
