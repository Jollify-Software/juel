import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../Number/Number';
import '../../Colour/Colour';
import '../../../Buttons/Button/Button';
import '../SidesEditor/SidesEditor';
import { renderPlaceToggle, placeToggleStyles, type SidePlace } from '../SidesEditor/SideToggle';
import { Sides, splitLength, type DeclarationChange, type FourSpec } from '../SidesEditor/SidesValue';
import { BorderStyles, emptySide, readBorder, sidesAlike, writeBorder, type BorderSide, type BorderSides } from './BorderValue';

/** `border-changed`'s detail: the declarations to set and to clear (border or radius), in one change. */
export type BorderChangedDetail = DeclarationChange;

/** `border-radius` as four corners, for the embedded corners editor. */
const RadiusSpec: FourSpec = { shorthand: 'border-radius', prefix: 'border', suffix: 'radius', corners: true };

/**
 * `<juel-border-editor>` — an element's border, side by side, and its corner radius. An **All | Top |
 * Right | Bottom | Left** toggle picks the side (a dot marks a side with a border of its own); for it,
 * **Style** (none, solid, dashed, dotted, double, groove, ridge, inset, outset, drawn as swatches),
 * **Colour** (`juel-colour`; `palette` passes the page's swatches, such as a theme's) and **Size**
 * (a number with units and a slider). **Corners** is a `juel-sides-editor` for `border-radius` (All or
 * each corner).
 *
 * It reads `declarations` (`border`, `border-<side>`, the `-width/-style/-color` lists and longhands,
 * `border-radius` and its longhands) and fires `border-changed` `{ set, clear }` for each edit: the
 * shortest CSS (`border` when the four sides match, else `border-<side>`) and every declaration to
 * clear, so a leftover longhand can't override it. The page applies it as one undo step and passes
 * the new declarations back. Giving a side a size or colour with no style makes it `solid`, so it shows.
 */
@customElement('juel-border-editor')
export class JuelBorderEditor extends LitElement {
  static styles = [placeToggleStyles, css`
    :host { display: block; font-family: inherit; font-size: 0.8125rem; color: var(--juel-text, inherit); }
    .head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
    .label { font-weight: 600; flex: 1; }
    .row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem; }
    .lbl { width: 3.2rem; flex: none; opacity: 0.75; }
    .styles { display: flex; flex-wrap: wrap; gap: 3px; }
    .styles button {
      display: grid; place-items: center; width: 34px; height: 24px; padding: 0 4px; box-sizing: border-box;
      border: 1px solid var(--juel-border, #ced4da); border-radius: var(--juel-radius-sm, 4px);
      background: var(--juel-surface, #fff); color: var(--juel-text, #212529); cursor: pointer; font: inherit; font-size: 0.7rem;
    }
    .styles button:hover { background: var(--juel-hover, #f1f3f5); }
    .styles button[aria-checked='true'] { outline: 2px solid var(--juel-accent, #3b5bdb); outline-offset: 0; }
    .styles button:focus-visible { outline: 2px solid var(--juel-accent, #3b5bdb); outline-offset: 1px; }
    .styles .swatch { display: block; width: 100%; height: 0; border-top: 4px currentColor; }
    juel-number { width: 6.5rem; flex: none; }
    input[type='range'] { flex: 1; min-width: 4rem; }
    juel-sides-editor { margin-top: 0.6rem; }
    .clear { --button-height: 1.6rem; --font-size: 0.75rem; }
  `];

  /** The element's declarations now (any border and radius declarations, as set). */
  @property({ attribute: false }) declarations: Record<string, string | undefined> = {};
  /** The colour swatches offered (passed to `juel-colour`'s `palette`), such as the theme's colours. */
  @property({ attribute: false }) palette?: (string | { value: string; label?: string })[];
  /** The heading above the side toggle. */
  @property({ type: String }) label = 'Border';
  /** The size slider's top end, in px. */
  @property({ type: Number }) max = 20;
  /** The units offered beside the size. */
  @property({ attribute: false }) units = ['px', 'em', 'rem'];

  /** The side being edited; "all" edits the four together. */
  @state() place: SidePlace = 'all';

  /** The four sides the declarations say. */
  get sides(): BorderSides {
    return readBorder(this.declarations ?? {});
  }

  /** The chosen side's border, or for All the shared one (empty parts where the sides differ). */
  private shown(sides: BorderSides): BorderSide {
    if (this.place !== 'all') return sides[this.place];
    if (sidesAlike(sides)) return sides.top;
    const pick = (part: keyof BorderSide) => (Sides.every(s => sides[s][part] === sides.top[part]) ? sides.top[part] : '');
    return { width: pick('width'), style: pick('style'), color: pick('color') };
  }

  private emit(change: DeclarationChange) {
    this.dispatchEvent(new CustomEvent<BorderChangedDetail>('border-changed', { detail: change, bubbles: true, composed: true }));
  }

  /** Sets part(s) of the chosen side(s) and fires `border-changed`. A size or colour with no style gets `solid`. */
  setPart(part: Partial<BorderSide>) {
    const sides = this.sides;
    const targets = this.place === 'all' ? Sides : [this.place];
    for (const side of targets) {
      const next = { ...sides[side], ...part };
      if (!next.style && (part.width || part.color)) next.style = 'solid';
      sides[side] = next;
    }
    this.emit(writeBorder(sides));
  }

  /** Clears the chosen side(s)' border. */
  clearPlace() {
    const sides = this.sides;
    for (const side of this.place === 'all' ? Sides : [this.place]) sides[side] = emptySide();
    this.emit(writeBorder(sides));
  }

  render() {
    const sides = this.sides;
    const shown = this.shown(sides);
    const own = new Set<string>(sidesAlike(sides) ? [] : Sides.filter(s => sides[s].width || sides[s].style || sides[s].color));
    const where = this.place === 'all' ? 'all sides' : this.place;
    const length = splitLength(shown.width);
    const unit = length?.unit && this.units.includes(length.unit) ? length.unit : this.units[0];
    return html`
      <div class="head border-head"><span class="label">${this.label}</span>
        ${renderPlaceToggle<SidePlace>({ kind: 'sides', value: this.place, own, label: `${this.label}: which side`, onChange: place => { this.place = place; } })}
      </div>
      <div class="row"><span class="lbl">Style</span>
        <div class="styles" role="radiogroup" aria-label="Border style, ${where}">
          ${BorderStyles.map(style => html`<button type="button" role="radio" data-style=${style} title=${style} aria-label=${style}
            aria-checked=${shown.style === style ? 'true' : 'false'} @click=${() => this.setPart({ style })}>
            ${style === 'none' ? 'None' : html`<span class="swatch" style="border-top-style: ${style}"></span>`}</button>`)}
        </div>
      </div>
      <div class="row"><span class="lbl">Colour</span>
        <juel-colour class="colour" .value=${shown.color || '#000000'} .palette=${this.palette}
          @value-changed=${(e: CustomEvent<{ value: string }>) => this.setPart({ color: e.detail.value })}></juel-colour>
        <span style="flex:1"></span>
        <juel-button type="light" class="clear" label="Clear" title="No border on ${where}" @click=${() => this.clearPlace()}></juel-button>
      </div>
      <div class="row"><span class="lbl">Size</span>
        <juel-number class="border-size" .units=${this.units} .unit=${unit} .text=${shown.width} placeholder=${shown.width ? '' : '—'} min="0"
          aria-label="Border size, ${where}"
          @value-committed=${(e: CustomEvent<{ text: string }>) => this.setPart({ width: e.detail.text })}></juel-number>
        <input type="range" class="slider" min="0" max=${this.max} step="1" .value=${String(length?.value ?? 0)} aria-label="Border size slider, ${where}"
          @change=${(e: Event) => this.setPart({ width: `${(e.target as HTMLInputElement).value}${unit}` })}>
      </div>
      <juel-sides-editor class="radius" label="Corners" .spec=${RadiusSpec} .declarations=${this.declarations} max="60"
        .units=${['px', '%', 'em', 'rem']}
        @sides-changed=${(e: CustomEvent<DeclarationChange>) => { e.stopPropagation(); this.emit({ set: e.detail.set, clear: e.detail.clear }); }}></juel-sides-editor>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'juel-border-editor': JuelBorderEditor;
  }
}
