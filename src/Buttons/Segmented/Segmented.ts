import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators';
import '../Button/Button';

/** One choice of a juel-segmented: a label, an icon (`glyph`, e.g. `lucide-align-left`), or both. */
export interface SegmentedOption {
    value: string;
    label?: string;
    glyph?: string;
    title?: string;
}

/**
 * A row of joined buttons, one of which is chosen: text alignment, a weight.
 * Set `.options` and `value`; choosing one (a click, or the arrow keys, Home
 * and End) fires `value-changed` `{ value }`. Choosing the chosen one again
 * clears it (`value` null) only with `clearable`. Each button is a juel-button
 * (`part="option"`, plus `selected` on the chosen one). `stretch` fills the
 * width, the buttons sharing it equally.
 */
@customElement('juel-segmented')
export class JuelSegmented extends LitElement {
    static styles = css`
        :host { display: inline-flex; }
        .group {
            display: inline-flex;
            border: 1px solid var(--juel-border, #ced4da);
            border-radius: var(--juel-radius-md, 6px);
            overflow: hidden;
        }
        juel-button {
            --padding: var(--segmented-padding, 3px 8px);
            --border-radius: 0;
            /* WCAG 2.5.8: each option at least a 24px target. */
            --button-min-width: var(--segmented-min, 24px);
            --button-min-height: var(--segmented-min, 24px);
        }
        /* A label stays on one line: a narrow group overflows its container rather than
           wrapping "Room (any shape)" onto three lines inside one segment. */
        juel-button::part(button) { white-space: nowrap; }
        :host([stretch]) { display: flex; }
        :host([stretch]) .group { display: flex; flex: 1 1 auto; min-width: 0; }
        :host([stretch]) juel-button { flex: 1 1 0; min-width: var(--segmented-min, 24px); }
        juel-button + juel-button { border-left: 1px solid var(--juel-border, #ced4da); }
        juel-button[selected] {
            --background-color: var(--segmented-selected, var(--juel-selection, #dde8ff));
            --hover-background-color: var(--segmented-selected, var(--juel-selection, #dde8ff));
        }
    `;

    @property({ attribute: false }) options: SegmentedOption[] = [];
    @property({ type: String }) value: string | null = null;
    @property({ type: Boolean }) clearable = false;
    @property({ type: String }) label = '';
    /** Fill the width, the buttons sharing it equally. */
    @property({ type: Boolean, reflect: true }) stretch = false;

    render() {
        const chosen = this.options.findIndex(o => o.value === this.value);
        return html`<div class="group" role="radiogroup" aria-label=${this.label} @keydown=${this.onKeydown}>
            ${this.options.map((o, i) => html`<juel-button type="plain" part="option${i === chosen ? ' selected' : ''}"
                ?selected=${i === chosen} role="radio" aria-checked=${String(i === chosen)}
                tabindex=${i === chosen || (chosen < 0 && i === 0) ? '0' : '-1'} data-value=${o.value}
                glyph=${o.glyph ?? ''} label=${o.glyph ? '' : (o.label ?? o.value)} button-label=${o.label ?? o.value}
                title=${o.title ?? o.label ?? o.value} @click=${() => this.choose(o.value)}></juel-button>`)}
        </div>`;
    }

    private choose(value: string, focus = false) {
        const next = value === this.value && this.clearable ? null : value;
        if (next !== this.value) {
            this.value = next;
            this.dispatchEvent(new CustomEvent('value-changed', { detail: { value: next }, bubbles: true, composed: true }));
        }
        if (focus) this.updateComplete.then(() =>
            (this.shadowRoot?.querySelector(`juel-button[data-value="${CSS.escape(value)}"]`) as HTMLElement | null)?.focus());
    }

    private onKeydown(e: KeyboardEvent) {
        const n = this.options.length;
        if (!n) return;
        const at = Math.max(0, this.options.findIndex(o => o.value === this.value));
        const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (at + 1) % n
            : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (at - 1 + n) % n
            : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
        if (to < 0) return;
        e.preventDefault();
        this.choose(this.options[to].value, true);
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-segmented': JuelSegmented }
}
