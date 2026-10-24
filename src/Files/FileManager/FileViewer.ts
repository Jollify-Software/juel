// <juel-file-viewer>: a file full-window on a dark background, as OneDrive
// shows one: the name at the top, ‹ › through the folder's other files, and
// Download / Delete / ✕. Pictures, video, sound, text, tables (CSV, JSON
// arrays) and PDFs show; anything else gets its icon and a Download button. See src/Files/README.md.
//
// <juel-file-manager> opens one for `file-open`; a page can use it alone:
//   viewer.show(storage, files, index)
//
// (Not on juel-lightbox: that one collects images from the page by selector,
// needs jQuery, and has no name bar, download or delete.)
import { LitElement, PropertyValues, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { FileRecord, IFileStorage } from '../Storage/IFileStorage';
import { kindOf } from '../Storage/Paths';
import { icon, kindIcon } from './Icons';
import { formatSize } from './Format';
import { tableOf } from './Table';

/** Text files bigger than this show only their start. */
const MaxText = 256 * 1024;
const Swipe = 50;

@customElement('juel-file-viewer')
export class JuelFileViewer extends LitElement {
    /** Where the files are. */
    @property({ attribute: false }) storage?: IFileStorage;
    /** The files to step through (folders are skipped). */
    @property({ attribute: false }) files: FileRecord[] = [];
    /** Which of `files` is on show. */
    @property({ type: Number }) index = 0;
    @property({ type: Boolean, reflect: true }) open = false;
    /** Shows Delete; the page does the deleting, on `viewer-delete`. */
    @property({ type: Boolean, attribute: 'can-delete' }) canDelete = false;

    @state() private url?: string;
    @state() private text?: string;
    @state() private truncated = false;
    @state() private loading = false;
    @state() private error = '';

    @query('.close') private closeButton?: HTMLButtonElement;
    @query('dialog') private dialog?: HTMLDialogElement;

    /** The URL on show, and whether it's ours to revoke. */
    private shown?: { key: string; url: string; own: boolean };
    private loadToken = 0;
    private returnFocus?: HTMLElement;
    private swipeX?: number;

    /** The file on show. */
    get current(): FileRecord | undefined {
        return this.files[this.index];
    }

    /** Opens on one of these files. */
    async show(storage: IFileStorage, files: FileRecord[], index = 0) {
        this.returnFocus = deepActiveElement();
        this.storage = storage;
        this.files = files.filter(f => f.kind === 'file');
        this.index = Math.max(0, this.files.indexOf(files[index]));
        this.open = true;
        await this.updateComplete;
        // A modal <dialog> (the top layer): over a page's own modal dialog too, which would
        // otherwise leave the viewer under it and inert (a file manager in a juel-modal).
        if (this.dialog && !this.dialog.open) this.dialog.showModal();
        this.closeButton?.focus();
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('keydown', this.onDocumentKeydown);
    }

    close() {
        if (!this.open) return;
        this.open = false;
        if (this.dialog?.open) this.dialog.close();
        this.release();
        this.dispatch('viewer-close', { record: this.current });
        this.returnFocus?.focus?.();
        this.returnFocus = undefined;
    }

    next() { this.go(this.index + 1); }
    previous() { this.go(this.index - 1); }

    /** Takes a file out (after the page deleted it): shows the next one, or closes. */
    forget(record: FileRecord) {
        const at = this.files.findIndex(f => f.path === record.path);
        if (at < 0) return;
        this.files = this.files.filter((_, i) => i !== at);
        if (!this.files.length) { this.close(); return; }
        this.index = Math.min(at, this.files.length - 1);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this.onDocumentKeydown);
        this.release();
    }

    protected willUpdate(changed: PropertyValues<this>) {
        if ((changed.has('index') || changed.has('files') || changed.has('open')) && this.open) void this.load();
    }

    private go(index: number) {
        if (index < 0 || index >= this.files.length || index === this.index) return;
        this.index = index;
        this.dispatch('viewer-change', { record: this.current, index });
        // A ‹ or › that's now disabled would drop the focus to the page.
        void this.updateComplete.then(() => {
            const active = this.shadowRoot?.activeElement as HTMLButtonElement | null;
            if (!active || active.disabled) this.renderRoot.querySelector<HTMLElement>('.viewer')?.focus();
        });
    }

    /** Keys while open: from inside the viewer, or with nothing else focused (not, say, from a message box over it). */
    private onDocumentKeydown = (e: KeyboardEvent) => {
        if (!this.open || e.defaultPrevented) return;
        const target = e.composedPath()[0];
        if (e.composedPath().includes(this) || target === document.body || target === document.documentElement) this.onKeydown(e);
    };

    private async load() {
        const record = this.current, storage = this.storage;
        if (!record || !storage) return;
        const key = `${record.id}:${record.modified}`;
        if (this.shown?.key === key) return;
        const token = ++this.loadToken;
        this.release();
        this.loading = true;
        this.error = '';
        try {
            const kind = kindOf(record);
            if (kind === 'text' || kind === 'data') {
                const blob = await storage.read(record.path);
                const text = await blob.slice(0, MaxText).text();
                if (token !== this.loadToken) return;
                this.text = text;
                this.truncated = blob.size > MaxText;
                this.shown = { key, url: '', own: false };
            } else if (kind === 'picture' || kind === 'video' || kind === 'sound' || kind === 'document') {
                const given = await storage.urlFor?.(record.path);
                const url = given ?? URL.createObjectURL(await storage.read(record.path));
                if (token !== this.loadToken) { if (!given) URL.revokeObjectURL(url); return; }
                this.shown = { key, url, own: !given };
                this.url = url;
            } else {
                this.shown = { key, url: '', own: false };
            }
        } catch (error) {
            if (token !== this.loadToken) return;
            this.error = error instanceof Error ? error.message : String(error);
        } finally {
            if (token === this.loadToken) this.loading = false;
        }
    }

    private release() {
        if (this.shown?.own) URL.revokeObjectURL(this.shown.url);
        this.shown = undefined;
        this.url = undefined;
        this.text = undefined;
        this.truncated = false;
    }

    private async download() {
        const record = this.current;
        if (!record || !this.storage || !this.dispatch('viewer-download', { record }, true)) return;
        const url = URL.createObjectURL(await this.storage.read(record.path));
        const a = document.createElement('a');
        a.href = url;
        a.download = record.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }

    private onKeydown(e: KeyboardEvent) {
        const inMedia = (e.composedPath()[0] as Element)?.matches?.('video, audio');
        switch (e.key) {
            case 'Escape': e.preventDefault(); this.close(); return;
            case 'ArrowRight': if (!inMedia) { e.preventDefault(); this.next(); } return;
            case 'ArrowLeft': if (!inMedia) { e.preventDefault(); this.previous(); } return;
            case 'Home': e.preventDefault(); this.go(0); return;
            case 'End': e.preventDefault(); this.go(this.files.length - 1); return;
            case 'Delete': if (this.canDelete && this.current) { e.preventDefault(); this.dispatch('viewer-delete', { record: this.current }); } return;
            case 'Tab': this.trapFocus(e); return;
        }
    }

    /** Keeps Tab inside the viewer while it's open. */
    private trapFocus(e: KeyboardEvent) {
        const focusable = [...this.renderRoot.querySelectorAll<HTMLElement>('button:not(:disabled), video, audio, [tabindex="0"]')];
        if (!focusable.length) return;
        const active = this.shadowRoot!.activeElement;
        const at = focusable.indexOf(active as HTMLElement);
        if (e.shiftKey && at <= 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
        else if (!e.shiftKey && at === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
    }

    private onPointerDown(e: PointerEvent) {
        if (e.pointerType === 'touch') this.swipeX = e.clientX;
    }

    private onPointerUp(e: PointerEvent) {
        if (this.swipeX === undefined) return;
        const dx = e.clientX - this.swipeX;
        this.swipeX = undefined;
        if (dx <= -Swipe) this.next();
        else if (dx >= Swipe) this.previous();
    }

    /** Escape on the <dialog>: the viewer's own close (the keydown handler does the same; the dialog mustn't close itself under it). */
    private onCancel = (e: Event) => {
        e.preventDefault();
        this.close();
    };

    private dispatch(name: string, detail: unknown, cancelable = false): boolean {
        return this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true, cancelable }));
    }

    render() {
        const record = this.current;
        if (!this.open || !record) return nothing;
        const first = this.index === 0, last = this.index === this.files.length - 1;
        return html`
            <dialog part="dialog" aria-label=${record.name} @cancel=${this.onCancel}>
            <div class="viewer" part="viewer" tabindex="-1">
                <header part="header">
                    <span class="name" title=${record.name}>${kindIcon(kindOf(record))}<span>${record.name}</span></span>
                    <span class="count">${this.index + 1} of ${this.files.length}</span>
                    <button class="download" data-command="download" title="Download" @click=${this.download}>${icon('download')}<span class="text">Download</span></button>
                    ${this.canDelete ? html`
                        <button class="delete" data-command="delete" title="Delete" @click=${() => this.dispatch('viewer-delete', { record })}>${icon('delete')}<span class="text">Delete</span></button>` : nothing}
                    <button class="close" data-command="close" title="Close" aria-label="Close" @click=${this.close}>${icon('close')}</button>
                </header>
                <div class="stage" part="stage" @pointerdown=${this.onPointerDown} @pointerup=${this.onPointerUp}>
                    <button class="step previous" aria-label="Previous" title="Previous" ?disabled=${first} @click=${this.previous}>${icon('chevron-left')}</button>
                    <div class="content">${this.renderContent(record)}</div>
                    <button class="step next" aria-label="Next" title="Next" ?disabled=${last} @click=${this.next}>${icon('chevron')}</button>
                </div>
            </div>
            </dialog>`;
    }

    private renderContent(record: FileRecord) {
        if (this.error) return html`<div class="none">${kindIcon(kindOf(record))}<p class="error">${this.error}</p></div>`;
        if (this.loading && !this.url && this.text === undefined) return html`<div class="none" aria-busy="true"></div>`;
        const kind = kindOf(record);
        const table = this.text !== undefined ? tableOf(record.name, this.text) : undefined;
        if (table) {
            return html`<div class="table-preview" tabindex="0"><table>
                <thead><tr>${table[0].map(cell => html`<th>${cell}</th>`)}</tr></thead>
                <tbody>${table.slice(1).map(row => html`<tr>${row.map(cell => html`<td>${cell}</td>`)}</tr>`)}</tbody>
            </table></div>`;
        }
        if (this.text !== undefined) {
            return html`<pre class="text-preview" tabindex="0">${this.text}${this.truncated ? html`<span class="more">\n… (the first ${formatSize(MaxText)} of ${formatSize(record.size)})</span>` : nothing}</pre>`;
        }
        if (this.url) {
            switch (kind) {
                case 'picture': return html`<img src=${this.url} alt=${record.name} draggable="false">`;
                case 'video': return html`<video src=${this.url} controls playsinline></video>`;
                case 'sound': return html`<div class="none">${kindIcon('sound')}<audio src=${this.url} controls></audio></div>`;
                case 'document': return html`<iframe src=${this.url} title=${record.name}></iframe>`;
            }
        }
        return html`
            <div class="none">
                ${kindIcon(kind)}
                <p>No preview for this file</p>
                <p class="muted">${formatSize(record.size)}</p>
                <button class="primary" @click=${this.download}>${icon('download')}<span>Download</span></button>
            </div>`;
    }

    static styles = css`
        :host { display: contents; }
        *, *::before, *::after { box-sizing: border-box; }
        /* The native dialog only puts the viewer in the top layer: no box of its own. */
        dialog { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none;
            margin: 0; padding: 0; border: 0; background: transparent; overflow: visible; }
        dialog::backdrop { background: transparent; }
        .viewer {
            position: fixed;
            inset: 0;
            z-index: var(--file-viewer-z-index, 100);
            display: flex;
            flex-direction: column;
            color: #f0f0f0;
            background: var(--file-viewer-background, rgba(18, 18, 18, 0.97));
            font: var(--file-manager-font, 0.875rem/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
        }
        .icon { width: 1.25rem; height: 1.25rem; flex: none; }
        button {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            height: 2.25rem;
            padding: 0 0.6rem;
            font: inherit;
            color: inherit;
            background: none;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
        }
        button:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }
        button:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--juel-accent, #5aa9f0); outline-offset: -2px; }
        .viewer:focus-visible { outline: none; }
        button:disabled { opacity: 0.3; cursor: default; }
        header { display: flex; align-items: center; gap: 0.25rem; padding: 0.5rem 0.75rem; }
        .name { display: flex; align-items: center; gap: 0.5rem; min-width: 0; margin-right: auto; font-size: 1rem; font-weight: 600; }
        .name > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .name .kind { width: 1.5rem; height: 1.5rem; }
        .name .kind.folder, .none .kind.folder { color: inherit; }
        .count { margin-right: 0.5rem; color: #adadad; white-space: nowrap; }
        .stage { flex: 1; min-height: 0; display: flex; align-items: center; gap: 0.5rem; padding: 0 0.5rem 1rem; touch-action: pan-y; }
        .step { flex: none; width: 3rem; height: 3rem; padding: 0; justify-content: center; border-radius: 50%; background: rgba(255, 255, 255, 0.08); }
        .step .icon { width: 1.75rem; height: 1.75rem; }
        .content { flex: 1; min-width: 0; height: 100%; display: grid; place-items: center; }
        img, video { max-width: 100%; max-height: 100%; object-fit: contain; }
        iframe { width: 100%; height: 100%; border: 0; background: #fff; border-radius: 4px; }
        .text-preview {
            width: min(60rem, 100%);
            max-height: 100%;
            margin: 0;
            padding: 1rem 1.25rem;
            overflow: auto;
            color: #e6e6e6;
            background: #262626;
            border-radius: 6px;
            font: 0.8125rem/1.5 ui-monospace, "Cascadia Code", Consolas, monospace;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
        .text-preview .more { color: #adadad; }
        .table-preview {
            max-width: min(60rem, 100%);
            max-height: 100%;
            overflow: auto;
            color: #e6e6e6;
            background: #262626;
            border-radius: 6px;
        }
        .table-preview table { border-collapse: collapse; font-size: 0.8125rem; }
        .table-preview th, .table-preview td { padding: 0.375rem 0.75rem; text-align: left; white-space: nowrap; border-bottom: 1px solid #3d3d3d; }
        .table-preview th { position: sticky; top: 0; background: #333; font-weight: 600; }
        .none { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; }
        .none > .icon { width: 5rem; height: 5rem; color: #adadad; }
        .none p { margin: 0; }
        .muted { color: #adadad; }
        .error { color: #ff7b6b; }
        .primary { margin-top: 0.5rem; padding: 0 1rem; background: var(--juel-accent, #0f6cbd); color: var(--juel-accent-contrast, #fff); }
        .primary:hover:not(:disabled) { background: var(--juel-primary-hover, #115ea3); }
        @media (max-width: 640px) {
            header .text, .count { display: none; }
            .step { position: absolute; z-index: 1; width: 2.5rem; height: 2.5rem; }
            .step.previous { left: 0.25rem; }
            .step.next { right: 0.25rem; }
            .stage { position: relative; padding: 0 0 0.5rem; }
        }
    `;
}

function deepActiveElement(): HTMLElement | undefined {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return (active as HTMLElement) ?? undefined;
}

declare global {
    interface HTMLElementTagNameMap { 'juel-file-viewer': JuelFileViewer }
}
