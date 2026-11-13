// <juel-pdf>: a PDF drawn page by page with pdf.js (Mozilla's viewer, Apache-2.0), the same in every browser,
// including the Android WebView and Safari on iPhone and iPad, where a frame with a PDF in it shows nothing or
// only its first page. See README.md beside this file.
//
// pdf.js isn't bundled into Juel: it's about 1.7 MB, so it loads from a URL the first time a <juel-pdf> needs it
// (`library`, else `<meta name="juel-pdfjs" content="…/pdf.min.mjs">`). Its worker, standard fonts, character
// maps and image decoders are found beside that file, as `npm run pdfjs` copies them into `dist/pdfjs/`.

import { CSSResultGroup, html, LitElement, nothing, PropertyValues, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import Styles from 'bundle-text:./Pdf.less';
export { parsePages } from './Pages';

/** What a person sees of a document: its page, zoom (1 = fitted) and where it's scrolled to (0-1 across, 0-1 down). */
export interface PdfView {
    page: number;
    zoom: number;
    x: number;
    y: number;
}

/** Why a document isn't showing: no pdf.js, a file that wasn't found or isn't a PDF, or one with a password. */
export type PdfError = 'library' | 'missing' | 'password' | 'unreadable';

// The parts of pdf.js used here (its own types would pull its bundle into Juel's).
interface PdfJsViewport { width: number; height: number }
interface PdfJsPage {
    getViewport(o: { scale: number }): PdfJsViewport;
    render(o: { canvas: HTMLCanvasElement; viewport: PdfJsViewport; transform?: number[] }): { promise: Promise<void>; cancel(): void };
    cleanup(): void;
}
interface PdfJsDocument { numPages: number; getPage(n: number): Promise<PdfJsPage>; destroy(): Promise<void> }
interface PdfJsLoadingTask { promise: Promise<PdfJsDocument>; onPassword?: (update: (pw: string) => void, reason: number) => void; destroy(): Promise<void> }
interface PdfJs {
    GlobalWorkerOptions: { workerSrc: string };
    getDocument(o: Record<string, unknown>): PdfJsLoadingTask;
}

const Meta = 'juel-pdfjs';
/** Most pixels a page's canvas gets (Safari refuses canvases much past 16 million). */
const MaxPixels = 16_000_000;
const MaxZoom = 6;
const MinZoom = 0.25;

let library: Promise<PdfJs | null> | null = null;
let libraryBase = '';

/** The URL pdf.js loads from: the element's own, else the page's `<meta name="juel-pdfjs">`. */
function libraryUrl(own: string | undefined): string | undefined {
    return own || document.querySelector<HTMLMetaElement>(`meta[name="${Meta}"]`)?.content || undefined;
}

/** Whether a <juel-pdf> here could load pdf.js: it's on the page already, or the page says where it is. */
export function pdfJsAvailable(): boolean {
    return !!(globalThis as unknown as { pdfjsLib?: unknown }).pdfjsLib || !!document.querySelector(`meta[name="${Meta}"]`);
}

/**
 * pdf.js, loaded once a page, by a module `<script>` (no `eval`, so a strict Content-Security-Policy that
 * allows the file allows this). Its build sets `globalThis.pdfjsLib`.
 */
export function loadPdfJs(url: string | undefined): Promise<PdfJs | null> {
    const g = globalThis as unknown as { pdfjsLib?: PdfJs };
    if (library) return library;
    if (g.pdfjsLib) return library = Promise.resolve(g.pdfjsLib);
    if (!url) return Promise.resolve(null);
    const absolute = new URL(url, document.baseURI).href;
    libraryBase = absolute.slice(0, absolute.lastIndexOf('/') + 1);
    return library = new Promise<PdfJs | null>(resolve => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = absolute;
        script.onload = () => {
            const lib = g.pdfjsLib ?? null;
            if (lib) lib.GlobalWorkerOptions.workerSrc = absolute.replace(/pdf(\.min)?\.mjs(\?.*)?$/, 'pdf.worker$1.mjs$2');
            resolve(lib);
        };
        script.onerror = () => {
            console.warn(`[juel-pdf] pdf.js didn't load: ${absolute}`);
            library = null;
            resolve(null);
        };
        document.head.appendChild(script);
    });
}

@customElement("juel-pdf")
export class JuelPdf extends LitElement {
    static styles?: CSSResultGroup = unsafeCSS(Styles);

    /** The PDF's URL. */
    @property() src = '';
    /** The page on show, from 1. */
    @property({ type: Number, reflect: true }) page = 1;
    /** `page` fits the whole page in the element; `width` fits its width and scrolls down. */
    @property({ reflect: true }) fit: 'page' | 'width' = 'page';
    /** 1 is fitted; up to 6. */
    @property({ type: Number }) zoom = 1;
    /** Holds back: nothing loads (or what loaded is let go, its last page left showing) until it's taken away. */
    @property({ type: Boolean, reflect: true }) deferred = false;
    /** Where pdf.js loads from, if not the page's `<meta name="juel-pdfjs">`. */
    @property() library?: string;
    /** Page buttons and zoom under the page. */
    @property({ type: Boolean, reflect: true }) controls = false;
    /** What a screen reader hears, and what shows when the document can't. */
    @property() alt = '';
    /** A picture shown until a page is drawn (a still of it, for a copy that doesn't load its own). */
    @property() poster = '';

    /** How many pages it has, once it has loaded (0 before). */
    @state() pageCount = 0;
    @state() private error: PdfError | null = null;
    @state() private busy = false;
    /** A page is on the canvas (drawn, or kept from before it was held back). */
    @state() private hasPage = false;

    @query('.scroller') private scroller!: HTMLElement;
    @query('canvas.page') private canvas!: HTMLCanvasElement;

    private doc: PdfJsDocument | null = null;
    private task: PdfJsLoadingTask | null = null;
    private loadedSrc = '';
    private rendering: { cancel(): void } | null = null;
    /** Pages drawn ahead (the next and the one before), by page and size. */
    private ahead = new Map<string, HTMLCanvasElement>();
    private resize?: ResizeObserver;
    private drawQueued = false;
    private drawn = '';
    private settle: (ok: boolean) => void = () => {};
    /** Resolves true once the document has loaded and its page is drawn, false if it can't show. Renewed with each `src`. */
    loaded: Promise<boolean> = new Promise(resolve => this.settle = resolve);

    /** The page as last drawn, as a PNG data URL (for print, and a copy that can't run its own), or ''. */
    get still(): string {
        try {
            return this.canvas && this.canvas.width ? this.canvas.toDataURL('image/png') : '';
        } catch {
            return '';
        }
    }

    connectedCallback() {
        super.connectedCallback();
        if (!this.hasAttribute('role')) this.setAttribute('role', 'document');
        this.resize = new ResizeObserver(() => this.queueDraw());
        this.resize.observe(this);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.resize?.disconnect();
        void this.unload();
    }

    protected updated(changed: PropertyValues) {
        if (changed.has('alt')) this.setAttribute('aria-label', this.alt || 'PDF document');
        if (changed.has('src') && changed.get('src') !== undefined) {
            void this.unload();
            this.loaded = new Promise(resolve => this.settle = resolve);
        }
        if (changed.has('src') || changed.has('deferred') || changed.has('library')) void this.ensure();
        if (changed.has('page') || changed.has('fit') || changed.has('zoom')) {
            if (this.pageCount && (this.page < 1 || this.page > this.pageCount)) {
                this.page = Math.min(Math.max(1, Math.round(this.page) || 1), this.pageCount);
                return;
            }
            this.queueDraw();
            if (changed.has('page') && changed.get('page') !== undefined && this.scroller) this.scroller.scrollTo(0, 0);
            if (changed.has('page') && changed.get('page') !== undefined)
                this.dispatchEvent(new CustomEvent('juel-pdf-page', { detail: { page: this.page, pages: this.pageCount }, bubbles: true, composed: true }));
        }
    }

    /** Loads the document, unless held back or already loaded. */
    private async ensure() {
        if (this.deferred) {
            await this.unload(true);
            return;
        }
        if (!this.src || (this.doc && this.loadedSrc === this.src) || this.task) return;
        const src = this.src;
        this.error = null;
        this.busy = true;
        const lib = await loadPdfJs(libraryUrl(this.library));
        if (src !== this.src || this.deferred) { this.busy = false; return; }
        if (!lib) return this.fail('library');
        const base = libraryBase;
        const task = lib.getDocument({
            url: new URL(src, document.baseURI).href,
            isEvalSupported: false,
            enableXfa: false,
            ...(base ? {
                standardFontDataUrl: `${base}standard_fonts/`,
                cMapUrl: `${base}cmaps/`,
                cMapPacked: true,
                wasmUrl: `${base}wasm/`,
                iccUrl: `${base}iccs/`,
            } : {}),
        });
        this.task = task;
        let password = false;
        task.onPassword = () => {
            password = true;
            void task.destroy();
        };
        try {
            const doc = await task.promise;
            if (this.task !== task) { void doc.destroy(); return; }
            this.doc = doc;
            this.loadedSrc = src;
            this.task = null;
            this.pageCount = doc.numPages;
            if (this.page > doc.numPages) this.page = doc.numPages;
            this.dispatchEvent(new CustomEvent('juel-pdf-load', { detail: { pages: doc.numPages }, bubbles: true, composed: true }));
            await this.updateComplete;
            await this.draw();
            this.busy = false;
            this.settle(true);
        } catch (e) {
            if (this.task !== task) return;
            this.task = null;
            const name = (e as { name?: string })?.name ?? '';
            this.fail(password || name === 'PasswordException' ? 'password' : name === 'MissingPDFException' || /404|not found/i.test(String((e as Error)?.message)) ? 'missing' : 'unreadable');
        }
    }

    private fail(error: PdfError) {
        this.busy = false;
        this.error = error;
        this.settle(false);
        this.dispatchEvent(new CustomEvent('juel-pdf-error', { detail: { error }, bubbles: true, composed: true }));
    }

    /** Lets the document go. `keep` leaves the last page showing (held back), otherwise the canvas is cleared. */
    private async unload(keep = false) {
        this.rendering?.cancel();
        this.rendering = null;
        this.drawing = null;
        this.ahead.clear();
        const task = this.task;
        const doc = this.doc;
        this.task = null;
        this.doc = null;
        this.loadedSrc = '';
        this.busy = false;
        if (!keep) {
            this.drawn = '';
            this.hasPage = false;
            if (this.canvas) this.canvas.width = this.canvas.height = 0;
        }
        await task?.destroy().catch(() => {});
        await doc?.destroy().catch(() => {});
    }

    private queueDraw() {
        if (this.drawQueued || !this.doc) return;
        this.drawQueued = true;
        requestAnimationFrame(() => {
            this.drawQueued = false;
            void this.draw();
        });
    }

    /** The scale a page is drawn at: fitted to the element, times the zoom. */
    private scaleFor(page: PdfJsPage): number {
        const natural = page.getViewport({ scale: 1 });
        const box = this.scroller ?? this;
        const width = Math.max(1, box.clientWidth);
        const height = Math.max(1, box.clientHeight);
        const fitted = this.fit === 'width' ? width / natural.width : Math.min(width / natural.width, height / natural.height);
        return fitted * this.zoom;
    }

    private async drawInto(canvas: HTMLCanvasElement, n: number): Promise<{ cssWidth: number; cssHeight: number } | null> {
        if (!this.doc) return null;
        const page = await this.doc.getPage(n);
        const scale = this.scaleFor(page);
        const css = page.getViewport({ scale });
        let ratio = Math.min(window.devicePixelRatio || 1, 3);
        if (css.width * css.height * ratio * ratio > MaxPixels) ratio = Math.sqrt(MaxPixels / (css.width * css.height));
        const viewport = page.getViewport({ scale: scale * ratio });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const task = page.render({ canvas, viewport });
        if (canvas === this.canvas) this.rendering = task;
        await task.promise;
        return { cssWidth: css.width, cssHeight: css.height };
    }

    private sizeKey(n: number) {
        const box = this.scroller ?? this;
        return `${n}|${box.clientWidth}x${box.clientHeight}|${this.fit}|${this.zoom}|${window.devicePixelRatio}`;
    }

    /** Draws the page on show (from what was drawn ahead when it can), then the pages either side of it. */
    private draw(): Promise<void> {
        if (!this.doc || !this.canvas || this.deferred) return Promise.resolve();
        const n = Math.min(Math.max(1, this.page), this.doc.numPages);
        const key = this.sizeKey(n);
        if (key === this.drawn) return Promise.resolve();
        // The same page at the same size is already being drawn: wait for it, rather than start again.
        if (this.drawing?.key === key) return this.drawing.promise;
        const promise = this.drawPage(n, key).finally(() => {
            if (this.drawing?.promise === promise) this.drawing = null;
        });
        this.drawing = { key, promise };
        return promise;
    }

    private drawing: { key: string; promise: Promise<void> } | null = null;

    private async drawPage(n: number, key: string) {
        this.rendering?.cancel();
        const ready = this.ahead.get(key);
        try {
            if (ready) {
                this.canvas.width = ready.width;
                this.canvas.height = ready.height;
                this.canvas.getContext('2d')!.drawImage(ready, 0, 0);
                this.setCssSize(Number(ready.dataset.w), Number(ready.dataset.h));
            } else {
                const size = await this.drawInto(this.canvas, n);
                if (!size) return;
                this.setCssSize(size.cssWidth, size.cssHeight);
            }
            this.drawn = key;
            this.hasPage = true;
        } catch (e) {
            if ((e as { name?: string })?.name !== 'RenderingCancelledException') console.warn('[juel-pdf]', e);
            return;
        }
        this.rendering = null;
        this.dispatchEvent(new CustomEvent('juel-pdf-drawn', { detail: { page: n }, bubbles: true, composed: true }));
        void this.drawAhead(n);
    }

    private setCssSize(width: number, height: number) {
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    }

    private async drawAhead(n: number) {
        const keep = new Set<string>();
        for (const m of [n + 1, n - 1]) {
            if (!this.doc || m < 1 || m > this.doc.numPages) continue;
            const key = this.sizeKey(m);
            keep.add(key);
            if (this.ahead.has(key)) continue;
            const canvas = document.createElement('canvas');
            try {
                const size = await this.drawInto(canvas, m);
                if (!size || this.page !== n) return;
                canvas.dataset.w = String(size.cssWidth);
                canvas.dataset.h = String(size.cssHeight);
                this.ahead.set(key, canvas);
            } catch {
                return;
            }
        }
        for (const key of [...this.ahead.keys()]) if (!keep.has(key)) this.ahead.delete(key);
    }

    /** The next page; false on the last. */
    next(): boolean {
        if (!this.pageCount || this.page >= this.pageCount) return false;
        this.page++;
        return true;
    }

    /** The page before; false on the first. */
    previous(): boolean {
        if (this.page <= 1) return false;
        this.page--;
        return true;
    }

    goTo(page: number) {
        this.page = page;
    }

    /** Where it's turned, zoomed and scrolled to. */
    getView(): PdfView {
        const s = this.scroller;
        const across = s ? s.scrollWidth - s.clientWidth : 0;
        const down = s ? s.scrollHeight - s.clientHeight : 0;
        return { page: this.page, zoom: this.zoom, x: across > 0 ? s.scrollLeft / across : 0, y: down > 0 ? s.scrollTop / down : 0 };
    }

    /** Shows `view` (from another screen). Fires no `juel-view-change`. */
    async setView(view: Partial<PdfView>) {
        if (view.page) this.page = view.page;
        if (view.zoom) this.zoom = clampZoom(view.zoom);
        await this.updateComplete;
        if (this.doc) await this.draw();
        const s = this.scroller;
        if (!s) return;
        this.quiet = true;
        s.scrollLeft = (view.x ?? 0) * (s.scrollWidth - s.clientWidth);
        s.scrollTop = (view.y ?? 0) * (s.scrollHeight - s.clientHeight);
        requestAnimationFrame(() => this.quiet = false);
    }

    /**
     * Draws its page once and lets the document go again, for print: the page stays on the canvas. Resolves
     * when it's there, or when it can't be.
     */
    async drawStill(): Promise<boolean> {
        const held = this.deferred;
        this.deferred = false;
        await this.updateComplete;
        const ok = await Promise.race([this.loaded, new Promise<boolean>(r => setTimeout(() => r(false), 20000))]);
        if (held) {
            this.deferred = true;
            await this.updateComplete;
        }
        return ok;
    }

    private quiet = false;

    private changed() {
        if (this.quiet) return;
        this.dispatchEvent(new CustomEvent<PdfView>('juel-view-change', { detail: this.getView(), bubbles: true, composed: true }));
    }

    private zoomBy(factor: number) {
        this.zoom = clampZoom(this.zoom * factor);
        void this.updateComplete.then(() => this.changed());
    }

    private onWheel = (e: WheelEvent) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };

    private onKey = (e: KeyboardEvent) => {
        if (e.key === '+' || e.key === '=') this.zoomBy(1.25);
        else if (e.key === '-') this.zoomBy(0.8);
        else if (e.key === '0') this.zoomBy(1 / this.zoom);
        else return;
        e.preventDefault();
        e.stopPropagation();
    };

    /** Its alt text, else its file's name. */
    private name(): string {
        if (this.alt) return this.alt;
        try {
            return decodeURIComponent(this.src.split(/[?#]/)[0].split('/').pop() ?? '') || 'PDF';
        } catch {
            return 'PDF';
        }
    }

    private message(): string {
        const name = this.alt || this.name().replace(/^PDF$/, 'This PDF');
        switch (this.error) {
            case 'password': return `${name} has a password. Save a copy without one, then use that.`;
            case 'missing': return `${name} wasn't found.`;
            case 'library': return `${name} can't be shown here: the PDF viewer didn't load.`;
            default: return `${name} couldn't be read as a PDF.`;
        }
    }

    render() {
        return html`
            <div class="scroller" part="scroller" tabindex="-1" @scroll=${() => this.changed()} @wheel=${this.onWheel} @keydown=${this.onKey}>
                <canvas class="page" part="page" aria-hidden="true" width="0" height="0"></canvas>
            </div>
            ${this.error ? html`<div class="message" part="message" role="status"><slot>${this.message()}</slot></div>` : nothing}
            ${this.busy && !this.drawn ? html`<div class="loading" part="loading" aria-hidden="true"></div>` : nothing}
            ${!this.hasPage && this.poster && !this.error ? html`<img class="poster" part="poster" src=${this.poster} alt="">` : nothing}
            ${!this.hasPage && !this.poster && !this.busy && !this.error ? html`
                <div class="placeholder" part="placeholder" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="40" height="40"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5zM8 12h8v2H8zm0 4h8v2H8z"/></svg>
                    <span>${this.name()}</span>
                </div>` : nothing}
            ${this.controls && this.pageCount ? html`
                <div class="controls" part="controls">
                    <button type="button" title="Previous page" aria-label="Previous page" ?disabled=${this.page <= 1} @click=${() => { this.previous(); this.changed(); }}>‹</button>
                    <span class="count">${this.page} / ${this.pageCount}</span>
                    <button type="button" title="Next page" aria-label="Next page" ?disabled=${this.page >= this.pageCount} @click=${() => { this.next(); this.changed(); }}>›</button>
                    <button type="button" title="Smaller" aria-label="Smaller" @click=${() => this.zoomBy(0.8)}>−</button>
                    <button type="button" title="Bigger" aria-label="Bigger" @click=${() => this.zoomBy(1.25)}>+</button>
                </div>` : nothing}
        `;
    }
}

function clampZoom(zoom: number) {
    return Math.min(MaxZoom, Math.max(MinZoom, zoom));
}

declare global {
    interface HTMLElementTagNameMap {
        "juel-pdf": JuelPdf;
    }
}
