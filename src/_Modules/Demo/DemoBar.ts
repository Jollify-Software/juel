// <juel-demo-bar>, a demo's controls (SHOW-ME-PLAN SM0): its title and "3 of
// 9", then Pause / Play, Step, the speed (½× 1× 2×), Replay and Stop while it
// plays; Show me, Next (or Skip) and Stop in coach mode. Bottom centre, in the
// top layer (a manual popover). Fires `demo-control` with `{ action }`; the
// runner lets the person's clicks through to it and to nothing else.
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type DemoControl = 'pause' | 'play' | 'step' | 'speed' | 'replay' | 'stop' | 'show' | 'next';

/** The speeds the speed button goes round. */
export const DemoSpeeds = [0.5, 1, 2];

@customElement('juel-demo-bar')
export class JuelDemoBar extends LitElement {
    @property({ type: String }) heading = '';
    /** The step showing (0-based) and how many there are. */
    @property({ type: Number }) index = 0;
    @property({ type: Number }) count = 0;
    @property({ type: Boolean, reflect: true }) paused = false;
    @property({ type: Boolean, reflect: true }) coach = false;
    @property({ type: Number }) speed = 1;
    /** Coach mode: the step is one to read, so Next goes on (not Skip). */
    @property({ type: Boolean, attribute: 'reading' }) reading = false;
    /** The demo has ended: only Replay and Close. */
    @property({ type: Boolean, reflect: true }) ended = false;
    /** A message instead of the progress ("Paused: press Play to go on"). */
    @property({ type: String }) note = '';
    /** The step's caption and key caps: shown here on a narrow screen, where the hand's bubble would cover the page. */
    @property({ type: String }) caption = '';
    @property({ attribute: false }) caps: string[] = [];

    static styles = css`
        :host {
            position: fixed;
            inset: auto auto 16px 50%;
            transform: translateX(-50%);
            margin: 0;
            padding: 6px 8px 6px 14px;
            border: 1px solid var(--juel-border, #d9dbe0);
            border-radius: 999px;
            background: var(--juel-raised, #fff);
            color: var(--juel-text, #1d1f23);
            box-shadow: var(--juel-shadow-2, 0 6px 20px rgba(0, 0, 0, .14), 0 2px 6px rgba(0, 0, 0, .08));
            font-family: var(--juel-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
            font-size: 14px;
            max-width: calc(100vw - 24px);
            box-sizing: border-box;
            overflow: visible;
            z-index: 2147483647;
        }
        :host(:not([popover])), :host(:popover-open) { display: block; }
        :host(.hit-through) { pointer-events: none; }
        .bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }
        .what { display: flex; flex-direction: column; margin-inline-end: 6px; min-width: 0; }
        .heading { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 40vw; }
        .progress { font-size: 12px; color: var(--juel-text-muted, var(--juel-muted, #5c616b)); }
        .speed { min-width: 3.2em; }
        .caption { display: none; }
        kbd {
            display: inline-block; min-width: 1.4em; padding: 1px 6px; margin-inline-end: 4px;
            border: 1px solid var(--juel-border, #c9ccd3); border-bottom-width: 2px; border-radius: 4px;
            background: var(--juel-surface, #f6f7f9); font: 600 12px/1.5 var(--juel-font-mono, ui-monospace, monospace);
        }
        @media (max-width: 600px) {
            :host { border-radius: var(--juel-radius-md, 8px); inset: auto 12px 12px 12px; transform: none; }
            .heading { max-width: 60vw; }
            .caption { display: block; margin: 2px 4px 8px; line-height: 1.4; }
            .caption:empty { display: none; }
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        if (!this.hasAttribute('popover') && 'showPopover' in HTMLElement.prototype) this.setAttribute('popover', 'manual');
        if (!this.hasAttribute('role')) this.setAttribute('role', 'toolbar');
        if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Demo');
        this.raise();
    }

    /** Puts the bar on top again (see JuelGhost.raise). */
    public raise() {
        if (!this.isConnected || !this.hasAttribute('popover')) return;
        try {
            if (this.matches(':popover-open')) this.hidePopover();
            this.showPopover();
        } catch { /* not in the document yet */ }
    }

    private act(action: DemoControl) {
        this.dispatchEvent(new CustomEvent<{ action: DemoControl }>('demo-control', { detail: { action }, bubbles: true, composed: true }));
    }

    private speedLabel() {
        return this.speed === 0.5 ? '½×' : `${this.speed}×`;
    }

    private renderCaption() {
        return this.caption || this.caps.length
            ? html`<div class="caption">${this.caps.map(c => html`<kbd>${c}</kbd>`)}${this.caption}</div>`
            : html`<div class="caption"></div>`;
    }

    render() {
        return html`${this.ended ? nothing : this.renderCaption()}${this.renderBar()}`;
    }

    private renderBar() {
        const progress = this.note || (this.ended ? 'Finished' : this.count ? `${Math.min(this.index + 1, this.count)} of ${this.count}` : '');
        const what = html`<div class="what"><span class="heading">${this.heading || 'Demo'}</span><span class="progress">${progress}</span></div>`;
        if (this.ended) {
            return html`<div class="bar">${what}
                <juel-button type="light" class="replay" glyph="lucide-rotate-ccw" label="Watch again" @click=${() => this.act('replay')}></juel-button>
                <juel-button type="plain" class="stop" glyph="lucide-x" button-label="Close" title="Close (Esc)" @click=${() => this.act('stop')}></juel-button>
            </div>`;
        }
        if (this.coach) {
            return html`<div class="bar">${what}
                ${this.reading ? nothing : html`<juel-button type="light" class="show" glyph="lucide-hand" label="Show me" title="Watch this step done for you" @click=${() => this.act('show')}></juel-button>`}
                <juel-button type=${this.reading ? 'primary' : 'plain'} class="next" label=${this.reading ? 'Next' : 'Skip'} title=${this.reading ? 'Go on' : 'Skip this step'} @click=${() => this.act('next')}></juel-button>
                <juel-button type="plain" class="stop" glyph="lucide-x" button-label="Stop" title="Stop (Esc)" @click=${() => this.act('stop')}></juel-button>
            </div>`;
        }
        return html`<div class="bar">${what}
            ${this.paused
                ? html`<juel-button type="primary" class="play" glyph="lucide-play" button-label="Play" title="Go on (Space)" @click=${() => this.act('play')}></juel-button>`
                : html`<juel-button type="light" class="pause" glyph="lucide-pause" button-label="Pause" title="Pause (Space)" @click=${() => this.act('pause')}></juel-button>`}
            <juel-button type="light" class="step" glyph="lucide-step-forward" button-label="Next step" title="Play the next step, then pause (→)" @click=${() => this.act('step')}></juel-button>
            <juel-button type="light" class="speed" label=${this.speedLabel()} title="Speed" @click=${() => this.act('speed')}></juel-button>
            <juel-button type="light" class="replay" glyph="lucide-rotate-ccw" button-label="Start again" title="Start again" @click=${() => this.act('replay')}></juel-button>
            <juel-button type="plain" class="stop" glyph="lucide-x" button-label="Stop" title="Stop (Esc)" @click=${() => this.act('stop')}></juel-button>
        </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-demo-bar': JuelDemoBar }
}
