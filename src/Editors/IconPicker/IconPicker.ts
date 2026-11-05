import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import '../../Buttons/Button/Button';
import { IconChoices, filterIconChoices, type IconChoice } from '../../_Modules/Icons/IconChoices';
import { lucideIcon } from '../../_Modules/Icons/Lucide';

const Columns = 8;

/**
 * `<juel-icon-picker>` — a button showing the chosen icon; pressing it opens a searchable grid of icons,
 * so nobody has to know an icon's name. `value` is a bundled Lucide glyph (`lucide-rocket`), or `''` for
 * none. Choosing one, or **No icon**, fires `value-changed` `{ value }`. `icons` replaces the choices
 * (`IconChoices` by default), and `label` names the control.
 *
 * The grid is a native popover, so it sits above a modal dialog and closes on Escape or a click outside.
 * The arrow keys move through it, and Enter chooses. A value that isn't bundled (typed into a file by
 * hand, say) shows a question mark, and stays until something else is chosen.
 */
@customElement('juel-icon-picker')
export class JuelIconPicker extends LitElement {
    static styles = css`
        :host { display: inline-block; }
        .trigger { --padding: 2px 4px; --button-min-width: 26px; --button-min-height: 26px; }
        .trigger.empty { opacity: 0.55; }
        .panel {
            position: fixed; inset: auto; margin: 0; padding: 8px; box-sizing: border-box; width: min(20rem, 94vw);
            border: 1px solid var(--juel-border, #ced4da); border-radius: var(--juel-radius-md, 6px);
            background: var(--juel-surface, #fff); color: var(--juel-text, #212529);
            box-shadow: 0 6px 20px rgb(0 0 0 / 0.25); font: inherit; font-size: 0.8125rem;
        }
        .search {
            width: 100%; box-sizing: border-box; padding: 4px 6px; margin-bottom: 6px; font: inherit;
            border: 1px solid var(--juel-border, #ced4da); border-radius: var(--juel-radius-sm, 4px);
            background: var(--juel-surface, Field); color: var(--juel-text, FieldText);
        }
        .grid { display: grid; grid-template-columns: repeat(${Columns}, 1fr); gap: 2px; max-height: 13rem; overflow-y: auto; }
        .grid juel-button { --padding: 4px; --button-min-width: 28px; --button-min-height: 28px; }
        .grid juel-button[pressed] { --background-color: var(--juel-selection, #dde8ff); }
        .none { margin-top: 6px; --padding: 2px 8px; --font-size: 0.8125rem; }
        .nothing { margin: 6px 2px; opacity: 0.75; }
    `;

    /** The chosen glyph (`lucide-rocket`), or `''` for none. */
    @property({ type: String }) value = '';
    /** Names the button and the grid for assistive tech, and is the button's tooltip when nothing is chosen. */
    @property({ type: String }) label = 'Icon';
    /** The icons offered. */
    @property({ attribute: false }) icons: readonly IconChoice[] = IconChoices;

    @state() private open = false;
    @state() private search = '';
    @query('.panel') private panel!: HTMLElement;

    /** Whether the grid is showing. */
    get isOpen() { return this.open; }

    private async toggle() {
        if (this.open) { this.panel.hidePopover(); return; }
        this.search = '';
        this.open = true;
        await this.updateComplete;
        this.panel.showPopover();
        const trigger = this.renderRoot.querySelector('.trigger') as HTMLElement;
        const { x, y } = await computePosition(trigger, this.panel, { strategy: 'fixed', placement: 'bottom-end', middleware: [offset(4), flip(), shift({ padding: 8 })] });
        Object.assign(this.panel.style, { left: `${x}px`, top: `${y}px` });
        this.renderRoot.querySelector<HTMLInputElement>('.search')?.focus();
    }

    private choose(value: string) {
        this.panel.hidePopover();
        if (value !== this.value) {
            this.value = value;
            this.dispatchEvent(new CustomEvent('value-changed', { detail: { value }, bubbles: true, composed: true }));
        }
        (this.renderRoot.querySelector('.trigger') as HTMLElement | null)?.focus();
    }

    private onToggle = (e: Event) => {
        if ((e as ToggleEvent).newState === 'closed') this.open = false;
    };

    /** The arrow keys, from the search box into the grid and around it. */
    private onKeydown = (e: KeyboardEvent) => {
        const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: Columns, ArrowUp: -Columns };
        const step = steps[e.key];
        if (!step) return;
        const inSearch = (e.composedPath()[0] as HTMLElement).classList?.contains('search');
        if (inSearch && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const items = [...this.renderRoot.querySelectorAll<HTMLElement>('.grid juel-button')];
        const at = items.indexOf(e.composedPath().find(t => (t as HTMLElement).localName === 'juel-button') as HTMLElement);
        if (inSearch) { this.focusItem(items[0]); return; }
        const to = at + step;
        if (to < 0) { this.renderRoot.querySelector<HTMLElement>('.search')?.focus(); return; }
        this.focusItem(items[Math.min(to, items.length - 1)]);
    };

    private focusItem(item: HTMLElement | undefined) {
        item?.shadowRoot?.querySelector('button')?.focus();
    }

    render() {
        const known = !this.value || !!lucideIcon(this.value);
        const chosen = this.icons.find(i => i.glyph === this.value);
        const name = this.value ? `${this.label}: ${chosen?.label ?? this.value.replace(/^lucide-/, '')}` : `${this.label}: none`;
        const shown = this.open ? filterIconChoices(this.icons, this.search) : [];
        return html`<juel-button type="plain" class="trigger ${this.value ? '' : 'empty'}" glyph=${!this.value ? 'lucide-smile' : known ? this.value : ''}
                label=${known ? '' : '?'} button-label=${name} title=${this.value ? name : `Choose ${/^[aeiou]/i.test(this.label) ? 'an' : 'a'} ${this.label.toLowerCase()}`}
                aria-expanded=${String(this.open)} @click=${() => void this.toggle()}></juel-button>
            <div class="panel" popover="auto" role="dialog" aria-label=${this.label} @toggle=${this.onToggle} @keydown=${this.onKeydown}>
                ${this.open ? html`<input class="search" type="search" placeholder="Search icons" aria-label="Search icons" autocomplete="off"
                        .value=${this.search} @input=${(e: Event) => { this.search = (e.target as HTMLInputElement).value; }}
                        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' && shown.length) { e.preventDefault(); this.choose(shown[0].glyph); } }}>
                    <div class="grid">${shown.map(i => html`<juel-button type="plain" glyph=${i.glyph} data-glyph=${i.glyph} button-label=${i.label} title=${i.label}
                        ?pressed=${i.glyph === this.value} @click=${() => this.choose(i.glyph)}></juel-button>`)}</div>
                    ${shown.length ? nothing : html`<p class="nothing">No icons match.</p>`}
                    ${this.value ? html`<juel-button type="light" class="none" label="No icon" @click=${() => this.choose('')}></juel-button>` : nothing}` : nothing}
            </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-icon-picker': JuelIconPicker }
}
