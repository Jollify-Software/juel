import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators';

/** A slider's ends and step (`juel-number`'s `ranges`). */
export interface NumberRange { min: number; max: number; step?: number }

@customElement('juel-number')
export class JuelNumber extends LitElement {
  // CSS styles for the component
  static styles = css`
    :host {
      display: inline-block;
      font-family: var(--juel-font, Arial, sans-serif);
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-size: 0.85em;
    }
    input[type="number"] {
      padding: 4px;
      border: 1px solid var(--juel-border, #ccc);
      background: var(--juel-surface, Field);
      color: var(--juel-text, FieldText);
      border-radius: var(--juel-radius-sm, 4px);
    }
    .quantity {
      display: flex;
      align-items: stretch;
      border: 1px solid var(--juel-border, #ccc);
      background: var(--juel-surface, Field);
      border-radius: var(--juel-radius-sm, 4px);
    }
    .quantity input {
      flex: 1 1 auto;
      min-width: 0;
      width: var(--number-width, 5em);
      padding: var(--number-padding, 4px);
      border: none;
      background: transparent;
      color: var(--juel-text, FieldText);
      font: inherit;
    }
    .quantity select {
      border: none;
      border-left: 1px solid var(--juel-border, #ccc);
      background: transparent;
      color: var(--juel-muted, var(--juel-text, FieldText));
      font: inherit;
      padding: 0 2px;
    }
    /* slider: slider, number and unit share one row. */
    :host([slider]) { display: block; }
    .slider-row { display: flex; align-items: center; gap: 0.4rem; }
    .slider-row input[type="range"] {
      flex: 1 1 auto; min-width: 3rem; margin: 0;
      accent-color: var(--juel-accent, Highlight);
    }
    .slider-row .quantity { flex: none; }
    .slider-row .quantity input { width: var(--number-width, 3em); }
    :host([disabled]) { opacity: 0.55; pointer-events: none; }
    .quantity:focus-within { outline: 2px solid var(--juel-accent, Highlight); outline-offset: -1px; }
    .quantity input:focus, .quantity select:focus { outline: none; }
  `;

  /**
   * The label to display for the input field.
   */
  @property({ type: String })
  label: string | undefined;

  /**
   * The numeric value of the input field.
   */
  @property({ type: Number })
  value: number = 0;

  /** The input's bounds and step, as on `<input type="number">`. */
  @property({ type: Number }) min?: number;
  @property({ type: Number }) max?: number;
  @property({ type: Number }) step?: number;

  /**
   * A slider on the same row as the box and the unit menu. Dragging it fires `value-changed` as it
   * moves and `value-committed` on letting go. Its ends come from `ranges` for the chosen unit, or
   * `min` and `max` (0 to 100 when unset). A value typed past the ends is kept, the thumb resting
   * at the end. A field with `slider` is a quantity (a text box that can be empty) even with no units.
   */
  @property({ type: Boolean, reflect: true }) slider = false;
  /** The slider's ends per unit (`{ px: { min: 0, max: 100 }, em: { min: 0, max: 8, step: 0.05 } }`). */
  @property({ attribute: false }) ranges?: Record<string, NumberRange>;
  /** Where the thumb rests while the field is empty, such as the inherited value. */
  @property({ type: Number }) fallback?: number;
  /**
   * How many px one of each unit is (`{ px: 1, em: 16, rem: 16 }`), so choosing another unit keeps the
   * size: 32px becomes 2em. Between units not listed the number stays, cut to the new unit's range.
   */
  @property({ attribute: false }) basis?: Record<string, number>;
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** `label` names the field for assistive tech only: the page shows its own heading. */
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false;

  /**
   * Units to choose from (`units="px,em,rem,%"`). With units the field is a
   * quantity: a text box that takes a number with or without a unit (`48px`),
   * steps with ArrowUp/ArrowDown (Shift for ten), and a unit menu beside it.
   * It can be empty (`value` null, the placeholder shows). `value-changed` and
   * `value-committed` (Enter, or leaving the box) carry `{ value, unit, text }`,
   * `text` being e.g. `48px` (`''` when empty). Set it with `text`, or with
   * `value` and `unit`.
   */
  @property({ type: Array, converter: (v: string | null) => (v ?? '').split(',').map(u => u.trim()).filter(Boolean) })
  units: string[] = [];
  /** The chosen unit (with `units`); the first unit when not set. */
  @property({ type: String }) unit = '';
  /** Shown when a quantity is empty. */
  @property({ type: String }) placeholder = '';

  /** The value as `48px` (with `units`); `''` when empty. Setting it parses it. */
  get text(): string {
    return this.value === null || this.value === undefined || Number.isNaN(this.value) ? '' : `${this.value}${this.currentUnit()}`;
  }
  set text(text: string) {
    // The owner echoing back what was typed: not a new value, so a commit is still due.
    if (text === this.text) return;
    const parsed = this.parse(text);
    this.value = parsed?.value ?? (null as unknown as number);
    if (parsed?.unit) this.unit = parsed.unit;
    this.committed = this.text;
  }

  private currentUnit() {
    return this.unit || this.units[0] || '';
  }

  /** `48px` → 48 + px; a unit not in `units` is kept as typed. Null when it isn't a number. */
  private parse(text: string): { value: number; unit: string } | null {
    const m = /^\s*(-?(?:\d+\.?\d*|\.\d+))\s*([a-z%]*)\s*$/i.exec(text ?? '');
    return m ? { value: Number(m[1]), unit: m[2] } : null;
  }

  private emit(type: 'value-changed' | 'value-committed') {
    const empty = this.value === null || this.value === undefined;
    this.dispatchEvent(new CustomEvent(type, {
      detail: { value: empty ? null : this.value, unit: this.currentUnit(), text: this.text },
      bubbles: true,
      composed: true,
    }));
  }

  private onQuantityInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    if (!raw.trim()) this.value = null as unknown as number;
    else {
      const parsed = this.parse(raw);
      if (!parsed) return; // part-typed (e.g. "-"): wait for more
      this.value = parsed.value;
      if (parsed.unit) this.unit = parsed.unit;
    }
    this.emit('value-changed');
  }

  private onQuantityKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { this.commit(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const by = (this.step ?? 1) * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
    let next = Math.round(((this.value ?? 0) + by) * 1000) / 1000;
    if (this.min !== undefined) next = Math.max(this.min, next);
    if (this.max !== undefined) next = Math.min(this.max, next);
    this.value = next;
    this.syncBox();
    this.emit('value-changed');
    this.commit();
  }

  /** The slider's ends and step for the chosen unit. */
  private range(unit = this.currentUnit()): Required<NumberRange> {
    const own = this.ranges?.[unit];
    return { min: own?.min ?? this.min ?? 0, max: own?.max ?? this.max ?? 100, step: own?.step ?? this.step ?? 1 };
  }

  /** `value` in `from` as a number in `to`: the same size when `basis` knows both, else cut to `to`'s range. */
  private converted(value: number, from: string, to: string): number {
    const a = this.basis?.[from], b = this.basis?.[to];
    if (a && b) {
      const { step } = this.range(to);
      const places = step < 0.1 ? 3 : step < 1 ? 2 : 1;
      return Number((value * a / b).toFixed(places));
    }
    if (!this.ranges?.[to]) return value;
    const { min, max } = this.range(to);
    return Math.min(max, Math.max(min, value));
  }

  private onSliderInput(e: Event) {
    this.value = Number((e.target as HTMLInputElement).value);
    this.syncBox();
    this.emit('value-changed');
  }

  private onUnitChange(e: Event) {
    const from = this.currentUnit();
    this.unit = (e.target as HTMLSelectElement).value;
    if (this.value === null || this.value === undefined) return;
    this.value = this.converted(this.value, from, this.unit);
    this.syncBox();
    this.emit('value-changed');
    this.commit();
  }

  private committed: string | undefined;

  /** `value-committed`, once per change (Enter and the box's change event both get here). */
  private commit() {
    this.syncBox();
    if (this.text === this.committed) return;
    this.committed = this.text;
    this.emit('value-committed');
  }

  /** Show the value in the box as the number alone (the unit is in the menu). */
  private syncBox() {
    const box = this.shadowRoot?.querySelector('.quantity input') as HTMLInputElement | null;
    if (box) box.value = this.value === null || this.value === undefined ? '' : String(this.value);
  }

  private renderQuantity() {
    const unit = this.currentUnit();
    const units = this.units.includes(unit) || !unit ? this.units : [...this.units, unit];
    const empty = this.value === null || this.value === undefined;
    const box = html`<div class="quantity" part="quantity">
      <input id="number-input" type="text" inputmode="decimal" part="input" autocomplete="off"
        aria-label=${this.label || nothing} placeholder=${this.placeholder} ?disabled=${this.disabled}
        .value=${empty ? '' : String(this.value)}
        @input=${this.onQuantityInput} @keydown=${this.onQuantityKeydown}
        @change=${this.commit} />
      ${units.length ? html`<select part="unit" aria-label="Unit" ?disabled=${this.disabled} @change=${this.onUnitChange}>
        ${units.map(u => html`<option value=${u} ?selected=${u === unit}>${u}</option>`)}
      </select>` : nothing}
    </div>`;
    if (!this.slider) return box;
    const { min, max, step } = this.range(unit);
    const at = empty ? this.fallback ?? min : this.value;
    return html`<div class="slider-row" part="row">
      <input type="range" class="slider" part="slider" min=${min} max=${max} step=${step}
        .value=${String(Math.min(max, Math.max(min, at)))} aria-label=${this.label ? `${this.label} slider` : 'Slider'}
        ?disabled=${this.disabled} @input=${this.onSliderInput} @change=${this.commit} />
      ${box}
    </div>`;
  }

  private handleInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.value = Number(inputElement.value);
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (this.units.length || this.slider)
      return html`<div>
        ${this.label && !this.hideLabel ? html`<label for="number-input">${this.label}</label>` : ''}
        ${this.renderQuantity()}
      </div>`;
    return html`
      <div>
        ${this.label
          ? html`<label for="number-input">${this.label}</label>`
          : ''}
        <input
          id="number-input"
          type="number"
          .value=${String(this.value)}
          min=${this.min ?? nothing}
          max=${this.max ?? nothing}
          step=${this.step ?? nothing}
          @input=${this.handleInput}
        />
      </div>
    `;
  }
}