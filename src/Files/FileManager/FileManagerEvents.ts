// What <juel-file-manager> tells the page. All bubble and are composed.
//
// The `file-before-*` events let a page (the Jollify app, say) take part in a
// change before it happens: add `notes` to the confirmation ("Used by 3
// decks"), `waitUntil` a promise of its own (resolve false to stop it), or
// `preventDefault()` to cancel.
import { FileRecord, PathChange } from '../Storage/IFileStorage';

export interface BeforeChangeDetail {
    /** Lines added to the confirmation the user sees (if there is one). */
    notes: string[];
    /** Waits for this before going ahead; resolving `false` cancels. */
    waitUntil(work: Promise<boolean | void>): void;
}

export interface BeforeDeleteDetail extends BeforeChangeDetail {
    records: FileRecord[];
}

export interface BeforeMoveDetail extends BeforeChangeDetail {
    /** Where each selected item would go. */
    moves: PathChange[];
    /** A copy, not a move. */
    copy: boolean;
    /** A rename in place (one item, same folder). */
    rename: boolean;
}

export interface FileManagerEventMap {
    /** The folder on show changed. */
    'path-changed': CustomEvent<{ path: string }>;
    /** The selection changed. */
    'selection-changed': CustomEvent<{ paths: string[]; records: FileRecord[] }>;
    /** A file was opened (double-click, Enter, Open). Cancelable: the default is to download it. */
    'file-open': CustomEvent<{ record: FileRecord }>;
    'file-before-delete': CustomEvent<BeforeDeleteDetail>;
    'file-before-move': CustomEvent<BeforeMoveDetail>;
    /** After items were deleted: the paths of the files that went. */
    'file-deleted': CustomEvent<{ paths: string[] }>;
    /** After a move, rename or copy: every item that moved, folders and the files in them. */
    'file-moved': CustomEvent<{ moves: PathChange[]; copy: boolean; rename: boolean }>;
    /** After files were added (upload, paste, drop, new folder). */
    'file-added': CustomEvent<{ records: FileRecord[] }>;
    /** Something failed; the manager also says so in its status line. */
    'file-error': CustomEvent<{ error: unknown; message: string }>;
}

/** A command a page adds to the bar and the ⋯ menu. */
export interface FileCommand {
    id: string;
    label: string;
    /** An icon name from the manager's set (`insert`, `open`, …), or none. */
    icon?: string;
    /** Shown for this selection; default: one or more items selected. */
    when?(records: FileRecord[]): boolean;
    run(records: FileRecord[]): void | Promise<void>;
}

/** Runs a before-event and settles it: false if a listener cancelled it. */
export async function settle<T extends BeforeChangeDetail>(target: EventTarget, name: string, detail: Omit<T, keyof BeforeChangeDetail>): Promise<{ go: boolean; notes: string[] }> {
    const waits: Promise<boolean | void>[] = [];
    const full = { ...detail, notes: [] as string[], waitUntil: (work: Promise<boolean | void>) => { waits.push(work); } } as T;
    const event = new CustomEvent(name, { detail: full, bubbles: true, composed: true, cancelable: true });
    const go = target.dispatchEvent(event);
    if (!go) return { go: false, notes: full.notes };
    const results = await Promise.all(waits);
    return { go: results.every(r => r !== false), notes: full.notes };
}
