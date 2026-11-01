import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../Number/Number';
import { renderPlaceToggle, placeToggleStyles } from './SideToggle';
import { Corners, Sides, allSame, readFour, splitLength, writeFour, type DeclarationChange, type FourSpec, type FourValues } from './SidesValue';

/** `juel-sides-editor`'s change event: the declarations to set and to clear, and the four values. */
export interface SidesChangedDetail extends DeclarationChange {
  values: FourValues;
}

/**
 * `<juel-sides-editor property="padding">` — one length per side (padding, margin, …) with an
 * **All | Top | Right | Bottom | Left** toggle, a number with units and a slider. It reads the
 * shorthand and its longhands from `declarations` and, on each change, fires `sides-changed`
 * `{ set, clear, values }`: the shortest CSS that says the four values (`padding: 12px`,
 * `padding: 12px 24px`, or longhands when only some sides are set) and every declaration to clear,
 * so a leftover longhand can't override the new shorthand. The page applies the change (as one
 * undo step) and passes the new declarations back.
 *
 * With a `spec` whose `corners` is set (`border-radius`), the toggle is All and the four corners.
 *
 * `allow-auto` adds an Auto switch (margin), and `allow-negative` lets the slider go below zero
 * (margin); padding has neither. An empty box clears that side ("All" clears all four).
 */
@customElement('juel-sides-editor')
export class JuelSidesEditor extends LitElement {
  static styles = [placeToggleStyles, css`
    :host { display: block; font-family: inherit; font-size: 0.8125rem; color: var(--juel-text, inherit); }
    .head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
    .label { font-weight: 600; flex: 1; }
    .row { display: flex; align-items: center; gap: 0.4rem; }
    juel-number { width: 6.5rem; flex: none; }
    input[type='range'] { flex: 1; min-width: 4rem; }
    label.auto { display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; }
  `];

  /** The CSS property: its shorthand and the longhands' prefix (`padding` → `padding-top`, …). */
  @property({ type: String }) property = 'padding';
  /** The heading shown above the toggle; defaults to the property's name, capitalised. */
  @property({ type: String }) label = '';
  /** The element's declarations now (the shorthand and longhands, as set): what the editor shows. */
  @property({ attribute: false }) declarations: Record<string, string | undefined> = {};
  /** Offer `auto` (an Auto switch beside the size), as margin can. */
  @property({ type: Boolean, attribute: 'allow-auto' }) allowAuto = false;
  /** Let the slider and the box go below zero, as margin can. */
  @property({ type: Boolean, attribute: 'allow-negative' }) allowNegative = false;
  /** The slider's top end (in the chosen unit), and its bottom end with `allow-negative` (as a negative). */
  @property({ type: Number }) max = 100;
  /** The units offered beside the number. */
  @property({ attribute: false }) units = ['px', 'em', 'rem', '%'];
  /** The longhands' suffix and the shorthand, when they aren't `<property>-<side>` / `<property>`: `border-width` uses prefix `border`, suffix `width`. */
  @property({ attribute: false }) spec?: FourSpec;

  /** The side (or corner) being edited; "all" edits the four together. */
  @state() place: string = 'all';

  private get fourSpec(): FourSpec {
    return this.spec ?? { shorthand: this.property, prefix: this.property };
  }

  /** The four places in CSS order: sides, or corners for a `corners` spec (`border-radius`). */
  private get places(): readonly string[] {
    return this.fourSpec.corners ? Corners : Sides;
  }

  /** The four values the declarations say. */
  get values(): FourValues {
    return readFour(this.declarations ?? {}, this.fourSpec);
  }

  /** The value the box shows for the chosen place: one side's, or for All the shared one ('' when they differ). */
  private shown(values: FourValues): string {
    if (this.place !== 'all') return values[this.places.indexOf(this.place)];
    return allSame(values) ? values[0] : '';
  }

  /** Sets the chosen place to `value` ('' clears it) and fires `sides-changed`. */
  setPlace(value: string) {
    const values = this.values;
    const next = (this.place === 'all' ? values.map(() => value) : values.map((v, i) => (this.places[i] === this.place ? value : v))) as FourValues;
    const change = writeFour(next, this.fourSpec);
    this.dispatchEvent(new CustomEvent<SidesChangedDetail>('sides-changed', {
      detail: { ...change, values: next }, bubbles: true, composed: true,
    }));
  }

  render() {
    const values = this.values;
    const shown = this.shown(values);
    const length = splitLength(shown);
    const auto = shown === 'auto';
    const unit = length?.unit && this.units.includes(length.unit) ? length.unit : this.units[0];
    const own = new Set(this.places.filter((_, i) => values[i] && !allSame(values)));
    const label = this.label || this.property.charAt(0).toUpperCase() + this.property.slice(1);
    const mixed = this.place === 'all' && !allSame(values);
    return html`
      <div class="head"><span class="label">${label}</span>
        ${renderPlaceToggle<string>({ kind: this.fourSpec.corners ? 'corners' : 'sides', value: this.place, own, label: `${label}: which ${this.fourSpec.corners ? 'corner' : 'side'}`, onChange: place => { this.place = place; } })}
      </div>
      <div class="row">
        <juel-number class="size" .units=${this.units} .unit=${unit} .text=${auto ? '' : shown}
          placeholder=${mixed ? 'mixed' : auto ? 'auto' : '—'} ?disabled=${auto}
          min=${this.allowNegative ? -this.max : 0} label=""
          aria-label="${label} ${this.place === 'all' ? (this.fourSpec.corners ? 'all corners' : 'all sides') : this.place}"
          @value-committed=${(e: CustomEvent<{ text: string }>) => this.setPlace(e.detail.text)}></juel-number>
        <input type="range" class="slider" min=${this.allowNegative ? -this.max : 0} max=${this.max} step="1"
          .value=${String(length?.value ?? 0)} ?disabled=${auto}
          aria-label="${label} ${this.place === 'all' ? (this.fourSpec.corners ? 'all corners' : 'all sides') : this.place} slider"
          @change=${(e: Event) => this.setPlace(`${(e.target as HTMLInputElement).value}${unit}`)}>
        ${this.allowAuto ? html`<label class="auto"><input type="checkbox" class="auto-switch" .checked=${auto}
          @change=${(e: Event) => this.setPlace((e.target as HTMLInputElement).checked ? 'auto' : '')}>Auto</label>` : nothing}
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'juel-sides-editor': JuelSidesEditor;
  }
}
