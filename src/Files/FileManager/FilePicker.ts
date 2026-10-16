// <juel-file-picker>: <juel-file-manager> in a dialog, to choose files. Only
// `accept`ed types show; Upload puts new files in the folder on show (and
// selects them); Open or a double-click chooses. See src/Files/README.md.
//
//   const [record] = await JuelFilePicker.choose({ storage, accept: 'image/*' });
//   // or, with an element on the page:
//   const records = await picker.pick();   // [] on Cancel
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { FileRecord, IFileStorage } from '../Storage/IFileStorage';
import { folderOf } from '../Storage/Paths';
import { JuelFileManager } from './FileManager';
import { icon } from './Icons';
import { countLabel } from './Format';

export interface FilePickerOptions {
    storage: IFileStorage;
    /** Only these types (`image/*,.csv`); folders always show. */
    accept?: string;
    multiple?: boolean;
    /** The folder to start in. */
    path?: string;
    rootLabel?: string;
    heading?: string;
    openLabel?: string;
}

@customElement('juel-file-picker')
export class JuelFilePicker extends LitElement {
    /** Opens a picker on the page and resolves with what was chosen ([] on Cancel). */
    static async choose(options: FilePickerOptions): Promise<FileRecord[]> {
        const picker = document.createElement('juel-file-picker');
        Object.assign(picker, options);
        document.body.append(picker);
        try {
            return await picker.pick();
        } finally {
            picker.remove();
        }
    }

    @property({ attribute: false }) storage?: IFileStorage;
    @property() accept = '';
    /** Several files may be chosen. */
    @property({ type: Boolean }) multiple = false;
    /** The folder to start in; follows the user. */
    @property() path = '';
    @property({ attribute: 'root-label' }) rootLabel = 'My files';
    @property() heading = 'Choose a file';
    @property({ attribute: 'open-label' }) openLabel = 'Open';
    @property({ type: Boolean, reflect: true }) open = false;

    @state() private chosen: FileRecord[] = [];

    @query('juel-file-manager') private manager?: JuelFileManager;

    private pending?: Promise<FileRecord[]>;
    private resolve?: (records: FileRecord[]) => void;
    private returnFocus?: HTMLElement;
    /** What we made inert, to give back. */
    private inerted: HTMLElement[] = [];

    /** Shows the picker; resolves with the chosen records, or [] on Cancel. */
    pick(): Promise<FileRecord[]> {
        if (this.pending) return this.pending;
        this.returnFocus = deepActiveElement();
        this.chosen = [];
        this.open = true;
        this.pending = new Promise(resolve => { this.resolve = resolve; });
        void this.updateComplete.then(async () => {
            this.makeRestInert();
            await this.manager?.updateComplete;
            this.manager?.shadowRoot?.querySelector<HTMLElement>('.list')?.focus();
        });
        return this.pending;
    }

    /** Closes without choosing. */
    cancel() {
        this.finish([]);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.finish([]);
    }

    private finish(records: FileRecord[]) {
        if (!this.pending) return;
        const resolve = this.resolve!;
        this.pending = this.resolve = undefined;
        this.open = false;
        this.giveBackInert();
        this.dispatchEvent(new CustomEvent(records.length ? 'file-picked' : 'pick-cancel', { detail: { records }, bubbles: true, composed: true }));
        resolve(records);
        this.returnFocus?.focus?.();
        this.returnFocus = undefined;
    }

    /** Everything else on the page, while the picker is open: a modal without <dialog>, so Juel's message box can still show over it. */
    private makeRestInert() {
        let top: Element = this;
        while (top.parentElement && top.parentElement !== document.body) top = top.parentElement;
        for (const child of [...document.body.children] as HTMLElement[]) {
            if (child === top || child.inert || child.tagName === 'SCRIPT') continue;
            child.inert = true;
            this.inerted.push(child);
        }
    }

    private giveBackInert() {
        for (const el of this.inerted) el.inert = false;
        this.inerted = [];
    }

    /** The files chosen; a single folder chosen means "go in". */
    private get openable(): { files: FileRecord[]; folder?: FileRecord } {
        const files = this.chosen.filter(r => r.kind === 'file');
        const folder = this.chosen.length === 1 && this.chosen[0].kind === 'folder' ? this.chosen[0] : undefined;
        return { files: files.length === this.chosen.length ? files : [], folder };
    }

    private onOpen() {
        const { files, folder } = this.openable;
        if (folder) { void this.manager?.navigate(folder.path); return; }
        if (files.length) this.finish(files);
    }

    private onSelection(e: CustomEvent<{ records: FileRecord[] }>) {
        this.chosen = e.detail.records;
    }

    /** A double-click (or Enter) on a file chooses it, with the rest of the selection if it's in it. */
    private onFileOpen(e: CustomEvent<{ record: FileRecord }>) {
        e.preventDefault();
        const record = e.detail.record;
        const files = this.chosen.filter(r => r.kind === 'file');
        this.finish(this.multiple && files.some(f => f.path === record.path) ? files : [record]);
    }

    /** Files just uploaded into the folder on show are selected, ready to Open. */
    private onAdded(e: CustomEvent<{ records: FileRecord[] }>) {
        const manager = this.manager;
        if (!manager) return;
        const here = e.detail.records.filter(r => r.kind === 'file' && folderOf(r.path) === manager.path);
        if (!here.length) return;
        void manager.loaded.then(() => manager.select(this.multiple ? here.map(r => r.path) : [here[here.length - 1].path]));
    }

    private onKeydown(e: KeyboardEvent) {
        // The manager's own Escapes (a menu, a rename, the Move to dialog, the selection) come first.
        if (e.key !== 'Escape' || e.defaultPrevented || e.composedPath().some(n => n instanceof HTMLDialogElement)) return;
        e.preventDefault();
        this.cancel();
    }

    render() {
        if (!this.open) return nothing;
        const { files, folder } = this.openable;
        const summary = folder ? `Folder "${folder.name}"` : files.length ? countLabel(files) : this.multiple ? 'Choose one or more files' : 'Choose a file';
        return html`
            <div class="backdrop" part="backdrop" @click=${(e: Event) => { if (e.target === e.currentTarget) this.cancel(); }}>
                <div class="panel" part="panel" role="dialog" aria-modal="true" aria-label=${this.heading} @keydown=${this.onKeydown}>
                    <header>
                        <h2>${this.heading}</h2>
                        <button class="close" data-command="cancel-x" aria-label="Cancel" title="Cancel" @click=${this.cancel}>${icon('close')}</button>
                    </header>
                    <juel-file-manager exportparts="bar, crumbs, list, status, menu, empty, details, quota, search"
                        .storage=${this.storage} .path=${this.path} root-label=${this.rootLabel} accept=${this.accept}
                        selection-mode=${this.multiple ? 'multiple' : 'single'}
                        @path-changed=${(e: CustomEvent<{ path: string }>) => { this.path = e.detail.path; }}
                        @selection-changed=${this.onSelection} @file-open=${this.onFileOpen} @file-added=${this.onAdded}></juel-file-manager>
                    <footer>
                        <span class="summary" aria-live="polite">${summary}</span>
                        <button data-command="cancel-pick" @click=${this.cancel}>Cancel</button>
                        <button class="primary" data-command="pick" ?disabled=${!folder && !files.length} @click=${this.onOpen}>${this.openLabel}</button>
                    </footer>
                </div>
            </div>`;
    }

    static styles = css`
        :host { display: contents; }
        *, *::before, *::after { box-sizing: border-box; }
        .backdrop {
            position: fixed;
            inset: 0;
            z-index: var(--file-picker-z-index, 100);
            display: grid;
            place-items: center;
            padding: 1rem;
            background: rgba(0, 0, 0, 0.4);
        }
        .panel {
            display: flex;
            flex-direction: column;
            width: min(60rem, 100%);
            height: min(40rem, 100%);
            overflow: hidden;
            color: var(--file-manager-color, #242424);
            background: var(--file-manager-background, #fff);
            border-radius: var(--file-manager-radius, 8px);
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
            font: var(--file-manager-font, 0.875rem/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
        }
        :host-context([data-theme="dark"]) .panel { color: var(--file-manager-color, #f0f0f0); background: var(--file-manager-background, #1f1f1f); }
        header { display: flex; align-items: center; padding: 0.75rem 0.75rem 0.25rem 1.25rem; }
        h2 { margin: 0 auto 0 0; font-size: 1.125rem; font-weight: 600; }
        juel-file-manager { flex: 1; min-height: 0; }
        footer { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; border-top: 1px solid var(--file-manager-border, #e3e3e3); }
        :host-context([data-theme="dark"]) footer { border-color: var(--file-manager-border, #383838); }
        .summary { margin-right: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--file-manager-muted, #616161); }
        button {
            height: 2.25rem;
            padding: 0 1rem;
            font: inherit;
            color: inherit;
            background: none;
            border: 1px solid var(--file-manager-border, #c8c8c8);
            border-radius: 6px;
            cursor: pointer;
        }
        button:focus-visible { outline: 2px solid var(--file-manager-accent, #0f6cbd); outline-offset: 1px; }
        button:disabled { opacity: 0.45; cursor: default; }
        .primary { color: #fff; background: var(--file-manager-accent, #0f6cbd); border-color: var(--file-manager-accent, #0f6cbd); }
        .close { display: grid; place-items: center; width: 2.25rem; padding: 0; border: 0; }
        .close .icon { width: 1.25rem; height: 1.25rem; }
        .close:hover { background: rgba(127, 127, 127, 0.15); }
    `;
}

function deepActiveElement(): HTMLElement | undefined {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return (active as HTMLElement) ?? undefined;
}

declare global {
    interface HTMLElementTagNameMap { 'juel-file-picker': JuelFilePicker }
}
