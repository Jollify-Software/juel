import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators';

/**
 * One of several choices shown as tiles: a theme by its cover, a layout by
 * its preview. The tiles are the picker's children, each with a `value`
 * attribute (and whatever it shows inside: an image, a frame, a caption).
 * Set `value`; choosing a tile (a click, Enter or Space on it, or the arrow
 * keys, Home and End) fires `value-changed` `{ value }`. The picker makes it
 * a radiogroup: each tile gets `role="radio"`, `aria-checked`, a roving
 * `tabindex`, and a `selected` attribute on the chosen one (for the page's
 * own styles). `--picker-tile-width` (140px) and `--picker-gap` (10px) set
 * the grid.
 */
@customElement('juel-picker')
export class JuelPicker extends LitElement {
    static styles = css`
        :host { display: block; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(var(--picker-tile-width, 140px), 1fr));
            gap: var(--picker-gap, 10px);
        }
        ::slotted(*) {
            cursor: pointer;
            border: 2px solid transparent;
            border-radius: var(--juel-radius-md, 6px);
            padding: 4px;
            outline: none;
        }
        ::slotted(:hover) { background: var(--juel-hover, #f1f3f5); }
        ::slotted([selected]) { border-color: var(--juel-accent, #3b6fd8); }
        ::slotted(:focus-visible) { box-shadow: 0 0 0 2px var(--juel-accent, #3b6fd8); }
    `;

    @property({ type: String }) value: string | null = null;
    @property({ type: String }) label = '';

    private get tiles(): HTMLElement[] {
        return Array.from(this.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.hasAttribute('value'));
    }

    render() {
        return html`<div class="grid" role="radiogroup" aria-label=${this.label} @click=${this.onClick} @keydown=${this.onKeydown}>
            <slot @slotchange=${() => this.mark()}></slot></div>`;
    }

    updated() {
        this.mark();
    }

    /** Puts the radio semantics and `selected` on the tiles. */
    private mark() {
        const tiles = this.tiles;
        const chosen = tiles.findIndex(t => t.getAttribute('value') === this.value);
        tiles.forEach((t, i) => {
            t.setAttribute('role', 'radio');
            t.setAttribute('aria-checked', String(i === chosen));
            t.tabIndex = i === chosen || (chosen < 0 && i === 0) ? 0 : -1;
            t.toggleAttribute('selected', i === chosen);
        });
    }

    private choose(tile: HTMLElement, focus = false) {
        const value = tile.getAttribute('value');
        if (value !== this.value) {
            this.value = value;
            this.dispatchEvent(new CustomEvent('value-changed', { detail: { value }, bubbles: true, composed: true }));
        }
        if (focus) this.updateComplete.then(() => tile.focus());
    }

    private onClick(e: MouseEvent) {
        const tile = this.tiles.find(t => e.composedPath().includes(t));
        if (tile) this.choose(tile);
    }

    private onKeydown(e: KeyboardEvent) {
        const tiles = this.tiles;
        const n = tiles.length;
        if (!n) return;
        const focused = tiles.findIndex(t => e.composedPath().includes(t));
        if ((e.key === 'Enter' || e.key === ' ') && focused >= 0) { e.preventDefault(); this.choose(tiles[focused]); return; }
        const at = Math.max(0, tiles.findIndex(t => t.getAttribute('value') === this.value));
        const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (at + 1) % n
            : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (at - 1 + n) % n
            : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
        if (to < 0) return;
        e.preventDefault();
        this.choose(tiles[to], true);
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-picker': JuelPicker }
}
