import { LitElement, html, css } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import bind from 'bind-decorator';
import '../../Buttons/Button/Button';

// A dependency-free colour picker (replaces the @simonwep/pickr integration
// this component originally used), built on the native <input type="color">
// plus a hex field and a preset swatch row.
@customElement("juel-colour")
export class Colour extends LitElement {

    static styles = css`
        :host {
            display: inline-block;
            position: relative;
            font-family: Arial, sans-serif;
        }
        /* The swatch and presets are juel-buttons (type="plain") filled with their colour. */
        .swatch {
            display: block;
            --button-width: 32px;
            --button-height: 32px;
            --padding: 0;
            --border-radius: 4px;
            --button-border-color: #ccc;
            position: relative;
        }
        /* No value: the opt-in look's "no colour" mark (a slash). Without the look, nothing changes. */
        .swatch.empty::after {
            content: '';
            position: absolute;
            inset: 1px;
            border-radius: 3px;
            background: var(--juel-swatch-none, none);
            pointer-events: none;
        }
        .popup {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            z-index: 10;
            display: none;
            flex-direction: column;
            gap: 8px;
            padding: 10px;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .popup[open] {
            display: flex;
        }
        /* Opened near the right edge of a scrolling panel or the window: hang it from the swatch's right edge instead. */
        .popup.end {
            left: auto;
            right: 0;
        }
        input[type="color"] {
            width: 100%;
            height: 40px;
            border: none;
            padding: 0;
            cursor: pointer;
        }
        input[type="text"] {
            width: 90px;
            padding: 4px 6px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-family: monospace;
        }
        .swatches {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            max-width: 140px;
        }
        .recent-label { font-size: 11px; opacity: 0.7; margin-top: 6px; }
        .preset {
            display: block;
            --button-width: 20px;
            --button-height: 20px;
            --padding: 0;
            --border-radius: 3px;
            --button-border-color: rgba(0, 0, 0, 0.15);
        }
    `;

    @property() context: any;
    @property() property: string = "colour";
    @property() value: string = "#000000";

    @state() private open = false;
    @state() private end = false;

    private presets = ['#000000', '#ffffff', '#e03131', '#f08c00', '#2f9e44', '#1971c2', '#7048e8', '#e64980'];

    /**
     * The swatches to offer instead of the built-in eight: colours, or
     * `{ value, label }` to name one (a theme colour, the accent). Unset keeps
     * the built-in eight.
     */
    @property({ attribute: false }) palette?: (string | { value: string; label?: string })[];
    /** Recently used colours, a second row under "Recent" (the page keeps the list). */
    @property({ attribute: false }) recent: string[] = [];

    updated(changed: Map<string, unknown>) {
        if (!changed.has('open')) return;
        if (!this.open) { this.end = false; return; }
        // Does the popup (hung from the left) run past the window or a clipping ancestor (across shadow roots)?
        const popup = this.shadowRoot?.querySelector('.popup') as HTMLElement | null;
        if (!popup) return;
        let right = document.documentElement.clientWidth;
        for (let n: Node | null = this; (n = n instanceof ShadowRoot ? n.host : (n as Element).parentNode ?? null);) {
            if (!(n instanceof Element)) continue;
            if (/auto|scroll|hidden|clip/.test(getComputedStyle(n).overflowX)) right = Math.min(right, n.getBoundingClientRect().right);
        }
        const box = popup.getBoundingClientRect();
        this.end = box.right > right && this.getBoundingClientRect().right - box.width >= 0;
    }

    private renderSwatch(p: string | { value: string; label?: string }) {
        const value = typeof p === 'string' ? p : p.value;
        const name = typeof p === 'string' ? p : p.label ? `${p.label} (${p.value})` : p.value;
        return html`<juel-button type="plain" class="preset" part="swatch" data-value=${value} style="--background-color: ${value}; --hover-background-color: ${value}" @click=${() => this.setValue(value)} button-label=${name} title=${name}></juel-button>`;
    }

    connectedCallback(): void {
        super.connectedCallback();
        document.addEventListener('pointerdown', this.handleOutsideClick);
    }

    disconnectedCallback(): void {
        document.removeEventListener('pointerdown', this.handleOutsideClick);
        super.disconnectedCallback();
    }

    firstUpdated() {
        if (typeof this.context === 'string' && this.context in window) {
            this.context = (window as any)[this.context];
        }
    }

    @bind
    private handleOutsideClick(e: Event) {
        if (this.open && !e.composedPath().includes(this)) {
            this.open = false;
        }
    }

    setValue(colour: string) {
        this.value = colour;
        this.emitChange();
    }

    private toHex(colour: string): string {
        if (/^#[0-9a-fA-F]{6}$/.test(colour)) {
            return colour;
        }
        let probe = document.createElement('div');
        probe.style.color = colour;
        document.body.appendChild(probe);
        let rgb = getComputedStyle(probe).color;
        document.body.removeChild(probe);
        let m = rgb.match(/\d+/g);
        if (!m) {
            return '#000000';
        }
        return '#' + m.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
    }

    private emitChange() {
        if (this.context && this.property) {
            this.context[this.property] = this.value;
        }
        this.dispatchEvent(new CustomEvent('value-changed', {
            detail: { value: this.value },
            bubbles: true,
            composed: true,
        }));
    }

    private handleColorInput(e: Event) {
        this.value = (e.target as HTMLInputElement).value;
        this.emitChange();
    }

    private handleHexInput(e: Event) {
        let val = (e.target as HTMLInputElement).value;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            this.value = val;
            this.emitChange();
        }
    }

    render() {
        const hex = this.toHex(this.value);
        return html`
            <juel-button type="plain" class="swatch ${this.value ? '' : 'empty'}" style="--background-color: ${this.value}; --hover-background-color: ${this.value}" @click=${() => this.open = !this.open} button-label="Choose colour"></juel-button>
            <div class="popup ${this.end ? 'end' : ''}" ?open=${this.open}>
                <input type="color" .value=${hex} @input=${this.handleColorInput} />
                <input type="text" .value=${hex} @change=${this.handleHexInput} />
                <div class="swatches" part="palette">
                    ${(this.palette ?? this.presets).map(p => this.renderSwatch(p))}
                </div>
                ${this.recent.length ? html`<div class="recent-label" part="recent-label">Recent</div>
                    <div class="swatches recent" part="recent">${this.recent.map(p => this.renderSwatch(p))}</div>` : ''}
            </div>
        `;
    }
}
