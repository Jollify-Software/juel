// <juel-file-manager>: a OneDrive-like view of an IFileStorage. A command bar
// that follows the selection, a breadcrumb, and a details list (Name,
// Modified, Size) with checkboxes, a ⋯ menu per row, inline rename, Move to /
// Copy to, upload, download (a folder or several items as a .zip), delete,
// and the keyboard. See src/Files/README.md.
//
//   <juel-file-manager root-label="My files"></juel-file-manager>
//   manager.storage = new MemoryFileStorage();   // or await BrowserFileStorage.open()
import { LitElement, PropertyValues, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { FileRecord, FileSortKey, FileStorageError, IFileStorage, ListOptions, PathChange, StorageQuota } from '../Storage/IFileStorage';
import { folderOf, join, kindOf, nameOf, parentsOf, uniquePath, within } from '../Storage/Paths';
import { canSaveToDisk, entriesUnder, saveToDirectory, unzipInto } from '../Zip/Transfer';
import { readZip, writeZip, ZipEntry } from '../Zip/Zip';
import { MessageBoxModule } from '../../_Modules/MessageBox/MessageBoxModule';
import { MessageBoxButtons } from '../../_Modules/MessageBox/MessageBoxButtons';
import { MessageBoxResultStatus } from '../../_Modules/MessageBox/MessageBoxResultStatus';
import { FileManagerStyles } from './FileManagerStyles';
import { icon, kindIcon } from './Icons';
import { countLabel, formatDate, formatDateTime, formatDuration, formatItemSize, formatSize, kindLabel } from './Format';
import { Selection, SelectionMode } from './Selection';
import { DroppedItem, hasFiles, readDrop } from './Drop';
import { Thumbnails } from './Thumbnails';
import { JuelFileViewer } from './FileViewer';
import { BeforeDeleteDetail, BeforeMoveDetail, FileCommand, settle } from './FileManagerEvents';

interface DropOn {
    kind: 'view' | 'folder' | 'crumb';
    path: string;
    /** Rows dragged within the view (a move), not files from the desktop (a copy). */
    move?: boolean;
}

/** What a drag carries: files from the desktop, or rows from this view. */
type DragKind = 'files' | 'rows';

/** The drag data type for rows: a JSON array of paths. */
export const FileDragType = 'application/x-juel-file';

interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    danger?: boolean;
    checked?: boolean;
    /** A line before this item. */
    separator?: boolean;
    run(): void;
}

interface Command extends MenuItem {
    /** In the bar as well as the ⋯ menu. */
    bar?: boolean;
}

type Column = 'name' | 'modified' | 'size';
export type FileView = 'list' | 'grid';

const ColumnSort: Record<Column, FileSortKey> = { name: 'name', modified: 'modified', size: 'size' };
const LongPress = 500;

@customElement('juel-file-manager')
export class JuelFileManager extends LitElement {
    static styles = FileManagerStyles;

    /** Where the files are. Set it as a property. */
    @property({ attribute: false }) storage?: IFileStorage;
    /** The folder on show (`''` is the top). */
    @property({ reflect: true }) path = '';
    /** The top's name in the breadcrumb. */
    @property({ attribute: 'root-label' }) rootLabel = 'My files';
    @property({ attribute: 'selection-mode' }) selectionMode: SelectionMode = 'multiple';
    /** Only show files of these types (comma-separated: `image/*,.csv`); folders always show. */
    @property() accept = '';
    @property() sort: FileSortKey = 'name';
    @property({ type: Boolean, reflect: true }) descending = false;
    /** No changes: browse, open and download only. Also when the storage can't write. */
    @property({ type: Boolean, reflect: true }) readonly = false;
    /** Browse only: open, download, upload and new folder, but no rename, move, copy, duplicate, extract or delete (what <juel-file-picker> sets). */
    @property({ type: Boolean, reflect: true }) browse = false;
    /** Don't ask before deleting. */
    @property({ type: Boolean, attribute: 'no-confirm' }) noConfirm = false;
    /** How many items to ask the storage for at once. */
    @property({ type: Number, attribute: 'page-size' }) pageSize = 500;
    /** `list` (details) or `grid` (thumbnails). The View menu changes it. */
    @property({ reflect: true }) view: FileView = 'list';
    /** Shows the details pane. The Details button toggles it. */
    @property({ type: Boolean, reflect: true }) details = false;
    /** The page's own commands, in the bar and the ⋯ menu. */
    @property({ attribute: false }) commands: FileCommand[] = [];
    /** Asks before something can't be undone; resolves true to go ahead. The default is Juel's message box. */
    @property({ attribute: false }) confirm: (title: string, text: string, action: string) => Promise<boolean> = confirmWithMessageBox;

    @state() private items: FileRecord[] = [];
    @state() private next?: string;
    @state() private loading = false;
    @state() private renaming?: string;
    @state() private menu?: { anchor: Element | { x: number; y: number }; items: MenuItem[]; label: string };
    @state() private chooser?: { copy: boolean; records: FileRecord[]; folders: FileRecord[]; target: string };
    @state() private message = '';
    @state() private messageIsError = false;
    /** Where files dragged from the desktop would land: the view, a folder row or a crumb. */
    @state() private dropOn?: DropOn;
    /** Bumped when the selection changes, so Lit re-renders. */
    @state() private selectionVersion = 0;
    /** What's being searched for, in the folder on show and below; '' for none. */
    @state() private query = '';
    /** How full the storage is, for storages that know. */
    @state() private quota?: StorageQuota;
    /** The bar's commands don't fit with their labels: icons only. */
    @state() private compact = false;
    /** Icons only still don't fit: how many show; the rest are under ⋯. */
    @state() private barShown?: number;

    @query('.list') private listElement!: HTMLElement;
    @query('.menu') private menuElement?: HTMLElement;
    @query('dialog') private dialogElement?: HTMLDialogElement;
    @query('input.files') private fileInput!: HTMLInputElement;
    @query('input.folder') private folderInput!: HTMLInputElement;
    @query('input.zip') private zipInput!: HTMLInputElement;

    private selection = new Selection();
    private unsubscribe?: () => void;
    private reloadQueued = false;
    private loadToken = 0;
    private pressTimer?: number;
    private pressed = false;
    private messageTimer?: number;
    /** dragenter minus dragleave: the list's children fire them too. */
    private dragDepth = 0;
    /** The rows being dragged, while a drag from this view is on. */
    private dragging?: FileRecord[];
    /** The last pointerdown was a touch: touch keeps long-press to select, not drag. */
    private touching = false;
    private thumbnails = new Thumbnails(() => this.requestUpdate());
    private viewer?: JuelFileViewer;
    private searchTimer?: number;
    /** The commands and width the bar was last fitted for. */
    private barKey = '';
    /** The ids of the bar's commands at the last render. */
    private barIds = '';
    private resizeObserver = new ResizeObserver(() => this.requestUpdate());

    // --- public ------------------------------------------------------------

    /** The selected items, in list order. */
    get selectedRecords(): FileRecord[] {
        const byPath = new Map(this.items.map(i => [i.path, i]));
        return this.selection.paths.map(p => byPath.get(p)!).filter(Boolean);
    }

    /** What's on show, in order. */
    get records(): FileRecord[] {
        return this.items;
    }

    /** Shows a folder. */
    async navigate(path: string) {
        if (path === this.path) {
            if (this.query) { this.query = ''; await this.updateComplete; await this.loaded; } else await this.reload();
            return;
        }
        this.path = path;
        this.selection.clear();
        this.dispatch('path-changed', { path });
        await this.updateComplete;
        await this.loaded;
    }

    /** Selects these paths (in the folder on show). */
    select(paths: string[]) {
        this.selection.set(paths);
        this.selectionChanged();
    }

    /** Lists the folder again. */
    async reload() {
        await this.load(true);
    }

    /** Starts renaming an item on show. */
    async startRename(path: string) {
        if (!this.canWrite) return;
        this.renaming = path;
        await this.updateComplete;
        const input = this.renderRoot.querySelector<HTMLInputElement>('input.rename');
        if (!input) return;
        input.focus();
        const name = nameOf(path);
        const dot = name.lastIndexOf('.');
        input.setSelectionRange(0, this.items.find(i => i.path === path)?.kind === 'file' && dot > 0 ? dot : name.length);
    }

    /** Uploads files into a folder (default: the one on show). A `webkitRelativePath` keeps its folders. A clash keeps both. */
    async upload(files: Iterable<File>, folder = this.path): Promise<FileRecord[]> {
        const items = [...files].map(file => ({ file, relative: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name }));
        return this.uploadItems(items, folder);
    }

    /** Searches the folder on show and below for names containing `text` (`''` stops searching). */
    async search(text: string) {
        window.clearTimeout(this.searchTimer);
        this.query = text.trim();
        await this.updateComplete;
        await this.loaded;
    }

    /** Opens a file in the viewer (a folder: goes in). */
    open(record: FileRecord) {
        if (record.kind === 'folder') { void this.navigate(record.path); return; }
        if (this.dispatch('file-open', { record }, true)) this.openViewer(record);
    }

    /** Shows `message` in the status line, as the manager's own actions do (an error stays until the next message). */
    announce(message: string, error = false) {
        this.say(message, error);
    }

    /** Resolves when the folder on show has loaded. */
    loaded: Promise<void> = Promise.resolve();

    // --- lifecycle ---------------------------------------------------------

    constructor() {
        super();
        this.addEventListener('paste', this.onPaste);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
        this.resizeObserver.observe(this);
        this.subscribe();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
        this.resizeObserver.disconnect();
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        this.viewer?.close();
        this.viewer?.remove();
        this.thumbnails.clear();
    }

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has('selectionMode')) this.selection.mode = this.selectionMode;
        if (changed.has('storage')) { this.subscribe(); this.thumbnails.clear(); }
        // Going somewhere else ends a search.
        if ((changed.has('path') || changed.has('storage')) && !changed.has('query' as keyof JuelFileManager)) this.query = '';
        if (changed.has('storage') || changed.has('path') || changed.has('sort') || changed.has('descending') || changed.has('accept') || changed.has('query' as keyof JuelFileManager)) {
            if (changed.has('path') || changed.has('storage')) { this.renaming = undefined; this.selection.clear(); }
            this.loaded = this.load(false);
        }
    }

    protected updated(changed: PropertyValues<this>) {
        if (changed.has('menu' as keyof JuelFileManager) && this.menu) void this.placeMenu();
        this.toggleAttribute('selecting', this.selection.size > 0);
        this.fitBar();
    }

    /**
     * Labels where they fit, icons where they don't. When the commands or the width change,
     * the bar is laid out with labels first and measured (both before the browser paints).
     */
    private fitBar() {
        const commands = this.renderRoot.querySelector<HTMLElement>('.bar .commands');
        if (!commands) return;
        const key = this.barIds + ':' + this.clientWidth;
        if (key !== this.barKey) {
            this.barKey = key;
            if (this.compact || this.barShown !== undefined) { this.compact = false; this.barShown = undefined; return; }
        }
        const overflowing = commands.scrollWidth > commands.clientWidth + 1;
        if (!overflowing || this.barShown !== undefined) return;
        if (!this.compact) { this.compact = true; return; }
        // Keep the commands that fit with room for the ⋯ button.
        const right = commands.getBoundingClientRect().left + commands.clientWidth - 40;
        const buttons = [...commands.children] as HTMLElement[];
        const fit = buttons.findIndex(b => b.getBoundingClientRect().right > right);
        this.barShown = fit < 0 ? buttons.length : fit;
    }

    private subscribe() {
        this.unsubscribe?.();
        this.unsubscribe = this.isConnected ? this.storage?.subscribe(() => this.queueReload()) : undefined;
    }

    private queueReload() {
        if (this.reloadQueued) return;
        this.reloadQueued = true;
        queueMicrotask(() => {
            this.reloadQueued = false;
            this.loaded = this.load(true);
        });
    }

    private async load(keep: boolean) {
        const storage = this.storage;
        const token = ++this.loadToken;
        if (!storage) { this.items = []; this.next = undefined; return; }
        this.loading = true;
        try {
            const options = this.listOptions();
            let { items, next } = await storage.list(this.path, options);
            // A reload keeps as many pages as were on show.
            while (keep && next && items.length < this.items.length) {
                const page = await storage.list(this.path, { ...options, cursor: next });
                items = [...items, ...page.items];
                next = page.next;
            }
            if (token !== this.loadToken) return;
            this.items = items;
            this.next = next;
            this.selection.setItems(items.map(i => i.path));
            if (this.renaming && !items.some(i => i.path === this.renaming)) this.renaming = undefined;
            this.selectionChanged(false);
            void this.loadQuota(storage);
        } catch (error) {
            if (token !== this.loadToken) return;
            this.items = [];
            this.next = undefined;
            this.selection.setItems([]);
            if (error instanceof FileStorageError && error.code === 'not-found' && this.path) {
                this.say(`"${this.path}" isn't there any more`, true);
            } else {
                this.fail(error);
            }
        } finally {
            if (token === this.loadToken) this.loading = false;
        }
    }

    private async loadQuota(storage: IFileStorage) {
        if (!storage.capabilities.quota || !storage.quota) { this.quota = undefined; return; }
        try {
            const quota = await storage.quota();
            if (storage === this.storage) this.quota = quota.quota ? quota : undefined;
        } catch {
            this.quota = undefined;
        }
    }

    /** How to list: a search looks below the folder too. */
    private listOptions(): ListOptions {
        const accept = this.accept.split(',').map(a => a.trim()).filter(Boolean);
        const options: ListOptions = { sort: this.sort, descending: this.descending, accept, limit: this.pageSize };
        if (this.query) { options.search = this.query; options.deep = true; }
        return options;
    }

    private async loadMore() {
        if (!this.storage || !this.next) return;
        try {
            const page = await this.storage.list(this.path, { ...this.listOptions(), cursor: this.next });
            this.items = [...this.items, ...page.items];
            this.next = page.next;
            this.selection.setItems(this.items.map(i => i.path));
        } catch (error) {
            this.fail(error);
        }
    }

    // --- what can be done --------------------------------------------------

    private get canWrite(): boolean {
        return !this.readonly && !!this.storage && this.storage.capabilities.write;
    }

    /** Changes to what is already there: rename, move, copy, delete. */
    private get canEdit(): boolean {
        return this.canWrite && !this.browse;
    }

    private get canCopy(): boolean {
        return this.canEdit && !!this.storage?.capabilities.copy;
    }

    /** The commands for these items (none: the folder's own). */
    private commandsFor(records: FileRecord[]): Command[] {
        const write = this.canEdit;
        if (!records.length) {
            const commands: Command[] = [];
            if (this.canWrite) {
                commands.push({ id: 'new-folder', label: 'New folder', icon: 'new-folder', bar: true, run: () => void this.newFolder() });
                commands.push({ id: 'upload', label: 'Upload', icon: 'upload', bar: true, run: () => this.openUploadMenu() });
            }
            for (const c of this.commands.filter(c => c.when?.([]))) commands.push({ ...this.pageCommand(c, []), bar: true });
            if (canSaveToDisk() && !this.browse) commands.push({ id: 'save-to-disk', label: 'Save to disk', icon: 'download', bar: true, run: () => void this.saveToDisk([]) });
            return commands;
        }
        const one = records.length === 1 ? records[0] : undefined;
        const commands: Command[] = [];
        if (one) commands.push({ id: 'open', label: 'Open', icon: 'open', bar: true, run: () => this.open(one) });
        for (const c of this.commands.filter(c => (c.when ? c.when(records) : true))) commands.push({ ...this.pageCommand(c, records), bar: true });
        commands.push({ id: 'download', label: 'Download', icon: 'download', bar: true, run: () => void this.download(records) });
        if (canSaveToDisk() && !this.browse) commands.push({ id: 'save-to-disk', label: 'Save to disk', icon: 'download', run: () => void this.saveToDisk(records) });
        if (write && one) commands.push({ id: 'rename', label: 'Rename', icon: 'rename', bar: true, run: () => void this.startRename(one.path) });
        if (write) commands.push({ id: 'move', label: 'Move to', icon: 'move', bar: true, run: () => void this.openChooser(records, false) });
        if (write && one && kindOf(one) === 'archive') commands.push({ id: 'extract', label: 'Extract', icon: 'archive', run: () => void this.extract(one) });
        if (this.canCopy) {
            commands.push({ id: 'copy', label: 'Copy to', icon: 'copy', bar: true, run: () => void this.openChooser(records, true) });
            commands.push({ id: 'duplicate', label: 'Duplicate', icon: 'duplicate', run: () => void this.duplicate(records) });
        }
        if (write) commands.push({ id: 'delete', label: 'Delete', icon: 'delete', danger: true, bar: true, separator: true, run: () => void this.deleteItems(records) });
        return commands;
    }

    private pageCommand(c: FileCommand, records: FileRecord[]): Command {
        return {
            id: c.id, label: c.label, icon: c.icon,
            run: () => { Promise.resolve(c.run(records)).catch(error => this.fail(error)); },
        };
    }

    // --- actions -----------------------------------------------------------

    /** The viewer goes on the page's body, so a panel's transform or overflow can't clip it and Juel's message box shows over it. */
    private openViewer(record: FileRecord) {
        const storage = this.storage;
        if (!storage) return;
        let viewer = this.viewer;
        if (!viewer) {
            viewer = this.viewer = document.createElement('juel-file-viewer');
            viewer.addEventListener('viewer-change', e => this.select([(e as CustomEvent).detail.record.path]));
            viewer.addEventListener('viewer-download', e => {
                e.preventDefault();
                void this.download([(e as CustomEvent).detail.record]);
            });
            viewer.addEventListener('viewer-delete', e => void this.deleteFromViewer((e as CustomEvent).detail.record));
            viewer.addEventListener('viewer-close', () => {
                viewer!.remove();
                const record = viewer!.current;
                if (record && this.items.some(i => i.path === record.path)) this.select([record.path]);
                this.focusList();
            });
        }
        if (!viewer.isConnected) document.body.append(viewer);
        viewer.canDelete = this.canEdit;
        const files = this.items.filter(i => i.kind === 'file');
        void viewer.show(storage, files, files.indexOf(record));
    }

    private async deleteFromViewer(record: FileRecord) {
        if (await this.deleteItems([record])) this.viewer?.forget(record);
        this.viewer?.shadowRoot?.querySelector<HTMLElement>('.close')?.focus();
    }

    private async newFolder() {
        const storage = this.storage;
        if (!storage) return;
        try {
            const path = await storage.uniquePath(join(this.path, 'New folder'));
            const record = await storage.makeFolder(path);
            this.dispatch('file-added', { records: [record] });
            await this.load(true);
            this.select([path]);
            await this.startRename(path);
        } catch (error) {
            this.fail(error);
        }
    }

    private async commitRename(record: FileRecord, input: HTMLInputElement) {
        if (this.renaming !== record.path) return;
        const name = input.value.trim();
        this.renaming = undefined;
        if (!name || name === record.name) { this.focusList(); return; }
        const target = join(folderOf(record.path), name);
        await this.moveItems([record], [{ from: record.path, to: target }], { copy: false, rename: true });
        this.focusList();
    }

    private cancelRename() {
        this.renaming = undefined;
        this.focusList();
    }

    /** Moves or copies, after asking the page; reports and selects the results. */
    private async moveItems(records: FileRecord[], moves: PathChange[], { copy, rename }: { copy: boolean; rename: boolean }) {
        const storage = this.storage;
        if (!storage || !moves.length) return;
        const { go } = await settle<BeforeMoveDetail>(this, 'file-before-move', { moves, copy, rename });
        if (!go) return;
        const done: PathChange[] = [];
        try {
            for (const m of moves) done.push(...await (copy ? storage.copy(m.from, m.to) : storage.move(m.from, m.to)));
        } catch (error) {
            this.fail(error);
        }
        if (!done.length) return;
        this.dispatch('file-moved', { moves: done, copy, rename });
        const verb = rename ? 'Renamed' : copy ? 'Copied' : 'Moved';
        const dest = folderOf(moves[0].to);
        const where = rename ? ` to "${nameOf(moves[0].to)}"` : dest === this.path ? '' : ` to ${dest ? `"${nameOf(dest)}"` : this.rootLabel}`;
        this.say(`${verb} ${countLabel(records)}${where}`);
        await this.load(true);
        const here = moves.map(m => m.to).filter(p => folderOf(p) === this.path);
        if (here.length) this.select(here);
    }

    private async duplicate(records: FileRecord[]) {
        const storage = this.storage;
        if (!storage) return;
        const taken = new Set<string>();
        const moves: PathChange[] = [];
        for (const r of records) {
            let to = await storage.uniquePath(r.path);
            if (taken.has(to)) to = uniquePath(to, p => taken.has(p) || this.items.some(i => i.path === p));
            taken.add(to);
            moves.push({ from: r.path, to });
        }
        await this.moveItems(records, moves, { copy: true, rename: false });
    }

    /** Deletes after asking; true if anything went. */
    private async deleteItems(records: FileRecord[]): Promise<boolean> {
        const storage = this.storage;
        if (!storage || !records.length) return false;
        const { go, notes } = await settle<BeforeDeleteDetail>(this, 'file-before-delete', { records });
        if (!go) return false;
        if (!this.noConfirm) {
            const folders = records.filter(r => r.kind === 'folder' && r.items);
            const text = [
                `Delete ${countLabel(records)}?`,
                folders.length ? (folders.length === 1 && records.length === 1 ? 'Everything in it goes too.' : 'Everything in the folders goes too.') : '',
                ...notes,
                "This can't be undone.",
            ].filter(Boolean).join(' ');
            if (!await this.confirm('Delete', text, 'Delete')) return false;
        }
        const paths: string[] = [];
        try {
            for (const r of records) paths.push(...await storage.remove(r.path));
        } catch (error) {
            this.fail(error);
        }
        this.dispatch('file-deleted', { paths });
        this.say(`Deleted ${countLabel(records)}`);
        await this.load(true);
        if (!this.viewer?.open) this.focusList();
        return paths.length > 0;
    }

    /** One file as itself; a folder or several items as a .zip. */
    private async download(records: FileRecord[]) {
        const storage = this.storage;
        if (!storage || !records.length) return;
        try {
            if (records.length === 1 && records[0].kind === 'file') {
                save(await storage.read(records[0].path), records[0].name);
                return;
            }
            const entries: ZipEntry[] = [];
            for (const r of records) {
                if (r.kind === 'file') { entries.push({ path: r.name, data: await storage.read(r.path), modified: r.modified }); continue; }
                const inside = await entriesUnder(storage, r.path);
                if (!inside.length) entries.push({ path: r.name + '/', modified: r.modified });
                for (const e of inside) entries.push({ ...e, path: `${r.name}/${e.path}` });
            }
            const name = records.length === 1 ? `${records[0].name}.zip` : `${this.path ? nameOf(this.path) : this.rootLabel}.zip`;
            this.say(`Packing ${name}…`);
            save(await writeZip(entries), name);
            this.say(`Downloaded ${name}`);
        } catch (error) {
            this.fail(error);
        }
    }

    /** Writes these items (none: the folder on show) into a folder on disk the user picks (Chrome and Edge). */
    private async saveToDisk(records: FileRecord[]) {
        const storage = this.storage;
        if (!storage) return;
        let root: FileSystemDirectoryHandle;
        try {
            root = await (globalThis as any).showDirectoryPicker({ mode: 'readwrite' });
        } catch (error) {
            if ((error as Error)?.name !== 'AbortError') this.fail(error);
            return;
        }
        try {
            this.say('Saving…');
            let count = 0;
            if (!records.length) count = await saveToDirectory(storage, this.path, root);
            for (const r of records) {
                if (r.kind === 'folder') {
                    count += await saveToDirectory(storage, r.path, await root.getDirectoryHandle(r.name, { create: true }));
                    continue;
                }
                const writable = await (await root.getFileHandle(r.name, { create: true })).createWritable();
                await writable.write(await storage.read(r.path));
                await writable.close();
                count++;
            }
            this.say(`Saved ${count === 1 ? '1 file' : `${count} files`} to "${root.name}"`);
        } catch (error) {
            this.fail(error);
        }
    }

    /** Uploads files (and makes empty folders) at paths relative to a folder. A clash keeps both. */
    private async uploadItems(items: DroppedItem[], folder: string): Promise<FileRecord[]> {
        const storage = this.storage;
        if (!storage || !this.canWrite) return [];
        const added: FileRecord[] = [];
        const renamed: string[] = [];
        let files = 0;
        try {
            for (const item of items) {
                const path = join(folder, item.relative);
                if (!item.file) { added.push(await storage.makeFolder(path)); continue; }
                const result = await storage.write(path, item.file, { onConflict: 'keep-both' });
                if (result.outcome === 'renamed') renamed.push(result.record.name);
                added.push(result.record);
                files++;
            }
            (storage as IFileStorage & { keep?: () => Promise<boolean> }).keep?.();
            const what = added.length === 1 ? `"${added[0].name}"` : files === added.length ? `${files} files` : countLabel(added);
            this.say(`Uploaded ${what}` + (renamed.length ? `; kept both where names clashed: ${renamed.join(', ')}` : ''));
            if (added.length) this.dispatch('file-added', { records: added });
        } catch (error) {
            this.fail(error);
        }
        return added;
    }

    /** Unpacks a .zip that's in the storage, beside it. */
    private async extract(record: FileRecord) {
        if (!this.storage) return;
        try {
            await this.unpack(await this.storage.read(record.path), record.name, folderOf(record.path));
        } catch (error) {
            this.fail(error);
        }
    }

    /**
     * Unpacks a zip into a folder, as Extract All does: a zip that holds one folder gives that
     * folder; anything else goes into a new folder named after the zip. With `inPlace` (restoring
     * a backup) everything goes straight into `folder`, as it was in the zip. A clash keeps both,
     * and a file already there with the same bytes is left alone.
     */
    async unpack(zip: Blob, name: string, folder = this.path, options: { inPlace?: boolean } = {}): Promise<FileRecord | undefined> {
        const storage = this.storage;
        if (!storage || !this.canWrite) return undefined;
        try {
            this.say(`Unpacking "${name}"…`);
            const entries = await readZip(zip);
            const tops = new Set(entries.map(e => e.path.split('/')[0]));
            const oneFolder = tops.size === 1 && entries.every(e => e.path.includes('/') || e.folder);
            let target = folder;
            if (!oneFolder && !options.inPlace) {
                target = await storage.uniquePath(join(folder, name.replace(/\.zip$/i, '') || 'Unpacked'));
                await storage.makeFolder(target);
            }
            const result = await unzipInto(storage, zip, target, 'keep-both');
            // What appeared: the zip's top-level items in place, else the one folder it made.
            const added = options.inPlace
                ? (await Promise.all([...tops].map(t => storage.stat(join(folder, t))))).filter((r): r is FileRecord => !!r)
                : [await storage.stat(oneFolder ? join(folder, [...tops][0]) : target)].filter((r): r is FileRecord => !!r);
            const made = options.inPlace ? undefined : added[0];
            this.say(`Unpacked ${result.files} ${result.files === 1 ? 'file' : 'files'} from "${name}"` +
                (result.same ? `; ${result.same} already there` : '') +
                (result.renamed.length ? `; kept both where names clashed: ${result.renamed.map(r => nameOf(r.to)).join(', ')}` : ''));
            if (added.length) this.dispatch('file-added', { records: added });
            await this.load(true);
            const shown = added.filter(r => folderOf(r.path) === this.path);
            if (shown.length) this.select(shown.map(r => r.path));
            return made;
        } catch (error) {
            this.fail(error);
            return undefined;
        }
    }

    private async onZipChosen(e: Event) {
        const input = e.target as HTMLInputElement;
        const files = [...(input.files ?? [])];
        input.value = '';
        for (const file of files) await this.unpack(file, file.name);
    }

    // --- Move to / Copy to -------------------------------------------------

    private async openChooser(records: FileRecord[], copy: boolean) {
        const storage = this.storage;
        if (!storage) return;
        try {
            const { items } = await storage.list('', { deep: true, sort: 'name' });
            // A folder can't go inside itself.
            const folders = items
                .filter(i => i.kind === 'folder' && (copy || !records.some(r => r.kind === 'folder' && within(i.path, r.path))))
                .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));
            this.chooser = { copy, records, folders, target: this.path };
            await this.updateComplete;
            this.dialogElement?.showModal();
            this.dialogElement?.querySelector<HTMLElement>('.folder[aria-selected="true"]')?.focus();
        } catch (error) {
            this.fail(error);
        }
    }

    private async chooseTarget(e: Event) {
        e.preventDefault();
        const chooser = this.chooser;
        this.dialogElement?.close();
        this.chooser = undefined;
        if (!chooser || !this.storage) return;
        await this.moveInto(chooser.records, chooser.target, chooser.copy);
    }

    /** Moves or copies items into a folder; a clash keeps both. */
    private async moveInto(records: FileRecord[], folder: string, copy: boolean) {
        const storage = this.storage;
        if (!storage) return;
        const moves: PathChange[] = [];
        const taken = new Set<string>();
        try {
            for (const r of records) {
                const wanted = join(folder, r.name);
                if (!copy && wanted === r.path) continue;
                let to = await storage.uniquePath(wanted);
                if (taken.has(to)) to = uniquePath(to, p => taken.has(p));
                taken.add(to);
                moves.push({ from: r.path, to });
            }
        } catch (error) {
            this.fail(error);
            return;
        }
        if (!moves.length) { this.say('Already there'); return; }
        await this.moveItems(records, moves, { copy, rename: false });
    }

    private closeChooser() {
        this.dialogElement?.close();
        this.chooser = undefined;
        this.focusList();
    }

    // --- menus -------------------------------------------------------------

    private openMenu(anchor: Element | { x: number; y: number }, items: MenuItem[], label: string) {
        this.menu = items.length ? { anchor, items, label } : undefined;
    }

    private closeMenu(focusList = false) {
        this.menu = undefined;
        if (focusList) this.focusList();
    }

    private async placeMenu() {
        await this.updateComplete;
        const menu = this.menuElement;
        const anchor = this.menu?.anchor;
        if (!menu || !anchor) return;
        const reference = anchor instanceof Element ? anchor : {
            getBoundingClientRect: () => ({ x: anchor.x, y: anchor.y, left: anchor.x, top: anchor.y, right: anchor.x, bottom: anchor.y, width: 0, height: 0 }),
        };
        const { x, y } = await computePosition(reference, menu, { strategy: 'fixed', placement: 'bottom-start', middleware: [offset(4), flip(), shift({ padding: 8 })] });
        Object.assign(menu.style, { left: `${x}px`, top: `${y}px` });
        menu.querySelector<HTMLElement>('button')?.focus();
    }

    private onDocumentPointerDown = (e: PointerEvent) => {
        if (this.menu && !e.composedPath().includes(this.menuElement as EventTarget)) this.closeMenu();
    };

    private onMenuKeydown(e: KeyboardEvent) {
        const buttons = [...(this.menuElement?.querySelectorAll<HTMLElement>('button') ?? [])];
        const at = buttons.indexOf(this.shadowRoot!.activeElement as HTMLElement);
        let next = -1;
        if (e.key === 'ArrowDown') next = (at + 1) % buttons.length;
        else if (e.key === 'ArrowUp') next = (at - 1 + buttons.length) % buttons.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = buttons.length - 1;
        else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); this.closeMenu(true); return; }
        if (next < 0) return;
        e.preventDefault();
        buttons[next]?.focus();
    }

    private runMenuItem(item: MenuItem) {
        this.closeMenu();
        item.run();
    }

    private openUploadMenu() {
        const anchor = this.renderRoot.querySelector('[data-command="upload"]') ?? this;
        this.openMenu(anchor, [
            { id: 'upload-files', label: 'Files', icon: 'file', run: () => this.fileInput.click() },
            { id: 'upload-folder', label: 'Folder', icon: 'new-folder', run: () => this.folderInput.click() },
            { id: 'upload-zip', label: 'Zip, unpacked', icon: 'archive', run: () => this.zipInput.click() },
        ], 'Upload');
    }

    private openViewMenu(anchor: Element) {
        const as = (view: FileView, label: string): MenuItem => ({ id: `view-${view}`, label, icon: view, checked: this.view === view, run: () => { this.view = view; } });
        this.openMenu(anchor, [as('list', 'List'), as('grid', 'Tiles')], 'View');
    }

    private openSortMenu(anchor: Element) {
        const by = (key: FileSortKey, label: string): MenuItem => ({ id: `sort-${key}`, label, checked: this.sort === key, run: () => { this.sort = key; } });
        this.openMenu(anchor, [
            by('name', 'Name'), by('modified', 'Modified'), by('size', 'File size'), by('type', 'Type'),
            { id: 'ascending', label: 'Ascending', checked: !this.descending, separator: true, run: () => { this.descending = false; } },
            { id: 'descending', label: 'Descending', checked: this.descending, run: () => { this.descending = true; } },
        ], 'Sort');
    }

    private openRowMenu(record: FileRecord, anchor: Element | { x: number; y: number }) {
        if (!this.selection.has(record.path)) this.select([record.path]);
        const records = this.selectedRecords;
        this.openMenu(anchor, this.commandsFor(records), `Actions for ${countLabel(records)}`);
    }

    // --- events from the list ----------------------------------------------

    private onRowClick(e: MouseEvent, record: FileRecord) {
        if (this.renaming === record.path) return;
        if (this.pressed) { this.pressed = false; return; }
        const touch = (e as PointerEvent).pointerType === 'touch';
        if (touch && this.selection.size > 0) this.selection.toggle(record.path);
        else this.selection.click(record.path, { toggle: e.ctrlKey || e.metaKey, range: e.shiftKey });
        this.selectionChanged();
        this.focusList();
    }

    private onRowDoubleClick(record: FileRecord) {
        if (this.renaming === record.path) return;
        this.open(record);
    }

    private onCheck(e: Event, record: FileRecord) {
        e.stopPropagation();
        this.selection.toggle(record.path);
        this.selectionChanged();
    }

    private onCheckAll() {
        if (this.selection.size === this.items.length) this.selection.clear();
        else this.selection.all();
        this.selectionChanged();
    }

    private onRowContextMenu(e: MouseEvent, record: FileRecord) {
        e.preventDefault();
        this.openRowMenu(record, { x: e.clientX, y: e.clientY });
    }

    private onPointerDown(e: PointerEvent, record: FileRecord) {
        this.touching = e.pointerType === 'touch';
        if (!this.touching) return;
        window.clearTimeout(this.pressTimer);
        this.pressTimer = window.setTimeout(() => {
            this.pressed = true;
            this.selection.toggle(record.path);
            this.selectionChanged();
        }, LongPress);
    }

    private onPointerEnd() {
        window.clearTimeout(this.pressTimer);
    }

    private onListKeydown(e: KeyboardEvent) {
        if (this.renaming || e.target !== this.listElement) return;
        const extend = e.shiftKey, keep = e.ctrlKey || e.metaKey;
        const focused = this.items.find(i => i.path === this.selection.focus);
        const step = (s: number | 'first' | 'last') => { e.preventDefault(); this.selection.move(s, { extend, keep }); this.selectionChanged(); this.scrollToFocus(); };
        // In the grid, up and down go a row of tiles at a time; left and right one tile.
        const across = this.view === 'grid' ? this.gridColumns() : 1;
        switch (e.key) {
            case 'ArrowDown': step(across); return;
            case 'ArrowUp':
                if (e.altKey) { e.preventDefault(); this.goUp(); return; }
                step(-across); return;
            case 'ArrowRight': if (this.view === 'grid') step(1); return;
            case 'ArrowLeft': if (this.view === 'grid') step(-1); return;
            case 'Home': step('first'); return;
            case 'End': step('last'); return;
            case 'PageDown': step(10); return;
            case 'PageUp': step(-10); return;
            case ' ':
                if (focused) { e.preventDefault(); this.selection.toggle(focused.path); this.selectionChanged(); }
                return;
            case 'Enter':
                if (focused) { e.preventDefault(); this.open(focused); }
                return;
            case 'Backspace': e.preventDefault(); this.goUp(); return;
            case 'Delete':
                if (this.canEdit && this.selection.size) { e.preventDefault(); void this.deleteItems(this.selectedRecords); }
                return;
            case 'F2':
                if (focused && this.canEdit) { e.preventDefault(); void this.startRename(focused.path); }
                return;
            case 'Escape':
                if (this.selection.size) { e.preventDefault(); this.selection.clear(); this.selectionChanged(); }
                return;
            case 'ContextMenu':
                if (focused) {
                    e.preventDefault();
                    this.openRowMenu(focused, this.renderRoot.querySelector(`[data-path="${CSS.escape(focused.path)}"] .name`) ?? this);
                }
                return;
        }
        if ((e.key === 'a' || e.key === 'A') && keep) { e.preventDefault(); this.selection.all(); this.selectionChanged(); }
        if (e.key === 'F10' && e.shiftKey && focused) {
            e.preventDefault();
            this.openRowMenu(focused, this.renderRoot.querySelector(`[data-path="${CSS.escape(focused.path)}"] .name`) ?? this);
        }
    }

    private onRenameKeydown(e: KeyboardEvent, record: FileRecord) {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); void this.commitRename(record, e.target as HTMLInputElement); }
        else if (e.key === 'Escape') { e.preventDefault(); this.cancelRename(); }
    }

    /** How many tiles a grid row holds, from the laid-out columns. */
    private gridColumns(): number {
        const columns = getComputedStyle(this.listElement).gridTemplateColumns;
        return columns && columns !== 'none' ? columns.split(' ').filter(Boolean).length : 1;
    }

    private onSearchInput(e: Event) {
        const text = (e.target as HTMLInputElement).value;
        window.clearTimeout(this.searchTimer);
        this.searchTimer = window.setTimeout(() => { this.query = text.trim(); }, 250);
    }

    private onSearchKeydown(e: KeyboardEvent) {
        const input = e.target as HTMLInputElement;
        if (e.key === 'Escape' && input.value) {
            e.preventDefault();
            e.stopPropagation();
            input.value = '';
            void this.search('');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            void this.search(input.value).then(() => { this.selection.move('first'); this.selectionChanged(); this.focusList(); });
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.focusList();
        }
    }

    private goUp() {
        if (!this.path) return;
        const from = this.path;
        void this.navigate(folderOf(this.path)).then(() => this.select([from]));
    }

    private async onFilesChosen(e: Event) {
        const input = e.target as HTMLInputElement;
        const files = [...(input.files ?? [])];
        input.value = '';
        if (files.length) await this.upload(files);
    }

    // --- drag and drop -----------------------------------------------------

    // The list and the crumbs share these: dragenter/leave fire for every child, so they're counted.

    /** A row drag starts: an unselected row drags itself, a selected one the whole selection. */
    private onRowDragStart(e: DragEvent, record: FileRecord) {
        const data = e.dataTransfer;
        if (!data || this.touching || this.renaming) { e.preventDefault(); return; }
        const records = this.selection.has(record.path) ? this.selectedRecords : [record];
        this.dragging = records;
        // Within the view it's a move; dropped elsewhere (an editor, say), the page decides.
        data.effectAllowed = 'copyMove';
        data.setData(FileDragType, JSON.stringify(records.map(r => r.path)));
        data.setData('text/plain', records.map(r => r.path).join('\n'));
        data.setDragImage(dragLabel(records.length === 1 ? records[0].name : countLabel(records)), -12, -12);
    }

    private onRowDragEnd() {
        this.dragging = undefined;
        this.dragDepth = 0;
        this.dropOn = undefined;
    }

    /** What the drag carries, if it's something this view takes. */
    private dragKind(e: DragEvent): DragKind | undefined {
        if (this.dragging && [...(e.dataTransfer?.types ?? [])].includes(FileDragType)) return 'rows';
        return hasFiles(e.dataTransfer) ? 'files' : undefined;
    }

    private onDragEnter(e: DragEvent) {
        const kind = this.dragKind(e);
        if (!this.canWrite || !kind) return;
        e.preventDefault();
        this.dragDepth++;
        this.dragOver(e, kind);
    }

    private onDragOver(e: DragEvent) {
        const kind = this.dragKind(e);
        if (!this.canWrite || !kind) return;
        this.dragOver(e, kind);
    }

    private onDragLeave(e: DragEvent) {
        if (!this.dragKind(e)) return;
        this.dragDepth = Math.max(0, this.dragDepth - 1);
        if (!this.dragDepth) this.dropOn = undefined;
    }

    private onDrop(e: DragEvent) {
        const data = e.dataTransfer;
        const kind = this.dragKind(e);
        if (!kind) return;
        e.preventDefault();
        const target = this.canWrite ? this.dropTargetOf(e, kind) : undefined;
        const records = this.dragging;
        this.dragDepth = 0;
        this.dropOn = undefined;
        this.dragging = undefined;
        if (!target) return;
        if (kind === 'rows') { void this.moveInto(records!, target.path, false); return; }
        // Read now: the items are gone once this handler returns.
        readDrop(data!)
            .then(items => (items.length ? this.uploadItems(items, target.path) : undefined))
            .catch(error => this.fail(error));
    }

    /** Ctrl+V of files (a screenshot arrives as `image.png`): into the folder on show. Text pastes are left alone. */
    private onPaste = (e: ClipboardEvent) => {
        const files = [...(e.clipboardData?.files ?? [])];
        if (!files.length || !this.canWrite || this.renaming) return;
        e.preventDefault();
        void this.upload(files);
    };

    /** Points the drag at what's under it; between the crumbs, or where the rows already are, it can't be dropped. */
    private dragOver(e: DragEvent, kind: DragKind) {
        const target = this.dropTargetOf(e, kind);
        if (!target) { e.dataTransfer!.dropEffect = 'none'; this.dropOn = undefined; return; }
        e.preventDefault();
        e.dataTransfer!.dropEffect = target.move ? 'move' : 'copy';
        if (this.dropOn?.kind !== target.kind || this.dropOn.path !== target.path || this.dropOn.move !== target.move) this.dropOn = target;
    }

    /** A folder row or a crumb under the event, else the view if it's over the list. */
    private dropTargetOf(e: Event, kind: DragKind): DropOn | undefined {
        let target: DropOn | undefined;
        for (const node of e.composedPath()) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.matches('.crumb')) { target = { kind: 'crumb', path: node.dataset.path ?? '' }; break; }
            if (node.matches('.item[data-kind="folder"]')) { target = { kind: 'folder', path: node.dataset.path! }; break; }
            if (node.matches('.list')) { target = { kind: 'view', path: this.path }; break; }
            if (node === this) break;
        }
        if (!target || kind === 'files') return target;
        return this.canEdit && this.canMoveInto(target.path) ? { ...target, move: true } : undefined;
    }

    /** Whether the dragged rows can move into a folder: not where they are, nor into themselves. */
    private canMoveInto(folder: string) {
        return !!this.dragging?.every(r => folderOf(r.path) !== folder && !(r.kind === 'folder' && within(folder, r.path)));
    }

    private isDropOn(kind: DropOn['kind'], path: string) {
        return this.dropOn?.kind === kind && this.dropOn.path === path;
    }

    /** On a folder row or crumb: files from the desktop are copied in, rows moved. */
    private dropBadge() {
        return html`<span class="drop-badge" part="drop-badge">${this.dropOn?.move ? 'Move' : '+ Copy'}</span>`;
    }

    // --- helpers -----------------------------------------------------------

    private selectionChanged(announce = true) {
        this.selectionVersion++;
        if (!announce) return;
        const records = this.selectedRecords;
        this.dispatch('selection-changed', { paths: records.map(r => r.path), records });
    }

    private focusList() {
        void this.updateComplete.then(() => this.listElement?.focus({ preventScroll: true }));
    }

    private scrollToFocus() {
        void this.updateComplete.then(() => {
            const row = this.selection.focus ? this.renderRoot.querySelector(`[data-path="${CSS.escape(this.selection.focus)}"]`) : null;
            row?.scrollIntoView({ block: 'nearest' });
        });
    }

    private say(message: string, error = false) {
        this.message = message;
        this.messageIsError = error;
        window.clearTimeout(this.messageTimer);
        if (!error) this.messageTimer = window.setTimeout(() => { this.message = ''; }, 8000);
    }

    private fail(error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.say(message, true);
        this.dispatch('file-error', { error, message });
    }

    private dispatch(name: string, detail: unknown, cancelable = false): boolean {
        return this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true, cancelable }));
    }

    // --- rendering ---------------------------------------------------------

    render() {
        void this.selectionVersion;
        const selected = this.selectedRecords;
        const all = this.commandsFor(selected).filter(c => c.bar);
        this.barIds = all.map(c => c.id).join();
        const commands = this.barShown === undefined ? all : all.slice(0, this.barShown);
        const rest = all.slice(commands.length);
        return html`
            <div class="bar ${this.compact ? 'compact' : ''}" part="bar" role="toolbar" aria-label="File commands">
                <div class="commands">
                    ${commands.map(c => html`
                        <button class="command ${c.danger ? 'danger' : ''}" data-command=${c.id} title=${c.label} @click=${c.run}>
                            ${c.icon ? icon(c.icon) : nothing}<span class="text">${c.label}</span>
                            ${c.id === 'upload' ? icon('chevron-down') : nothing}
                        </button>`)}
                    ${rest.length ? html`
                        <button class="command" data-command="more" title="More commands" aria-label="More commands" aria-haspopup="menu"
                            @click=${(e: Event) => this.openMenu(e.currentTarget as Element, rest, 'More commands')}>${icon('more')}</button>` : nothing}
                </div>
                <div class="end">
                    ${selected.length ? html`
                        <button class="chip" data-command="clear-selection" title="Clear the selection" @click=${() => { this.selection.clear(); this.selectionChanged(); this.focusList(); }}>
                            ${icon('close')}<span>${selected.length}<span class="text"> selected</span></span>
                        </button>` : nothing}
                    <button class="command" data-command="sort" title="Sort" aria-haspopup="menu" @click=${(e: Event) => this.openSortMenu(e.currentTarget as Element)}>
                        ${icon('sort')}<span class="text">Sort</span><span class="chevron">${icon('chevron-down')}</span>
                    </button>
                    <button class="command" data-command="view" title="View" aria-haspopup="menu" @click=${(e: Event) => this.openViewMenu(e.currentTarget as Element)}>
                        ${icon(this.view)}<span class="text">View</span><span class="chevron">${icon('chevron-down')}</span>
                    </button>
                    <button class="command" data-command="details" title="Details" aria-pressed=${this.details ? 'true' : 'false'} @click=${() => { this.details = !this.details; }}>
                        ${icon('info')}<span class="text">Details</span>
                    </button>
                </div>
            </div>
            <div class="where-bar">
                ${this.renderCrumbs()}
                <label class="search" part="search">
                    ${icon('search')}
                    <input type="search" placeholder="Search" aria-label=${`Search ${this.path ? nameOf(this.path) : this.rootLabel}`} .value=${this.query}
                        @input=${this.onSearchInput} @keydown=${this.onSearchKeydown}>
                </label>
            </div>
            <slot name="header"></slot>
            <div class="body">
                ${this.renderList()}
                ${this.details ? this.renderDetails(selected) : nothing}
            </div>
            <div class="status ${this.messageIsError ? 'error' : ''}" part="status" role="status" aria-live="polite">${this.message}</div>
            ${this.renderQuota()}
            ${this.renderMenu()}
            ${this.renderChooser()}
            <input class="files" type="file" multiple hidden @change=${this.onFilesChosen}>
            <input class="folder" type="file" webkitdirectory hidden @change=${this.onFilesChosen}>
            <input class="zip" type="file" accept=".zip,application/zip" multiple hidden @change=${this.onZipChosen}>
        `;
    }

    private renderCrumbs() {
        const parts = this.path ? [...parentsOf(this.path + '/x')] : [];
        const crumbs = [{ path: '', label: this.rootLabel }, ...parts.map(p => ({ path: p, label: nameOf(p) }))];
        const searching = !!this.query;
        return html`
            <nav class="crumbs" part="crumbs" aria-label="Folder"
                @dragenter=${this.onDragEnter} @dragover=${this.onDragOver} @dragleave=${this.onDragLeave} @drop=${this.onDrop}>
                ${crumbs.map((c, i) => {
                    // While searching, the folder on show is a way back out of the results.
                    const last = i === crumbs.length - 1 && !searching;
                    return html`
                        ${i ? html`<span class="sep">${icon('chevron')}</span>` : nothing}
                        <button class="crumb ${this.isDropOn('crumb', c.path) ? 'drop-target' : ''}" data-path=${c.path} aria-current=${last ? 'page' : nothing}
                            @click=${() => { if (!last) void this.navigate(c.path); }}>${c.label}${this.isDropOn('crumb', c.path) ? this.dropBadge() : nothing}</button>`;
                })}
                ${searching ? html`
                    <span class="sep">${icon('chevron')}</span>
                    <span class="results" aria-current="page">Results for "${this.query}"</span>` : nothing}
            </nav>`;
    }

    private renderList() {
        const grid = this.view === 'grid';
        const all = this.items.length > 0 && this.selection.size === this.items.length;
        const some = this.selection.size > 0 && !all;
        const header = (column: Column, label: string) => {
            const key = ColumnSort[column];
            const active = this.sort === key;
            return html`
                <div class="cell ${column}" role="columnheader" aria-sort=${active ? (this.descending ? 'descending' : 'ascending') : 'none'}>
                    <button class="sort" data-sort=${key} @click=${() => { if (active) this.descending = !this.descending; else { this.sort = key; this.descending = false; } }}>
                        ${label}${active ? html`<span class=${this.descending ? '' : 'up'}>${icon('chevron-down')}</span>` : nothing}
                    </button>
                </div>`;
        };
        const focus = this.selection.focus;
        return html`
            <div class="list ${grid ? 'grid' : ''} ${this.dropOn?.kind === 'view' ? 'dropping' : ''}" part="list" role="listbox" tabindex="0"
                aria-label=${this.query ? `Results for ${this.query}` : this.path ? nameOf(this.path) : this.rootLabel}
                aria-multiselectable=${this.selectionMode === 'multiple' ? 'true' : 'false'}
                aria-activedescendant=${focus ? `item-${this.items.findIndex(i => i.path === focus)}` : nothing}
                @keydown=${this.onListKeydown}
                @dragenter=${this.onDragEnter} @dragover=${this.onDragOver} @dragleave=${this.onDragLeave} @drop=${this.onDrop}>
                ${grid ? nothing : html`
                    <div class="row head" role="presentation">
                        <div class="cell">
                            ${this.selectionMode === 'multiple' ? html`
                                <button class="check ${some ? 'some' : ''}" role="checkbox" aria-label="Select all" tabindex="-1"
                                    aria-checked=${all ? 'true' : some ? 'mixed' : 'false'} @click=${this.onCheckAll}>${icon(some ? 'dash' : 'check')}</button>` : nothing}
                        </div>
                        ${header('name', 'Name')}${header('modified', 'Modified')}${header('size', 'File size')}
                    </div>`}
                ${repeat(this.items, i => i.id, (record, index) => this.renderItem(record, index))}
                ${!this.items.length && !this.loading ? html`
                    <div class="empty" part="empty">
                        ${this.query ? html`
                            ${icon('search')}
                            <div>Nothing called "${this.query}" here</div>` : html`
                            ${kindIcon('folder')}
                            <div>This folder is empty</div>
                            ${this.canWrite ? html`<div>Use Upload, or New folder, or drop files here.</div>` : nothing}`}
                    </div>` : nothing}
                ${this.next ? html`<button class="more" @click=${this.loadMore}>Show more</button>` : nothing}
            </div>`;
    }

    /** A row in the list, or a tile in the grid: the same element, events and selection either way. */
    private renderItem(record: FileRecord, index: number) {
        const selected = this.selection.has(record.path);
        const focused = this.selection.focus === record.path;
        const renaming = this.renaming === record.path;
        const kind = kindOf(record);
        const dropping = this.isDropOn('folder', record.path);
        const grid = this.view === 'grid';
        const check = this.selectionMode !== 'none' ? html`
            <button class="check" role="checkbox" tabindex="-1" aria-label=${`Select ${record.name}`}
                aria-checked=${selected ? 'true' : 'false'} @click=${(e: Event) => this.onCheck(e, record)}>${icon('check')}</button>` : nothing;
        const actions = html`
            <span class="actions">
                <button class="icon-button more-actions" tabindex="-1" aria-label=${`More actions for ${record.name}`} title="More actions"
                    @click=${(e: MouseEvent) => { e.stopPropagation(); this.openRowMenu(record, e.currentTarget as Element); }}
                    @dblclick=${(e: Event) => e.stopPropagation()}>${icon('more')}</button>
            </span>`;
        const name = renaming ? html`
            <input class="rename" aria-label="New name" .value=${record.name}
                @keydown=${(e: KeyboardEvent) => this.onRenameKeydown(e, record)}
                @click=${(e: Event) => e.stopPropagation()} @dblclick=${(e: Event) => e.stopPropagation()}
                @blur=${(e: FocusEvent) => void this.commitRename(record, e.target as HTMLInputElement)}>`
            : html`<span class="label">${record.name}</span>`;
        // In search results, where each one is.
        const where = this.query && folderOf(record.path) !== this.path
            ? html`<span class="where muted" title=${folderOf(record.path) || this.rootLabel}>${folderOf(record.path) ? nameOf(folderOf(record.path)) : this.rootLabel}</span>` : nothing;
        const thumb = grid && this.storage ? this.thumbnails.get(this.storage, record) : undefined;
        return html`
            <div class="${grid ? 'tile' : 'row'} item ${focused ? 'focus' : ''} ${dropping ? 'drop-target' : ''}" id=${`item-${index}`} role="option" aria-selected=${selected ? 'true' : 'false'}
                data-path=${record.path} data-kind=${record.kind} draggable=${this.canWrite && !renaming ? 'true' : 'false'}
                @dragstart=${(e: DragEvent) => this.onRowDragStart(e, record)} @dragend=${this.onRowDragEnd}
                @click=${(e: MouseEvent) => this.onRowClick(e, record)}
                @dblclick=${() => this.onRowDoubleClick(record)}
                @contextmenu=${(e: MouseEvent) => this.onRowContextMenu(e, record)}
                @pointerdown=${(e: PointerEvent) => this.onPointerDown(e, record)}
                @pointerup=${this.onPointerEnd} @pointercancel=${this.onPointerEnd} @pointerleave=${this.onPointerEnd}>
                ${grid ? html`
                    ${check}
                    <div class="thumb">${thumb ? html`<img src=${thumb} alt="" draggable="false">` : kindIcon(kind)}</div>
                    <div class="name" title=${record.name}>${name}${renaming ? nothing : actions}</div>
                    <div class="sub muted">${where !== nothing ? where : record.kind === 'folder' ? formatItemSize(record) : formatDate(record.modified)}</div>
                    ${dropping ? this.dropBadge() : nothing}` : html`
                    <div class="cell">${check}</div>
                    <div class="cell name" title=${record.name}>
                        ${kindIcon(kind)}${name}${renaming ? nothing : html`${where}${dropping ? this.dropBadge() : nothing}${actions}`}
                    </div>
                    <div class="cell modified muted">${formatDate(record.modified)}</div>
                    <div class="cell size muted">${formatItemSize(record)}</div>`}
            </div>`;
    }

    /** "1.2 MB of 2 GB used", with a meter, for storages that know. */
    private renderQuota() {
        const q = this.quota;
        if (!q?.quota) return nothing;
        const used = q.usage ?? 0;
        const fraction = Math.min(1, used / q.quota);
        const note = q.lasting ? '' : 'The browser may clear these files if space runs short.';
        return html`
            <div class="quota ${fraction > 0.9 ? 'full' : ''}" part="quota" title=${note}>
                <span class="meter" role="meter" aria-label="Storage used" aria-valuemin="0" aria-valuemax=${q.quota} aria-valuenow=${used}
                    aria-valuetext=${`${formatSize(used)} of ${formatSize(q.quota)}`}><span style=${`width: ${(fraction * 100).toFixed(1)}%`}></span></span>
                <span class="text">${formatSize(used)} of ${formatSize(q.quota)} used</span>
            </div>`;
    }

    /** The details pane: one item's preview and facts, a selection's total, or the folder's. */
    private renderDetails(selected: FileRecord[]) {
        const one = selected.length === 1 ? selected[0] : undefined;
        let body;
        if (one) {
            const kind = kindOf(one);
            const thumb = this.storage && (kind === 'picture' || kind === 'video') ? this.thumbnails.get(this.storage, one) : undefined;
            const meta = one.meta ?? {};
            const facts: [string, string][] = [['Type', one.kind === 'folder' ? 'Folder' : `${kindLabel(kind)}${one.type ? ` (${one.type})` : ''}`]];
            facts.push(one.kind === 'folder' ? ['Contains', formatItemSize(one)] : ['Size', formatSize(one.size)]);
            if (meta.width && meta.height) facts.push(['Dimensions', `${meta.width} × ${meta.height}`]);
            if (meta.duration) facts.push(['Duration', formatDuration(meta.duration)]);
            facts.push(['Modified', formatDateTime(one.modified)], ['Created', formatDateTime(one.created)]);
            facts.push(['Where', folderOf(one.path) ? `${this.rootLabel} › ${folderOf(one.path).split('/').join(' › ')}` : this.rootLabel]);
            body = html`
                <div class="preview">${thumb ? html`<img src=${thumb} alt="">` : kindIcon(kind)}</div>
                <h3>${one.name}</h3>
                <dl>${facts.map(([k, v]) => html`<dt>${k}</dt><dd data-fact=${k.toLowerCase()}>${v}</dd>`)}</dl>`;
        } else if (selected.length) {
            const files = selected.filter(r => r.kind === 'file');
            body = html`
                <div class="preview">${icon('copy')}</div>
                <h3>${selected.length} items selected</h3>
                <dl>
                    <dt>Files</dt><dd data-fact="files">${files.length}</dd>
                    <dt>Folders</dt><dd data-fact="folders">${selected.length - files.length}</dd>
                    <dt>Size</dt><dd data-fact="size">${formatSize(files.reduce((n, f) => n + f.size, 0))}${files.length < selected.length ? ' (files only)' : ''}</dd>
                </dl>`;
        } else {
            body = html`
                <div class="preview">${kindIcon('folder')}</div>
                <h3>${this.path ? nameOf(this.path) : this.rootLabel}</h3>
                <dl><dt>Contains</dt><dd data-fact="contains">${this.items.length}${this.next ? '+' : ''} ${this.items.length === 1 ? 'item' : 'items'}</dd></dl>`;
        }
        return html`
            <aside class="details" part="details" aria-label="Details">
                ${body}
                <slot name="details"></slot>
            </aside>`;
    }

    private renderMenu() {
        const menu = this.menu;
        if (!menu) return nothing;
        return html`
            <div class="menu" part="menu" role="menu" aria-label=${menu.label} @keydown=${this.onMenuKeydown}>
                ${menu.items.map(item => html`
                    ${item.separator ? html`<hr>` : nothing}
                    <button role=${item.checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked=${item.checked === undefined ? nothing : String(item.checked)}
                        class=${item.danger ? 'danger' : ''} data-item=${item.id} @click=${() => this.runMenuItem(item)}>
                        ${item.icon ? icon(item.icon) : nothing}<span>${item.label}</span>
                        ${item.checked ? html`<span class="tick">${icon('check')}</span>` : nothing}
                    </button>`)}
            </div>`;
    }

    private renderChooser() {
        const c = this.chooser;
        if (!c) return html`<dialog></dialog>`;
        const verb = c.copy ? 'Copy' : 'Move';
        const choices = [{ path: '', name: this.rootLabel, depth: 0 }, ...c.folders.map(f => ({ path: f.path, name: f.name, depth: f.path.split('/').length }))];
        return html`
            <dialog aria-label=${`${verb} ${countLabel(c.records)} to`} @cancel=${(e: Event) => { e.preventDefault(); this.closeChooser(); }}>
                <form method="dialog" @submit=${this.chooseTarget}>
                    <h2>${verb} ${countLabel(c.records)} to…</h2>
                    <div class="folders" role="listbox" aria-label="Folders">
                        ${choices.map(f => html`
                            <button type="button" class="folder" role="option" data-path=${f.path} aria-selected=${f.path === c.target ? 'true' : 'false'}
                                style=${`padding-left: ${0.5 + f.depth * 1.25}rem`}
                                @click=${() => { this.chooser = { ...c, target: f.path }; }}
                                @dblclick=${(e: Event) => { this.chooser = { ...c, target: f.path }; void this.updateComplete.then(() => this.chooseTarget(e)); }}>
                                ${kindIcon('folder')}<span>${f.name}</span>
                            </button>`)}
                    </div>
                    <footer>
                        <button type="button" @click=${this.closeChooser}>Cancel</button>
                        <button type="submit" class="primary" data-command="choose">${verb} here</button>
                    </footer>
                </form>
            </dialog>`;
    }
}

/** The drag image for rows: their name, or "N items". It only has to be in the page while setDragImage runs. */
function dragLabel(text: string): HTMLElement {
    const label = document.createElement('div');
    label.textContent = text;
    Object.assign(label.style, {
        position: 'fixed', top: '-1000px', left: '0', padding: '0.25rem 0.75rem', borderRadius: '999px',
        background: '#0f6cbd', color: '#fff', font: '600 0.875rem system-ui, sans-serif', whiteSpace: 'nowrap',
    });
    document.body.append(label);
    setTimeout(() => label.remove());
    return label;
}

/** Saves a Blob as a download. */
function save(data: Blob, name: string) {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Juel's message box: `action` and Cancel. Resolves true to go ahead. */
async function confirmWithMessageBox(title: string, text: string, action: string): Promise<boolean> {
    const result = await MessageBoxModule.show({ title, text, buttons: MessageBoxButtons.OKCancel, labels: { ok: action, cancel: 'Cancel' } }) as { status?: number } | undefined;
    return result?.status === MessageBoxResultStatus.OK;
}

declare global {
    interface HTMLElementTagNameMap { 'juel-file-manager': JuelFileManager }
}
