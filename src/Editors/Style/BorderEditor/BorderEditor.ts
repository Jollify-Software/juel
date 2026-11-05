import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../Number/Number';
import '../../Colour/Colour';
import '../../../Buttons/Button/Button';
import '../SidesEditor/SidesEditor';
import { renderPlaceToggle, placeToggleStyles, type SidePlace } from '../SidesEditor/SideToggle';
import { Sides, lengthRanges, splitLength, type DeclarationChange, type FourSpec } from '../SidesEditor/SidesValue';
import { BorderImageNames } from '../BorderImageEditor/BorderImageValue';
import { BorderStyles, borderNames, emptySide, readBorder, sidesAlike, writeBorder, type BorderSide, type BorderSides } from './BorderValue';

/** `border-changed`'s detail: the declarations to set and to clear (border or radius), in one change. */
export type BorderChangedDetail = DeclarationChange & { preview?: boolean };

/** `border-radius` as four corners, for the embedded corners editor. */
const RadiusSpec: FourSpec = { shorthand: 'border-radius', prefix: 'border', suffix: 'radius', corners: true };

/**
 * `<juel-border-editor>` — an element's border, side by side, and its corner radius. An **All | Top |
 * Right | Bottom | Left** toggle picks the side (a dot marks a side with a border of its own); for it,
 * **Style** (none, solid, dashed, dotted, double, groove, ridge, inset, outset, drawn as swatches),
 * **Colour** (`juel-colour`; `palette` passes the page's swatches, such as a theme's) and **Size**
 * (a slider, number and unit on one row). **Corners** is a `juel-sides-editor` for `border-radius` (All
 * or each corner), beside the border when there's room for both, else under it. With `image-button`,
 * an **Image** button fires `border-image-requested`; while the element has a `border-image-source`
 * the side toggle, style, colour and corners are off, because a border image has no sides of its own
 * and ignores `border-radius`.
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
    :host { display: block; font-family: inherit; font-size: 0.8125rem; color: var(--juel-text, inherit); container-type: inline-size; }
    .columns { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.6rem 1.25rem; }
    @container (min-width: 34rem) { .columns { grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr); } }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
    .label { font-weight: 600; }
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
    juel-number { flex: 1 1 auto; min-width: 0; }
    .clear, .image { --button-height: 1.6rem; --font-size: 0.75rem; --padding: 0 0.5rem; }
    .off { opacity: 0.45; pointer-events: none; }
    .note { margin: 0.25rem 0 0; font-size: 0.75rem; opacity: 0.75; }
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

  /** Show the Image button (`border-image-requested` when it's pressed; the page opens its editor). */
  @property({ type: Boolean, attribute: 'image-button' }) imageButton = false;
  /** How many px one of each unit is, so changing the unit keeps the size (`juel-number`'s `basis`). */
  @property({ attribute: false }) basis?: Record<string, number>;

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

  private emit(change: BorderChangedDetail) {
    this.dispatchEvent(new CustomEvent<BorderChangedDetail>('border-changed', { detail: change, bubbles: true, composed: true }));
  }

  /** Sets part(s) of the chosen side(s) and fires `border-changed`. A size or colour with no style gets `solid`. */
  setPart(part: Partial<BorderSide>, preview = false) {
    // On a border image, only the width means anything. A longhand, as the `border` shorthand would reset the image.
    if (this.declarations?.['border-image-source']) {
      if (part.width) this.emit({ set: { 'border-width': part.width }, clear: [], ...(preview ? { preview: true } : {}) });
      return;
    }
    const sides = this.sides;
    const targets = this.place === 'all' ? Sides : [this.place];
    for (const side of targets) {
      const next = { ...sides[side], ...part };
      if (!next.style && (part.width || part.color)) next.style = 'solid';
      sides[side] = next;
    }
    this.emit({ ...writeBorder(sides), ...(preview ? { preview: true } : {}) });
  }

  /** Clears the chosen side(s)' border. */
  clearPlace() {
    if (this.declarations?.['border-image-source']) {
      this.emit({ set: {}, clear: [...BorderImageNames, ...borderNames()] });
      return;
    }
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
    const image = !!this.declarations?.['border-image-source'];
    return html`
      <div class="columns">
        <div class="border-column">
          <div class="head border-head"><span class="label">${this.label}</span>
            <span class=${image ? 'off' : ''}>${renderPlaceToggle<SidePlace>({ kind: 'sides', value: this.place, own, label: `${this.label}: which side`, onChange: place => { this.place = place; } })}</span>
          </div>
          <div class="row ${image ? 'off' : ''}"><span class="lbl">Style</span>
            <div class="styles" role="radiogroup" aria-label="Border style, ${where}">
              ${BorderStyles.map(style => html`<button type="button" role="radio" data-style=${style} title=${style} aria-label=${style}
                aria-checked=${shown.style === style ? 'true' : 'false'} @click=${() => this.setPart({ style })}>
                ${style === 'none' ? 'None' : html`<span class="swatch" style="border-top-style: ${style}"></span>`}</button>`)}
            </div>
          </div>
          <div class="row"><span class="lbl">Colour</span>
            <span class=${image ? 'off' : ''}><juel-colour class="colour" .value=${shown.color || '#000000'} .palette=${this.palette}
              @value-changed=${(e: CustomEvent<{ value: string }>) => this.setPart({ color: e.detail.value })}></juel-colour></span>
            ${this.imageButton ? html`<juel-button type="light" class="image" glyph="lucide-image" label="Image" toggle ?pressed=${image}
              title="Draw the border from a picture or a gradient"
              @click=${() => this.dispatchEvent(new CustomEvent('border-image-requested', { bubbles: true, composed: true }))}></juel-button>` : ''}
            <juel-button type="light" class="clear" label="Clear" title="No border on ${where}" @click=${() => this.clearPlace()}></juel-button>
          </div>
          <div class="row"><span class="lbl">Size</span>
            <juel-number class="border-size" slider hide-label label="Border size, ${where}" .units=${this.units} .unit=${unit} .text=${shown.width}
              .ranges=${lengthRanges(this.units, this.max)} .basis=${this.basis} placeholder=${shown.width ? '' : '—'} min="0"
              @value-changed=${(e: CustomEvent<{ text: string }>) => { if (e.detail.text) this.setPart({ width: e.detail.text }, true); }}
              @value-committed=${(e: CustomEvent<{ text: string }>) => this.setPart({ width: e.detail.text })}></juel-number>
          </div>
        </div>
        <div class="corners-column ${image ? 'off' : ''}">
          <juel-sides-editor class="radius" label="Corners" .spec=${RadiusSpec} .declarations=${this.declarations} max="60"
            .units=${['px', '%', 'em', 'rem']} .basis=${this.basis}
            @sides-changed=${(e: CustomEvent<BorderChangedDetail>) => { e.stopPropagation(); this.emit({ set: e.detail.set, clear: e.detail.clear, ...(e.detail.preview ? { preview: true } : {}) }); }}></juel-sides-editor>
        </div>
      </div>
      ${image ? html`<p class="note">This border is drawn from an image, so its sides and rounded corners don't apply.</p>` : ''}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'juel-border-editor': JuelBorderEditor;
  }
}
