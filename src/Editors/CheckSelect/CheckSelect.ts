import { LitElement, css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import '../../Buttons/Button/Button';
import { lucideIcon } from '../../_Modules/Icons/Lucide';
import { checkSelectSummary, tickState, toggleAll, toggleOne } from './checkSelectState';

/**
 * `<juel-check-select>` — a dropdown of ticks, for choosing several things from a list (a filter's
 * types, say). The button says what's ticked ("All", "Reports, Notes", "3 of 7", "None"); pressing it
 * opens the list, with **Select all** first: it ticks every choice, or unticks them all when all are
 * ticked, and shows a dash when only some are.
 *
 * `data` is the choices (`{ text, value }`, or other fields named by `text-field` / `value-field`), and
 * `value` the ticked values, in the list's order. A change fires `value-changed` `{ value }` with the
 * new array; the list stays open, so several can be changed in one go. `all-text` / `none-text` are the
 * button's words for everything and nothing (`All`, `None`), and `select-all-text` names the first row.
 *
 * The list is a native popover, so it sits above a modal dialog and isn't clipped by a toolbar; it
 * closes on Escape, a click outside or Tab out of it. The arrow keys move between rows, Space ticks.
 */
@customElement('juel-check-select')
export class JuelCheckSelect extends LitElement {
    static styles = css`
        :host { display: inline-block; font: inherit; }
        label.caption { display: block; margin-bottom: var(--select-label-gap, 3px); font-size: var(--select-label-size, 0.75rem); }
        .trigger { --padding: var(--select-padding, 5px 7px); display: block; }
        .panel {
            position: fixed; inset: auto; margin: 0; padding: 4px 0; box-sizing: border-box; min-width: 12rem; max-width: min(24rem, 94vw);
            max-height: min(24rem, 70vh); overflow-y: auto;
            border: 1px solid var(--juel-border, #ced4da); border-radius: var(--juel-radius-md, 6px);
            background: var(--juel-surface, #fff); color: var(--juel-text, #212529);
            box-shadow: 0 6px 20px rgb(0 0 0 / 0.25); font: inherit;
        }
        .row { display: flex; align-items: center; gap: 8px; padding: 5px 12px; cursor: pointer; user-select: none; }
        .row:hover { background: var(--juel-hover, rgb(0 0 0 / 0.05)); }
        .row.all { font-weight: 600; border-bottom: 1px solid var(--juel-border, #e3e6ea); margin-bottom: 4px; padding-bottom: 7px; }
        input[type="checkbox"] {
            appearance: none; flex: none; width: 18px; height: 18px; margin: 0; cursor: pointer;
            border: 2px solid var(--juel-accent, var(--primary, #007bff)); border-radius: 4px;
            display: grid; place-content: center;
        }
        input[type="checkbox"]:checked, input[type="checkbox"]:indeterminate {
            background-color: var(--juel-accent, var(--primary, #007bff));
        }
        input[type="checkbox"]:checked::after {
            content: ''; width: 14px; height: 14px; background-color: var(--juel-accent-contrast, white);
            mask-image: var(--check-select-tick); mask-repeat: no-repeat; mask-position: center; mask-size: contain;
        }
        input[type="checkbox"]:indeterminate::after { content: ''; width: 9px; height: 2px; border-radius: 1px; background-color: var(--juel-accent-contrast, white); }
        input[type="checkbox"]:focus-visible { outline: 2px solid var(--juel-focus, #0078d4); outline-offset: 2px; }
        .empty { margin: 6px 12px; opacity: 0.75; }
    `;

    /** Names the control: shown above the button (unless `hide-label`), and names the list. */
    @property({ type: String }) label = '';
    @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false;
    /** The choices. */
    @property({ type: Array }) data: Record<string, unknown>[] = [];
    @property({ type: String, attribute: 'text-field' }) textField = 'text';
    @property({ type: String, attribute: 'value-field' }) valueField = 'value';
    /** The ticked values. */
    @property({ type: Array }) value: unknown[] = [];
    @property({ type: String, attribute: 'all-text' }) allText = 'All';
    @property({ type: String, attribute: 'none-text' }) noneText = 'None';
    @property({ type: String, attribute: 'select-all-text' }) selectAllText = 'Select all';

    @state() private open = false;
    @query('.panel') private panel!: HTMLElement;

    /** Whether the list is showing. */
    get isOpen() { return this.open; }

    private get items(): { text: string; value: unknown }[] {
        return (this.data ?? []).map(d => ({ text: String(d?.[this.textField] ?? ''), value: d?.[this.valueField] }));
    }

    private get selected(): unknown[] { return Array.isArray(this.value) ? this.value : []; }

    private async toggle() {
        if (this.open) { this.panel.hidePopover(); return; }
        this.open = true;
        await this.updateComplete;
        this.panel.showPopover();
        const trigger = this.renderRoot.querySelector('.trigger') as HTMLElement;
        this.panel.style.minWidth = `${Math.max(trigger.getBoundingClientRect().width, 192)}px`;
        const { x, y } = await computePosition(trigger, this.panel, { strategy: 'fixed', placement: 'bottom-start', middleware: [offset(4), flip(), shift({ padding: 8 })] });
        Object.assign(this.panel.style, { left: `${x}px`, top: `${y}px` });
        this.boxes()[0]?.focus();
    }

    private boxes() { return [...this.renderRoot.querySelectorAll<HTMLInputElement>('.panel input[type="checkbox"]')]; }

    private change(value: unknown[]) {
        this.value = value;
        this.dispatchEvent(new CustomEvent('value-changed', { detail: { value }, bubbles: true, composed: true }));
    }

    private onToggle = (e: Event) => {
        if ((e as ToggleEvent).newState === 'closed') this.open = false;
    };

    private onKeydown = (e: KeyboardEvent) => {
        const boxes = this.boxes();
        const at = boxes.indexOf(e.composedPath()[0] as HTMLInputElement);
        const to = e.key === 'ArrowDown' ? at + 1 : e.key === 'ArrowUp' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? boxes.length - 1 : null;
        if (to !== null) { e.preventDefault(); boxes[Math.max(0, Math.min(to, boxes.length - 1))]?.focus(); return; }
        if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
        if (e.key === 'Tab' && ((e.shiftKey && at === 0) || (!e.shiftKey && at === boxes.length - 1))) this.close();
    };

    private close() {
        this.panel?.hidePopover();
        (this.renderRoot.querySelector('.trigger') as HTMLElement | null)?.focus();
    }

    // The tick's picture, from the bundled icons (not a page-level variable, so it shows on any page).
    private readonly tick = `url("${lucideIcon('lucide-check')}")`;

    render() {
        const items = this.items, values = items.map(i => i.value), selected = this.selected;
        const state = tickState(values, selected);
        const summary = checkSelectSummary(items, selected, { all: this.allText, none: this.noneText });
        const name = this.label ? `${this.label}: ${summary}` : summary;
        return html`${this.label && !this.hideLabel ? html`<label class="caption">${this.label}</label>` : ''}
            <juel-button type="light" class="trigger" caret label=${summary} button-label=${name} title=${name}
                aria-haspopup="true" aria-expanded=${String(this.open)} @click=${() => void this.toggle()}></juel-button>
            <div class="panel" popover="auto" role="group" aria-label=${ifDefined(this.label || undefined)} style="--check-select-tick: ${this.tick}"
                @toggle=${this.onToggle} @keydown=${this.onKeydown}>
                ${this.open ? html`${items.length ? html`<label class="row all">
                        <input type="checkbox" class="select-all" .checked=${live(state === 'all')} .indeterminate=${live(state === 'some')}
                            @change=${() => this.change(toggleAll(values, selected))}>${this.selectAllText}</label>` : html`<p class="empty">Nothing to choose.</p>`}
                    ${items.map((item, i) => html`<label class="row" data-index=${i}>
                        <input type="checkbox" data-value=${typeof item.value === 'string' ? item.value : JSON.stringify(item.value)} .checked=${live(selected.includes(item.value))}
                            @change=${(e: Event) => this.change(toggleOne(values, selected, item.value, (e.target as HTMLInputElement).checked))}>${item.text}</label>`)}` : ''}
            </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-check-select': JuelCheckSelect }
}
