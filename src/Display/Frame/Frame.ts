import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { FrameEvents, FrameMessageDetail } from './FrameEvents';
import { parseAspect } from './parseAspect';

/**
 * `<juel-frame>`: a sandboxed iframe host for previews (a Jetty deck in the
 * Jollify app's editor, a Jellyfish page, a Juel Garden scene).
 *
 * - Content: `srcdoc` (property or attribute) or `src`.
 * - `sandbox`: passed to the iframe; defaults to `allow-scripts`, an opaque
 *   origin. Set `sandbox="none"` for no sandbox at all.
 * - `aspect` (`16:9`, `4:3`, `1280x720`): the page is laid out at
 *   `design-width` (default 1280) by that aspect, then scaled to fit and
 *   centred. Without it, the iframe fills the element.
 * - `buffered`: new content loads in a hidden second iframe and swaps in when
 *   it is ready, so a reload never flashes. Ready means the `load` event, or
 *   with `ready-type="ready"`, the first message whose `type` matches.
 * - `toViewportRect(rect)` maps a rect in the page to the window's px.
 * - `send(data)` posts to the shown frame. Messages from either frame arrive
 *   as `frame-message` `{ data, pending, reply(data) }`; `pending` is true for
 *   the frame still loading behind, and `reply` answers the frame that sent it.
 * - Events: `frame-message`, `frame-load` (the shown frame loaded or was
 *   swapped in).
 */
@customElement('juel-frame')
export class JuelFrame extends LitElement {

    static styles = css`
        /* No natural size (the page inside doesn't size it): full width and an
           iframe's default height unless the page sets them. */
        :host { display: block; position: relative; overflow: hidden; contain: layout paint;
                width: 100%; height: 150px; }
        iframe { position: absolute; left: 0; top: 0; border: 0; width: 100%; height: 100%;
                 transform-origin: 0 0; background: var(--juel-frame-background, transparent); }
        iframe { z-index: 1; }
        /* Behind the shown frame and transparent, not visibility: hidden: Chrome
           stops rendering a hidden cross-origin frame (a sandboxed srcdoc is
           one), so a page there that waits for a paint (requestAnimationFrame)
           to say it's ready never would, and the swap would never come. */
        iframe.back { z-index: 0; opacity: 0; pointer-events: none; }
    `;

    @property() srcdoc: string | null = null;
    @property() src: string | null = null;
    @property() sandbox: string = 'allow-scripts';
    @property() aspect: string | null = null;
    @property({ type: Number, attribute: 'design-width' }) designWidth = 1280;
    @property({ type: Boolean }) buffered = false;
    @property({ attribute: 'ready-type' }) readyType: string | null = null;
    /** Accessible name for the iframe. */
    @property({ attribute: 'frame-title' }) frameTitle = 'Preview';

    @query('iframe.a') private frameA!: HTMLIFrameElement;
    @query('iframe.b') private frameB!: HTMLIFrameElement;

    /** Which of the two iframes is on show. */
    private front: 'a' | 'b' = 'a';
    private backPending = false;
    private resizeObserver?: ResizeObserver;
    private onWindowMessage = (e: MessageEvent) => this.handleMessage(e);

    /** The iframe on show. */
    get frame(): HTMLIFrameElement {
        return this.front === 'a' ? this.frameA : this.frameB;
    }

    private get backFrame(): HTMLIFrameElement {
        return this.front === 'a' ? this.frameB : this.frameA;
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('message', this.onWindowMessage);
        this.resizeObserver = new ResizeObserver(() => this.fit());
        this.resizeObserver.observe(this);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('message', this.onWindowMessage);
        this.resizeObserver?.disconnect();
    }

    /** Posts `data` to the frame on show. */
    send(data: unknown) {
        this.frame?.contentWindow?.postMessage(data, '*');
    }

    /**
     * A rect in the shown page's own px (`getBoundingClientRect()` inside
     * it) in the window's: offset by the iframe and scaled as `aspect`
     * scales it. For anchoring things outside the frame to things in it.
     */
    toViewportRect(rect: { x: number, y: number, width: number, height: number }): DOMRect {
        const frame = this.frame;
        const box = frame.getBoundingClientRect();
        const sx = box.width / (frame.offsetWidth || 1), sy = box.height / (frame.offsetHeight || 1);
        return new DOMRect(box.x + rect.x * sx, box.y + rect.y * sy, rect.width * sx, rect.height * sy);
    }

    /** Reloads the current content. */
    reload() {
        this.load();
    }

    render() {
        return html`
            <iframe class="a" title=${this.frameTitle} @load=${() => this.frameLoaded('a')}></iframe>
            <iframe class="b back" title=${this.frameTitle} aria-hidden="true" tabindex="-1"
                    @load=${() => this.frameLoaded('b')}></iframe>`;
    }

    firstUpdated() {
        this.applySandbox(this.frameA);
        this.applySandbox(this.frameB);
        this.fit();
    }

    updated(changed: PropertyValues<this>) {
        if (changed.has('sandbox') && changed.get('sandbox') !== undefined) {
            // A new sandbox only applies to the next navigation.
            this.applySandbox(this.frameA);
            this.applySandbox(this.frameB);
            this.load();
        }
        if (changed.has('srcdoc') || changed.has('src')) this.load();
        if (changed.has('aspect') || changed.has('designWidth')) this.fit();
    }

    private applySandbox(frame: HTMLIFrameElement) {
        if (this.sandbox === 'none') frame.removeAttribute('sandbox');
        else frame.setAttribute('sandbox', this.sandbox ?? '');
    }

    /** Loads the content into the back frame (buffered) or the front one. */
    private load() {
        if (!this.frameA) return;
        const target = this.buffered && this.hasContent(this.frame) ? this.backFrame : this.frame;
        if (target === this.backFrame) this.backPending = true;
        if (this.srcdoc != null) {
            target.removeAttribute('src');
            target.srcdoc = this.srcdoc;
        } else if (this.src) {
            target.removeAttribute('srcdoc');
            target.src = this.src;
        }
    }

    private hasContent(frame: HTMLIFrameElement) {
        return frame.hasAttribute('srcdoc') || frame.hasAttribute('src');
    }

    private frameLoaded(which: 'a' | 'b') {
        const frame = which === 'a' ? this.frameA : this.frameB;
        if (!this.hasContent(frame)) return;
        if (frame === this.backFrame && this.backPending) {
            if (!this.readyType) this.swap();
            return;
        }
        if (frame === this.frame) this.emit(FrameEvents.load, { frame });
    }

    /** Shows the back frame and retires the old one. */
    private swap() {
        const old = this.frame;
        this.backPending = false;
        this.front = this.front === 'a' ? 'b' : 'a';
        const shown = this.frame;
        shown.classList.remove('back');
        shown.removeAttribute('aria-hidden');
        shown.removeAttribute('tabindex');
        old.classList.add('back');
        old.setAttribute('aria-hidden', 'true');
        old.setAttribute('tabindex', '-1');
        // Stop the retired page (media, timers) without a load event of its own.
        old.removeAttribute('srcdoc');
        old.setAttribute('src', 'about:blank');
        this.emit(FrameEvents.load, { frame: shown });
    }

    private handleMessage(e: MessageEvent) {
        const fromFront = e.source === this.frame?.contentWindow;
        const fromBack = !fromFront && this.backPending && e.source === this.backFrame?.contentWindow;
        if (!fromFront && !fromBack) return;

        const source = e.source as Window;
        const detail: FrameMessageDetail = {
            data: e.data,
            pending: fromBack,
            reply: (data: unknown) => source.postMessage(data, '*'),
        };
        this.emit(FrameEvents.message, detail);

        if (fromBack && this.readyType && e.data?.type === this.readyType) this.swap();
    }

    private emit(name: string, detail: unknown) {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    /** Lays the iframes out at the design size and scales them to fit. */
    private fit() {
        if (!this.frameA) return;
        const ratio = parseAspect(this.aspect);
        for (const frame of [this.frameA, this.frameB]) {
            if (!ratio) {
                frame.style.width = frame.style.height = frame.style.transform = frame.style.left = frame.style.top = '';
                continue;
            }
            const width = this.designWidth > 0 ? this.designWidth : 1280;
            const height = width / ratio;
            const scale = Math.min(this.clientWidth / width, this.clientHeight / height) || 0;
            frame.style.width = `${width}px`;
            frame.style.height = `${height}px`;
            frame.style.left = `${(this.clientWidth - width * scale) / 2}px`;
            frame.style.top = `${(this.clientHeight - height * scale) / 2}px`;
            frame.style.transform = `scale(${scale})`;
        }
    }
}
