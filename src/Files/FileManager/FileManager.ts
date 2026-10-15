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
import { FileRecord, FileSortKey, FileStorageError, IFileStorage, PathChange } from '../Storage/IFileStorage';
import { folderOf, join, kindOf, nameOf, parentsOf, uniquePath, within } from '../Storage/Paths';
import { entriesUnder } from '../Zip/Transfer';
import { writeZip, ZipEntry } from '../Zip/Zip';
import { MessageBoxModule } from '../../_Modules/MessageBox/MessageBoxModule';
import { MessageBoxButtons } from '../../_Modules/MessageBox/MessageBoxButtons';
import { MessageBoxResultStatus } from '../../_Modules/MessageBox/MessageBoxResultStatus';
import { FileManagerStyles } from './FileManagerStyles';
import { icon, kindIcon } from './Icons';
import { countLabel, formatDate, formatItemSize } from './Format';
import { Selection, SelectionMode } from './Selection';
import { BeforeDeleteDetail, BeforeMoveDetail, FileCommand, settle } from './FileManagerEvents';

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
    /** Don't ask before deleting. */
    @property({ type: Boolean, attribute: 'no-confirm' }) noConfirm = false;
    /** How many items to ask the storage for at once. */
    @property({ type: Number, attribute: 'page-size' }) pageSize = 500;
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
    /** Bumped when the selection changes, so Lit re-renders. */
    @state() private selectionVersion = 0;

    @query('.list') private listElement!: HTMLElement;
    @query('.menu') private menuElement?: HTMLElement;
    @query('dialog') private dialogElement?: HTMLDialogElement;
    @query('input.files') private fileInput!: HTMLInputElement;
    @query('input.folder') private folderInput!: HTMLInputElement;

    private selection = new Selection();
    private unsubscribe?: () => void;
    private reloadQueued = false;
    private loadToken = 0;
    private pressTimer?: number;
    private pressed = false;
    private messageTimer?: number;

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
        if (path === this.path) { await this.reload(); return; }
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
        const storage = this.storage;
        if (!storage || !this.canWrite) return [];
        const added: FileRecord[] = [];
        const renamed: string[] = [];
        try {
            for (const file of files) {
                const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
                const result = await storage.write(join(folder, relative), file, { onConflict: 'keep-both' });
                if (result.outcome === 'renamed') renamed.push(result.record.name);
                added.push(result.record);
            }
            (storage as IFileStorage & { keep?: () => Promise<boolean> }).keep?.();
            this.say(`Uploaded ${added.length === 1 ? `"${added[0].name}"` : `${added.length} files`}` + (renamed.length ? `; kept both where names clashed: ${renamed.join(', ')}` : ''));
            if (added.length) this.dispatch('file-added', { records: added });
        } catch (error) {
            this.fail(error);
        }
        return added;
    }

    /** Resolves when the folder on show has loaded. */
    loaded: Promise<void> = Promise.resolve();

    // --- lifecycle ---------------------------------------------------------

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
        this.subscribe();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
        this.unsubscribe?.();
        this.unsubscribe = undefined;
    }

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has('selectionMode')) this.selection.mode = this.selectionMode;
        if (changed.has('storage')) this.subscribe();
        if (changed.has('storage') || changed.has('path') || changed.has('sort') || changed.has('descending') || changed.has('accept')) {
            if (changed.has('path') || changed.has('storage')) { this.renaming = undefined; this.selection.clear(); }
            this.loaded = this.load(false);
        }
    }

    protected updated(changed: PropertyValues<this>) {
        if (changed.has('menu' as keyof JuelFileManager) && this.menu) void this.placeMenu();
        this.toggleAttribute('selecting', this.selection.size > 0);
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
            const accept = this.accept.split(',').map(a => a.trim()).filter(Boolean);
            const options = { sort: this.sort, descending: this.descending, accept, limit: this.pageSize };
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

    private async loadMore() {
        if (!this.storage || !this.next) return;
        try {
            const accept = this.accept.split(',').map(a => a.trim()).filter(Boolean);
            const page = await this.storage.list(this.path, { sort: this.sort, descending: this.descending, accept, limit: this.pageSize, cursor: this.next });
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

    private get canCopy(): boolean {
        return this.canWrite && !!this.storage?.capabilities.copy;
    }

    /** The commands for these items (none: the folder's own). */
    private commandsFor(records: FileRecord[]): Command[] {
        const write = this.canWrite;
        if (!records.length) {
            const commands: Command[] = [];
            if (write) {
                commands.push({ id: 'new-folder', label: 'New folder', icon: 'new-folder', bar: true, run: () => void this.newFolder() });
                commands.push({ id: 'upload', label: 'Upload', icon: 'upload', bar: true, run: () => this.openUploadMenu() });
            }
            for (const c of this.commands.filter(c => c.when?.([]))) commands.push({ ...this.pageCommand(c, []), bar: true });
            return commands;
        }
        const one = records.length === 1 ? records[0] : undefined;
        const commands: Command[] = [];
        if (one) commands.push({ id: 'open', label: 'Open', icon: 'open', bar: true, run: () => this.open(one) });
        for (const c of this.commands.filter(c => (c.when ? c.when(records) : true))) commands.push({ ...this.pageCommand(c, records), bar: true });
        commands.push({ id: 'download', label: 'Download', icon: 'download', bar: true, run: () => void this.download(records) });
        if (write && one) commands.push({ id: 'rename', label: 'Rename', icon: 'rename', bar: true, run: () => void this.startRename(one.path) });
        if (write) commands.push({ id: 'move', label: 'Move to', icon: 'move', bar: true, run: () => void this.openChooser(records, false) });
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

    private open(record: FileRecord) {
        if (record.kind === 'folder') { void this.navigate(record.path); return; }
        const go = this.dispatch('file-open', { record }, true);
        if (go) void this.download([record]);
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

    private async deleteItems(records: FileRecord[]) {
        const storage = this.storage;
        if (!storage || !records.length) return;
        const { go, notes } = await settle<BeforeDeleteDetail>(this, 'file-before-delete', { records });
        if (!go) return;
        if (!this.noConfirm) {
            const folders = records.filter(r => r.kind === 'folder' && r.items);
            const text = [
                `Delete ${countLabel(records)}?`,
                folders.length ? (folders.length === 1 && records.length === 1 ? 'Everything in it goes too.' : 'Everything in the folders goes too.') : '',
                ...notes,
                "This can't be undone.",
            ].filter(Boolean).join(' ');
            if (!await this.confirm('Delete', text, 'Delete')) return;
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
        this.focusList();
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
        const moves: PathChange[] = [];
        const taken = new Set<string>();
        for (const r of chooser.records) {
            const wanted = join(chooser.target, r.name);
            if (!chooser.copy && wanted === r.path) continue;
            let to = await this.storage.uniquePath(wanted);
            if (taken.has(to)) to = uniquePath(to, p => taken.has(p));
            taken.add(to);
            moves.push({ from: r.path, to });
        }
        if (!moves.length) { this.say('Already there'); return; }
        await this.moveItems(chooser.records, moves, { copy: chooser.copy, rename: false });
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
        ], 'Upload');
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
        if (e.pointerType !== 'touch') return;
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
        switch (e.key) {
            case 'ArrowDown': step(1); return;
            case 'ArrowUp':
                if (e.altKey) { e.preventDefault(); this.goUp(); return; }
                step(-1); return;
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
                if (this.canWrite && this.selection.size) { e.preventDefault(); void this.deleteItems(this.selectedRecords); }
                return;
            case 'F2':
                if (focused && this.canWrite) { e.preventDefault(); void this.startRename(focused.path); }
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
        const commands = this.commandsFor(selected).filter(c => c.bar);
        return html`
            <div class="bar" part="bar" role="toolbar" aria-label="File commands">
                <div class="commands">
                    ${commands.map(c => html`
                        <button class="command ${c.danger ? 'danger' : ''}" data-command=${c.id} title=${c.label} @click=${c.run}>
                            ${c.icon ? icon(c.icon) : nothing}<span class="text">${c.label}</span>
                            ${c.id === 'upload' ? icon('chevron-down') : nothing}
                        </button>`)}
                </div>
                <div class="end">
                    <button class="command" data-command="sort" title="Sort" aria-haspopup="menu" @click=${(e: Event) => this.openSortMenu(e.currentTarget as Element)}>
                        ${icon('sort')}<span class="text">Sort</span>${icon('chevron-down')}
                    </button>
                    ${selected.length ? html`
                        <button class="chip" data-command="clear-selection" title="Clear the selection" @click=${() => { this.selection.clear(); this.selectionChanged(); this.focusList(); }}>
                            ${icon('close')}<span>${selected.length} selected</span>
                        </button>` : nothing}
                </div>
            </div>
            ${this.renderCrumbs()}
            ${this.renderList()}
            <div class="status ${this.messageIsError ? 'error' : ''}" part="status" role="status" aria-live="polite">${this.message}</div>
            ${this.renderMenu()}
            ${this.renderChooser()}
            <input class="files" type="file" multiple hidden @change=${this.onFilesChosen}>
            <input class="folder" type="file" webkitdirectory hidden @change=${this.onFilesChosen}>
        `;
    }

    private renderCrumbs() {
        const parts = this.path ? [...parentsOf(this.path + '/x')] : [];
        const crumbs = [{ path: '', label: this.rootLabel }, ...parts.map(p => ({ path: p, label: nameOf(p) }))];
        return html`
            <nav class="crumbs" part="crumbs" aria-label="Folder">
                ${crumbs.map((c, i) => {
                    const last = i === crumbs.length - 1;
                    return html`
                        ${i ? html`<span class="sep">${icon('chevron')}</span>` : nothing}
                        <button class="crumb" data-path=${c.path} aria-current=${last ? 'page' : nothing}
                            @click=${() => { if (!last) void this.navigate(c.path); }}>${c.label}</button>`;
                })}
            </nav>`;
    }

    private renderList() {
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
            <div class="list" part="list" role="listbox" tabindex="0" aria-label=${this.path ? nameOf(this.path) : this.rootLabel}
                aria-multiselectable=${this.selectionMode === 'multiple' ? 'true' : 'false'}
                aria-activedescendant=${focus ? `item-${this.items.findIndex(i => i.path === focus)}` : nothing}
                @keydown=${this.onListKeydown}>
                <div class="row head" role="presentation">
                    <div class="cell">
                        ${this.selectionMode === 'multiple' ? html`
                            <button class="check ${some ? 'some' : ''}" role="checkbox" aria-label="Select all" tabindex="-1"
                                aria-checked=${all ? 'true' : some ? 'mixed' : 'false'} @click=${this.onCheckAll}>${icon(some ? 'dash' : 'check')}</button>` : nothing}
                    </div>
                    ${header('name', 'Name')}${header('modified', 'Modified')}${header('size', 'File size')}
                </div>
                ${repeat(this.items, i => i.id, (record, index) => this.renderRow(record, index))}
                ${!this.items.length && !this.loading ? html`
                    <div class="empty" part="empty">
                        ${kindIcon('folder')}
                        <div>This folder is empty</div>
                        ${this.canWrite ? html`<div>Use Upload, or New folder, to add something.</div>` : nothing}
                    </div>` : nothing}
                ${this.next ? html`<button class="more" @click=${this.loadMore}>Show more</button>` : nothing}
            </div>`;
    }

    private renderRow(record: FileRecord, index: number) {
        const selected = this.selection.has(record.path);
        const focused = this.selection.focus === record.path;
        const renaming = this.renaming === record.path;
        const kind = kindOf(record);
        return html`
            <div class="row item ${focused ? 'focus' : ''}" id=${`item-${index}`} role="option" aria-selected=${selected ? 'true' : 'false'}
                data-path=${record.path} data-kind=${record.kind}
                @click=${(e: MouseEvent) => this.onRowClick(e, record)}
                @dblclick=${() => this.onRowDoubleClick(record)}
                @contextmenu=${(e: MouseEvent) => this.onRowContextMenu(e, record)}
                @pointerdown=${(e: PointerEvent) => this.onPointerDown(e, record)}
                @pointerup=${this.onPointerEnd} @pointercancel=${this.onPointerEnd} @pointerleave=${this.onPointerEnd}>
                <div class="cell">
                    ${this.selectionMode !== 'none' ? html`
                        <button class="check" role="checkbox" tabindex="-1" aria-label=${`Select ${record.name}`}
                            aria-checked=${selected ? 'true' : 'false'} @click=${(e: Event) => this.onCheck(e, record)}>${icon('check')}</button>` : nothing}
                </div>
                <div class="cell name" title=${record.name}>
                    ${kindIcon(kind)}
                    ${renaming ? html`
                        <input class="rename" aria-label="New name" .value=${record.name}
                            @keydown=${(e: KeyboardEvent) => this.onRenameKeydown(e, record)}
                            @click=${(e: Event) => e.stopPropagation()} @dblclick=${(e: Event) => e.stopPropagation()}
                            @blur=${(e: FocusEvent) => void this.commitRename(record, e.target as HTMLInputElement)}>`
                        : html`<span class="label">${record.name}</span>
                            <span class="actions">
                                <button class="icon-button more-actions" tabindex="-1" aria-label=${`More actions for ${record.name}`} title="More actions"
                                    @click=${(e: MouseEvent) => { e.stopPropagation(); this.openRowMenu(record, e.currentTarget as Element); }}
                                    @dblclick=${(e: Event) => e.stopPropagation()}>${icon('more')}</button>
                            </span>`}
                </div>
                <div class="cell modified muted">${formatDate(record.modified)}</div>
                <div class="cell size muted">${formatItemSize(record)}</div>
            </div>`;
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
