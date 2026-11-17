// <juel-ghost>, the demo's hand (SHOW-ME-PLAN SM0, §10 Q5: a hand with a
// pointing fingertip): see-through, in the page's accent colour so it's never
// taken for the person's own pointer, the fingertip on the exact point it acts
// on. A tap ripple under the fingertip on a press, a pressed-in finger while
// dragging, key caps for keys it presses, and a caption bubble beside it
// (in the demo bar instead on a narrow screen). Coach mode hides the hand and
// rings what to press instead. It sits in the top layer (a manual popover)
// and lets every pointer through. DemoRunner.ts drives it.
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { PageRect } from './DemoGeometry';
import { Point } from './DemoScript';

/** Where the fingertip is in the hand drawing (its px at the drawn size). */
const Tip = { x: 15.5, y: 1.5 };

const Hand = html`<svg class="hand-svg" viewBox="0 0 36 44" width="40" height="49" aria-hidden="true">
    <g class="halo">
        <rect x="10" y="1" width="8" height="25" rx="4"/>
        <rect x="16.5" y="15" width="7" height="13" rx="3.5"/>
        <rect x="22.5" y="17" width="6.5" height="12" rx="3.2"/>
        <rect x="28" y="19.5" width="5.5" height="10.5" rx="2.75"/>
        <path d="M8 22 H33.5 V32 Q33.5 43 22.5 43 H17 Q8.5 43 6.5 35 Z"/>
        <rect x="1.5" y="21" width="8.5" height="15" rx="4.25" transform="rotate(-28 5.75 28.5)"/>
    </g>
    <g class="fill">
        <rect x="10" y="1" width="8" height="25" rx="4"/>
        <rect x="16.5" y="15" width="7" height="13" rx="3.5"/>
        <rect x="22.5" y="17" width="6.5" height="12" rx="3.2"/>
        <rect x="28" y="19.5" width="5.5" height="10.5" rx="2.75"/>
        <path d="M8 22 H33.5 V32 Q33.5 43 22.5 43 H17 Q8.5 43 6.5 35 Z"/>
        <rect x="1.5" y="21" width="8.5" height="15" rx="4.25" transform="rotate(-28 5.75 28.5)"/>
    </g>
    <g class="lines">
        <path d="M17 24.5 V18.5 M23 26 V20 M28.5 27 V22"/>
    </g>
</svg>`;

@customElement('juel-ghost')
export class JuelGhost extends LitElement {
    /** The finger is pressed in (a press or a drag under way). */
    @property({ type: Boolean, reflect: true }) pressed = false;
    /** Coach mode: no hand, only the ring and the caption. */
    @property({ type: Boolean, reflect: true, attribute: 'no-hand' }) noHand = false;
    /** The caption beside the hand. */
    @property({ type: String }) caption = '';
    /** Key caps showing, as in ["Ctrl", "Z"]. */
    @property({ attribute: false }) caps: string[] = [];
    @state() private ripples: { id: number; x: number; y: number }[] = [];
    @query('.ring') private ringEl!: HTMLElement;

    private nextRipple = 0;
    private at: Point = { x: -100, y: -100 };

    static styles = css`
        :host {
            position: fixed;
            inset: 0 auto auto 0;
            width: 0;
            height: 0;
            margin: 0;
            padding: 0;
            border: 0;
            background: none;
            overflow: visible;
            pointer-events: none;
            z-index: 2147483647;
            --ghost-accent: var(--juel-accent, var(--juel-primary, #2563eb));
            --x: -100px;
            --y: -100px;
            font-family: var(--juel-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
        }
        :host(:not([popover])), :host(:popover-open) { display: block; }
        * { pointer-events: none; }
        .hand {
            position: fixed;
            left: 0;
            top: 0;
            transform: translate(calc(var(--x) - ${Tip.x}px), calc(var(--y) - ${Tip.y}px));
            filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .35));
            opacity: .88;
        }
        :host([no-hand]) .hand { display: none; }
        .hand-svg { display: block; transform-origin: ${Tip.x}px ${Tip.y}px; transition: transform .12s ease; }
        :host([pressed]) .hand-svg { transform: scale(.9) translateY(2px); }
        .halo { fill: #fff; stroke: #fff; stroke-width: 3; stroke-linejoin: round; }
        .fill { fill: var(--ghost-accent); }
        .lines { fill: none; stroke: rgba(255, 255, 255, .55); stroke-width: 1.2; stroke-linecap: round; }
        .ripple {
            position: fixed;
            left: 0;
            top: 0;
            width: 34px;
            height: 34px;
            margin: -17px 0 0 -17px;
            border-radius: 50%;
            border: 2px solid var(--ghost-accent);
            background: color-mix(in srgb, var(--ghost-accent) 25%, transparent);
            animation: tap .55s ease-out forwards;
        }
        @keyframes tap {
            from { transform: var(--at) scale(.3); opacity: .9; }
            to { transform: var(--at) scale(1.4); opacity: 0; }
        }
        .bubble {
            position: fixed;
            left: 0;
            top: 0;
            transform: translate(calc(var(--x) + 30px), calc(var(--y) + 46px));
            box-sizing: border-box;
            max-width: min(300px, calc(100vw - 24px));
            width: max-content;
            padding: 8px 12px;
            border-radius: var(--juel-radius-md, 8px);
            background: var(--juel-raised, #fff);
            color: var(--juel-text, #1d1f23);
            border: 1px solid var(--ghost-accent);
            box-shadow: var(--juel-shadow-2, 0 6px 20px rgba(0, 0, 0, .14), 0 2px 6px rgba(0, 0, 0, .08));
            font-size: 14px;
            line-height: 1.4;
        }
        /* Near the right edge or the bottom, the bubble goes to the other side of the hand. */
        :host(.flip-x) .bubble { transform: translate(calc(var(--x) - 100% - 14px), calc(var(--y) + 46px)); }
        :host(.flip-y) .bubble { transform: translate(calc(var(--x) + 30px), calc(var(--y) - 100% - 10px)); }
        :host(.flip-x.flip-y) .bubble { transform: translate(calc(var(--x) - 100% - 14px), calc(var(--y) - 100% - 10px)); }
        .caps { display: flex; gap: 4px; margin-bottom: 4px; }
        .caps:last-child { margin-bottom: 0; }
        kbd {
            display: inline-block;
            min-width: 1.4em;
            padding: 1px 6px;
            border: 1px solid var(--juel-border, #c9ccd3);
            border-bottom-width: 2px;
            border-radius: 4px;
            background: var(--juel-surface, #f6f7f9);
            font: 600 12px/1.5 var(--juel-font-mono, ui-monospace, monospace);
            text-align: center;
        }
        .ring {
            position: fixed;
            display: none;
            border-radius: 8px;
            box-shadow: 0 0 0 3px var(--ghost-accent), 0 0 0 6px color-mix(in srgb, var(--ghost-accent) 30%, transparent);
            animation: ring 1.6s ease-out infinite;
        }
        @keyframes ring {
            0% { box-shadow: 0 0 0 3px var(--ghost-accent), 0 0 0 3px color-mix(in srgb, var(--ghost-accent) 45%, transparent); }
            70% { box-shadow: 0 0 0 3px var(--ghost-accent), 0 0 0 14px transparent; }
            100% { box-shadow: 0 0 0 3px var(--ghost-accent), 0 0 0 14px transparent; }
        }
        .live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
        /* On a narrow screen the caption is in the demo bar instead (JuelDemoBar), clear of the page. */
        @media (max-width: 600px) {
            .bubble { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
            .hand-svg { transition: none; }
            .ripple { animation-duration: .01s; }
            .ring { animation: none; }
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        if (!this.hasAttribute('popover') && 'showPopover' in HTMLElement.prototype) this.setAttribute('popover', 'manual');
        this.raise();
    }

    /** Puts the ghost on top again: anything opened in the top layer since (a dialog) went above it. */
    public raise() {
        if (!this.isConnected || !this.hasAttribute('popover')) return;
        try {
            if (this.matches(':popover-open')) this.hidePopover();
            this.showPopover();
        } catch { /* not in the document yet */ }
    }

    /** Where the fingertip is, on the page. */
    public get point(): Point {
        return this.at;
    }

    /** Puts the fingertip at `p` (page coordinates). */
    public moveTo(p: Point) {
        this.at = p;
        this.style.setProperty('--x', `${p.x}px`);
        this.style.setProperty('--y', `${p.y}px`);
        this.classList.toggle('flip-x', p.x > window.innerWidth - 330);
        this.classList.toggle('flip-y', p.y > window.innerHeight - 150);
    }

    /** A tap ripple under the fingertip. */
    public tap() {
        const id = this.nextRipple++;
        this.ripples = [...this.ripples, { id, x: this.at.x, y: this.at.y }];
        setTimeout(() => this.ripples = this.ripples.filter(r => r.id !== id), 600);
    }

    /** Rings `rect` (page coordinates) to say "press here", or takes the ring away. */
    public ring(rect: PageRect | null) {
        const r = this.ringEl;
        if (!r) return;
        if (!rect) { r.style.display = 'none'; return; }
        const pad = 4;
        Object.assign(r.style, {
            display: 'block', left: `${rect.left - pad}px`, top: `${rect.top - pad}px`,
            width: `${rect.width + pad * 2}px`, height: `${rect.height + pad * 2}px`,
        });
    }

    render() {
        return html`
            <div class="ring"></div>
            ${this.ripples.map(r => html`<div class="ripple" style="--at: translate(${r.x}px, ${r.y}px); transform: var(--at)"></div>`)}
            <div class="hand">${Hand}</div>
            ${this.caption || this.caps.length ? html`<div class="bubble" part="caption">
                ${this.caps.length ? html`<div class="caps">${this.caps.map(c => html`<kbd>${c}</kbd>`)}</div>` : nothing}
                ${this.caption ? html`<div class="text">${this.caption}</div>` : nothing}
            </div>` : nothing}
            <div class="live" role="status" aria-live="polite">${this.caption}</div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-ghost': JuelGhost }
}
