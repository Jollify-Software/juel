// <juel-paged>: HTML laid out as pages, a page at a time, as <juel-pdf> shows a PDF's. For a document that was written
// as pages (a Word document Slipway has read into HTML: jetty MARKDOWN.md "Documents"), on a slide or anywhere else.
// See README.md beside this file.
//
//   <juel-paged page-width="595.3" page-height="841.9" margins="72 72 72 72" font="'Calibri', sans-serif" font-size="11">
//     <template>…the body's HTML…</template>
//     <template data-part="header">…<span class="paged-page"></span>…</template>
//     <template data-part="footer">…</template>
//   </juel-paged>
//
// Pagination: the body's top-level blocks fill a page, measured in a hidden page of the real size, until the next one
// would overflow; a table that doesn't fit is split between its rows (rows marked data-paged-header repeat); a
// `<div class="paged-break">` starts a new page; a block taller than a page has one to itself (and is cut off).
// It's the same interface as <juel-pdf> (page, fit, zoom, deferred, controls, alt; loaded, pageCount, getView/setView,
// drawStill; the juel-pdf-load / -page / -drawn and juel-view-change events), so a page that shows PDFs shows these too.

import { CSSResultGroup, html, LitElement, nothing, PropertyValues, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import Styles from 'bundle-text:./Paged.less';
import type { PdfView } from "../Pdf/Pdf";

/** CSS pixels in a point. */
const Px = 96 / 72;
const MaxZoom = 6;
const MinZoom = 0.25;

/** `"72 72 72 72"` (top right bottom left, points; CSS's shorthand rules) → the four. */
export function parseMargins(text: string | null | undefined): [number, number, number, number] {
    const n = (text ?? '').trim().split(/\s+/).map(Number).filter(v => Number.isFinite(v) && v >= 0);
    const [t = 72, r = t, b = t, l = r] = n;
    return [t, r, b, l];
}

@customElement("juel-paged")
export class JuelPaged extends LitElement {
    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property({ type: Number, reflect: true }) page = 1;
    @property({ reflect: true }) fit: 'page' | 'width' = 'page';
    @property({ type: Number }) zoom = 1;
    @property({ type: Boolean, reflect: true }) deferred = false;
    @property({ type: Boolean, reflect: true }) controls = false;
    @property() alt = '';
    @property() poster = '';
    /** The page's size and margins, in points (A4, an inch round, unless said). */
    @property({ type: Number, attribute: 'page-width' }) pageWidth = 595.3;
    @property({ type: Number, attribute: 'page-height' }) pageHeight = 841.9;
    @property() margins = '72 72 72 72';
    /** From the page's top to its header, and from its bottom to its footer, in points. */
    @property({ type: Number, attribute: 'header-distance' }) headerDistance = 36;
    @property({ type: Number, attribute: 'footer-distance' }) footerDistance = 36;
    /** The body's font and size in points, when the HTML doesn't say. */
    @property() font = 'sans-serif';
    @property({ type: Number, attribute: 'font-size' }) fontSize = 11;

    @state() pageCount = 0;
    @state() private laidOut = false;

    @query('.scroller') private scroller!: HTMLElement;
    @query('.pages') private pagesEl!: HTMLElement;
    @query('.measure') private measure!: HTMLElement;

    private settle: (ok: boolean) => void = () => {};
    /** Resolves true once the pages are laid out and one is on show, false if there's nothing to lay out. */
    loaded: Promise<boolean> = new Promise(resolve => this.settle = resolve);
    private resize?: ResizeObserver;
    private laying?: Promise<void>;
    private quiet = false;
    /** The page last on show, so a page set out of range and clamped back fires nothing. */
    private shownPage = 1;

    /** Pages are HTML, so they print and copy as they are: no still is needed. */
    get still(): string {
        return '';
    }

    connectedCallback() {
        super.connectedCallback();
        if (!this.hasAttribute('role')) this.setAttribute('role', 'document');
        this.resize = new ResizeObserver(() => this.scale());
        this.resize.observe(this);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.resize?.disconnect();
    }

    protected updated(changed: PropertyValues) {
        if (changed.has('alt')) this.setAttribute('aria-label', this.alt || 'Document');
        if (!this.deferred && !this.laidOut) void this.layOut();
        if (changed.has('page') || changed.has('fit') || changed.has('zoom')) {
            if (this.pageCount && (this.page < 1 || this.page > this.pageCount)) {
                this.page = Math.min(Math.max(1, Math.round(this.page) || 1), this.pageCount);
                return;
            }
            this.show();
            // Once per page turned to: a page set past the end and clamped back is no turn.
            if (changed.has('page') && changed.get('page') !== undefined && this.page !== this.shownPage) {
                this.scroller?.scrollTo(0, 0);
                this.dispatchEvent(new CustomEvent('juel-pdf-page', { detail: { page: this.page, pages: this.pageCount }, bubbles: true, composed: true }));
            }
            this.shownPage = this.page;
        }
    }

    private template(part?: string): HTMLTemplateElement | null {
        return [...this.children].find((c): c is HTMLTemplateElement => c instanceof HTMLTemplateElement && (c.dataset.part ?? '') === (part ?? '')) ?? null;
    }

    /** Lays the body out as pages, once (after the fonts and pictures it uses are in). */
    private layOut(): Promise<void> {
        this.laying ??= (async () => {
            await this.updateComplete;
            const body = this.template();
            if (!body) {
                // Upgraded while the parser is still adding its children (juel.js in the head): wait for the template.
                // With none once the page has been parsed, there's nothing to lay out.
                this.laying = undefined;
                this.waitForTemplate();
                return;
            }
            await document.fonts?.ready;
            const [mt, mr, mb, ml] = parseMargins(this.margins);
            const width = (this.pageWidth - ml - mr) * Px;
            const height = (this.pageHeight - mt - mb) * Px;
            const measure = this.measure;
            measure.style.width = `${width}px`;
            measure.style.fontFamily = this.font;
            measure.style.fontSize = `${this.fontSize}pt`;
            // Pictures first: an unloaded one has no height to measure.
            const content = body.content.cloneNode(true) as DocumentFragment;
            await Promise.all([...content.querySelectorAll('img')].map(img => {
                const probe = new Image();
                probe.src = img.getAttribute('src') ?? '';
                return probe.decode().catch(() => {});
            }));

            const pages: Node[][] = [];
            let current: Node[] = [];
            const fits = () => measure.scrollHeight <= height + 0.5;
            const finish = () => {
                pages.push(current);
                current = [];
                measure.replaceChildren();
            };
            for (const node of [...content.childNodes]) {
                if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()) continue;
                if (node instanceof HTMLElement && node.classList.contains('paged-break')) {
                    if (current.length) finish();
                    continue;
                }
                measure.appendChild(node);
                if (fits()) { current.push(node); continue; }
                measure.removeChild(node);
                if (node instanceof HTMLTableElement && this.splitTable(node, n => current.push(n), () => current.length === 0, finish, fits)) continue;
                if (current.length) finish();
                // Alone on a fresh page: it stays there, cut off if it's taller than the page.
                measure.appendChild(node);
                current.push(node);
                if (!fits()) finish();
            }
            if (current.length || !pages.length) pages.push(current);
            measure.replaceChildren();
            this.build(pages, width, height);
        })();
        return this.laying;
    }

    private watching?: MutationObserver;

    private waitForTemplate() {
        if (this.watching) return;
        const again = () => {
            if (!this.template()) return;
            this.watching?.disconnect();
            this.watching = undefined;
            if (!this.deferred) void this.layOut();
        };
        this.watching = new MutationObserver(again);
        this.watching.observe(this, { childList: true });
        const parsed = () => {
            if (this.template()) again();
            else this.settle(false);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', parsed, { once: true });
        else queueMicrotask(parsed);
    }

    /**
     * A table that doesn't fit: its rows go on this page while they fit, the rest on the next pages, each part with
     * the table's columns and its header rows. False when not even one row fits here and the page is empty (then the
     * table goes on as a block taller than a page).
     */
    private splitTable(table: HTMLTableElement, add: (node: Node) => void, empty: () => boolean, finish: () => void, fits: () => boolean): boolean {
        const rows = [...table.rows];
        const headers = rows.filter(r => r.hasAttribute('data-paged-header'));
        const body = rows.filter(r => !r.hasAttribute('data-paged-header'));
        if (body.length < 2) return false;
        const shell = () => {
            const part = table.cloneNode(false) as HTMLTableElement;
            const columns = table.querySelector(':scope > colgroup');
            if (columns) part.appendChild(columns.cloneNode(true));
            const tbody = document.createElement('tbody');
            for (const h of headers) tbody.appendChild(h.cloneNode(true));
            part.appendChild(tbody);
            return { part, tbody };
        };
        let { part, tbody } = shell();
        this.measure.appendChild(part);
        let placed = 0;
        for (const row of body) {
            tbody.appendChild(row);
            if (fits()) { placed++; continue; }
            tbody.removeChild(row);
            if (placed === 0 && empty()) {
                // Not one row fits on an empty page: it goes alone, cut off.
                tbody.appendChild(row);
                placed++;
                continue;
            }
            if (placed > 0) add(part);
            else this.measure.removeChild(part);
            finish();
            ({ part, tbody } = shell());
            this.measure.appendChild(part);
            tbody.appendChild(row);
            placed = 1;
        }
        add(part);
        return true;
    }

    private build(pages: Node[][], width: number, height: number) {
        const [mt, , , ml] = parseMargins(this.margins);
        const header = this.template('header');
        const footer = this.template('footer');
        const total = pages.length;
        const made = pages.map((nodes, i) => {
            const page = document.createElement('div');
            page.className = 'page';
            page.part.add('page');
            page.style.width = `${this.pageWidth * Px}px`;
            page.style.height = `${this.pageHeight * Px}px`;
            page.style.fontFamily = this.font;
            page.style.fontSize = `${this.fontSize}pt`;
            page.hidden = true;
            const add = (template: HTMLTemplateElement | null, cls: string, place: Partial<CSSStyleDeclaration>) => {
                if (!template) return;
                const box = document.createElement('div');
                box.className = cls;
                Object.assign(box.style, { left: `${ml * Px}px`, width: `${width}px` }, place);
                box.appendChild(template.content.cloneNode(true));
                for (const n of box.querySelectorAll('.paged-page')) n.textContent = String(i + 1);
                for (const n of box.querySelectorAll('.paged-pages')) n.textContent = String(total);
                page.appendChild(box);
            };
            add(header, 'header', { top: `${this.headerDistance * Px}px` });
            const body = document.createElement('div');
            body.className = 'body';
            Object.assign(body.style, { top: `${mt * Px}px`, left: `${ml * Px}px`, width: `${width}px`, height: `${height}px` });
            body.append(...nodes);
            page.appendChild(body);
            add(footer, 'footer', { bottom: `${this.footerDistance * Px}px` });
            return page;
        });
        this.pagesEl.replaceChildren(...made);
        this.pageCount = total;
        this.laidOut = true;
        if (this.page > total) this.page = total;
        this.show();
        this.dispatchEvent(new CustomEvent('juel-pdf-load', { detail: { pages: total }, bubbles: true, composed: true }));
        this.settle(true);
    }

    /** The current page on show, scaled. */
    private show() {
        const pages = this.pagesEl ? [...this.pagesEl.children] as HTMLElement[] : [];
        if (!pages.length) return;
        pages.forEach((p, i) => p.hidden = i !== this.page - 1);
        this.scale();
        this.dispatchEvent(new CustomEvent('juel-pdf-drawn', { detail: { page: this.page }, bubbles: true, composed: true }));
    }

    private scale() {
        if (!this.pagesEl || !this.scroller) return;
        const box = this.scroller;
        const w = Math.max(1, box.clientWidth), h = Math.max(1, box.clientHeight);
        const pw = this.pageWidth * Px, ph = this.pageHeight * Px;
        const fitted = this.fit === 'width' ? w / pw : Math.min(w / pw, h / ph);
        const s = fitted * this.zoom;
        this.pagesEl.style.width = `${pw * s}px`;
        this.pagesEl.style.height = `${ph * s}px`;
        this.pagesEl.style.setProperty('--paged-scale', String(s));
    }

    next(): boolean {
        if (!this.pageCount || this.page >= this.pageCount) return false;
        this.page++;
        return true;
    }

    previous(): boolean {
        if (this.page <= 1) return false;
        this.page--;
        return true;
    }

    goTo(page: number) {
        this.page = page;
    }

    getView(): PdfView {
        const s = this.scroller;
        const across = s ? s.scrollWidth - s.clientWidth : 0;
        const down = s ? s.scrollHeight - s.clientHeight : 0;
        return { page: this.page, zoom: this.zoom, x: across > 0 ? s.scrollLeft / across : 0, y: down > 0 ? s.scrollTop / down : 0 };
    }

    async setView(view: Partial<PdfView>) {
        if (view.page) this.page = view.page;
        if (view.zoom) this.zoom = Math.min(MaxZoom, Math.max(MinZoom, view.zoom));
        await this.updateComplete;
        this.scale();
        const s = this.scroller;
        if (!s) return;
        this.quiet = true;
        s.scrollLeft = (view.x ?? 0) * (s.scrollWidth - s.clientWidth);
        s.scrollTop = (view.y ?? 0) * (s.scrollHeight - s.clientHeight);
        requestAnimationFrame(() => this.quiet = false);
    }

    /** Lays the pages out (if they aren't), for print; holds back again if it was. */
    async drawStill(): Promise<boolean> {
        const held = this.deferred;
        this.deferred = false;
        await this.updateComplete;
        await this.layOut();
        const ok = await this.loaded;
        if (held) this.deferred = true;
        return ok;
    }

    private changed() {
        if (this.quiet) return;
        this.dispatchEvent(new CustomEvent<PdfView>('juel-view-change', { detail: this.getView(), bubbles: true, composed: true }));
    }

    private zoomBy(factor: number) {
        this.zoom = Math.min(MaxZoom, Math.max(MinZoom, this.zoom * factor));
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

    render() {
        return html`
            <div class="scroller" part="scroller" tabindex="-1" @scroll=${() => this.changed()} @wheel=${this.onWheel} @keydown=${this.onKey}>
                <div class="pages"></div>
            </div>
            <div class="measure" aria-hidden="true"></div>
            ${!this.laidOut && this.poster ? html`<img class="poster" part="poster" src=${this.poster} alt="">` : nothing}
            ${!this.laidOut && !this.poster ? html`
                <div class="placeholder" part="placeholder" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="40" height="40"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5zM8 12h8v2H8zm0 4h8v2H8z"/></svg>
                    <span>${this.alt || 'Document'}</span>
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

declare global {
    interface HTMLElementTagNameMap {
        "juel-paged": JuelPaged;
    }
}
