import { JuelComponent } from "../../_Base/JuelComponent";
import { AppendStyle } from "../../_Utils/ElementHelpers";
import { customElement, property } from "lit/decorators";
import bind from "bind-decorator";
import Styles from 'bundle-text:./Splitter.less';
import { unsafeCSS } from "lit";

// A dependency-free resizable-pane splitter (replaces the split.js integration
// this component originally used) driven by pointer events over flex-basis.

@customElement("juel-splitter")
export class JuelSplitter extends JuelComponent {

    static StyleName = "juel-split";
    static styles = unsafeCSS(Styles);

    @property({ type: Boolean }) vertical: boolean;
    @property({ type: Number }) gutterSize: number = 8;
    @property({ type: Number }) minPaneSize: number = 40;

    private activeDrag: { prev: HTMLElement; next: HTMLElement } | null = null;

    constructor() {
        super();
        this.vertical = false;
    }

    protected createRenderRoot(): HTMLElement | DocumentFragment {
        return this;
    }

    private _observer?: MutationObserver;

    firstLoad(): void {
        AppendStyle(JuelSplitter.StyleName, Styles);
        // Since this component renders to the light DOM (see createRenderRoot
        // above), the document-head stylesheet AppendStyle injects only
        // reaches instances that live directly in page light DOM. An
        // instance placed inside another component's shadow root (e.g.
        // juel-mdi's row/column layout) sits behind that shadow boundary,
        // which document.head styles can't cross — copy the stylesheet into
        // that root too so nested usage lays out correctly.
        const root = this.getRootNode();
        if (root instanceof ShadowRoot && !root.querySelector(`#${JuelSplitter.StyleName}`)) {
            let style = document.createElement('style');
            style.id = JuelSplitter.StyleName;
            style.textContent = Styles;
            root.prepend(style);
        }

        this.syncGutters();
        // Panes can come and go after the first load (juel-mdi docking,
        // minimising or restoring a pane re-renders this splitter's
        // children), so the gutters are rebuilt whenever the child list
        // changes, not just once.
        this._observer = new MutationObserver(() => this.syncGutters());
        this._observer.observe(this, { childList: true });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._observer?.disconnect();
        this._observer = undefined;
    }

    connectedCallback() {
        super.connectedCallback();
        if (this.loaded && !this._observer) {
            this._observer = new MutationObserver(() => this.syncGutters());
            this._observer.observe(this, { childList: true });
            this.syncGutters();
        }
    }

    /** Remove and re-insert a gutter between each pair of panes. */
    syncGutters(): void {
        this._observer?.disconnect();
        try {
            for (const gutter of Array.from(this.children).filter(el => el.classList.contains('gutter'))) {
                gutter.remove();
            }
            const panes = Array.from(this.children) as HTMLElement[];
            // A pane may already carry an explicit flex-basis (e.g. juel-mdi
            // rendering a saved layout's pane sizes) — only default the rest to
            // an equal share, so a caller-supplied size survives this pass
            // regardless of which mounts first.
            const basis = 100 / Math.max(1, panes.length);
            for (const pane of panes) {
                if (!pane.style.flex) pane.style.flex = `1 1 ${basis}%`;
                pane.classList.add('juel-split-pane');
            }
            for (let i = 0; i < panes.length - 1; i++) {
                const gutter = document.createElement('div');
                gutter.className = `gutter gutter-${this.vertical ? 'vertical' : 'horizontal'}`;
                gutter.style.flex = `0 0 ${this.gutterSize}px`;
                this.insertBefore(gutter, panes[i + 1]);
                const prev = panes[i], next = panes[i + 1];
                gutter.addEventListener('pointerdown', (e: PointerEvent) => this.startDrag(e, prev, next, gutter));
            }
        } finally {
            this._observer?.observe(this, { childList: true });
        }
    }

    @bind
    private startDrag(e: PointerEvent, prev: HTMLElement, next: HTMLElement, gutter: HTMLElement) {
        e.preventDefault();
        gutter.setPointerCapture(e.pointerId);
        this.activeDrag = { prev, next };

        const containerRect = this.getBoundingClientRect();
        const containerSize = this.vertical ? containerRect.height : containerRect.width;
        const prevRect = prev.getBoundingClientRect();
        const nextRect = next.getBoundingClientRect();
        const startPos = this.vertical ? e.clientY : e.clientX;
        const prevStartSize = this.vertical ? prevRect.height : prevRect.width;
        const nextStartSize = this.vertical ? nextRect.height : nextRect.width;

        const onMove = (moveEvent: PointerEvent) => {
            const pos = this.vertical ? moveEvent.clientY : moveEvent.clientX;
            const delta = pos - startPos;
            let prevSize = prevStartSize + delta;
            let nextSize = nextStartSize - delta;
            if (prevSize < this.minPaneSize || nextSize < this.minPaneSize) {
                return;
            }
            prev.style.flex = `1 1 ${(prevSize / containerSize) * 100}%`;
            next.style.flex = `1 1 ${(nextSize / containerSize) * 100}%`;
            this.dispatchEvent(new CustomEvent('resize', { detail: { prev, next } }));
        };
        const onUp = (upEvent: PointerEvent) => {
            gutter.releasePointerCapture(upEvent.pointerId);
            this.activeDrag = null;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            this.dispatchEvent(new CustomEvent('resized', { detail: { prev, next } }));
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }
}
