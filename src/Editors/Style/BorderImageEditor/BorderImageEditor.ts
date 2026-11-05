import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import '../../Number/Number';
import '../../../Buttons/Button/Button';
import '../../../Buttons/Segmented/Segmented';
import '../GradientEditor/GradientEditor';
import { renderPlaceToggle, placeToggleStyles, type SidePlace } from '../SidesEditor/SideToggle';
import type { DeclarationChange, FourValues, Side } from '../SidesEditor/SidesValue';
import { Sides, clearBorderImage, defaultBorderImage, isGradientSource, moveSlice, readBorderImage, sideValue, sliceFraction, withSide, writeBorderImage, BorderImageRepeats, type BorderImage, type BorderImageRepeat, type ImageSize } from './BorderImageValue';
import { BorderImagePresets, presetSource, type BorderImagePreset } from './BorderImagePresets';

const StarterGradient = 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)';
/** The largest the slice grid draws a picture, in px. */
const SlicerSize = 176;
const SideLabels: Record<Side, string> = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' };
/** The arrow key that moves a side's guide further in. */
const InwardKey: Record<Side, string> = { top: 'ArrowDown', right: 'ArrowLeft', bottom: 'ArrowUp', left: 'ArrowRight' };
const OutwardKey: Record<Side, string> = { top: 'ArrowUp', right: 'ArrowRight', bottom: 'ArrowDown', left: 'ArrowLeft' };
const RepeatLabels: Record<BorderImageRepeat, { label: string; title: string }> = {
    stretch: { label: 'Stretch', title: 'Stretch each edge to fit' },
    repeat: { label: 'Repeat', title: 'Tile each edge, cutting the last tile if it must' },
    round: { label: 'Round', title: 'Tile each edge, resizing the tiles to fit exactly' },
    space: { label: 'Space', title: 'Tile each edge, with gaps so whole tiles fit' },
};

/**
 * `<juel-border-image-editor>` — a border drawn from a picture or a gradient, with a live preview: a set
 * of **built-in pictures** (`presets`, each carried in the CSS as a `data:` URL, so it needs no file), a
 * **slice grid** (four guides dragged on the picture, or moved with the arrow keys), **Slice**, **Width**,
 * **Picture width** (`border-image-width`), **Reach out** (`border-image-outset`), each for all sides or
 * one, **Edges** (stretch, repeat, round, space; top and bottom apart from left and right if wanted) and
 * **Fill the middle**.
 *
 * It reads `declarations` and fires `border-image-changed` `{ set, clear }` for each edit (`preview` while
 * a slider or guide moves). Choosing your own picture is the page's: **Choose picture…** fires
 * `source-requested`, and the page sets the `url(…)` it chose with `setSource`. A page whose picture paths
 * mean nothing to the browser (a library path) passes a usable address for the preview as `preview-source`.
 */
@customElement('juel-border-image-editor')
export class JuelBorderImageEditor extends LitElement {
    static styles = [placeToggleStyles, css`
        :host { display: block; font-family: inherit; font-size: 0.8125rem; color: var(--juel-text, inherit); }
        .row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .lbl { width: 5rem; flex: none; opacity: 0.75; }
        juel-number { flex: 1 1 auto; min-width: 0; }
        .stages { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
        .stage { display: grid; place-items: center; min-height: 9rem; padding: 1.5rem; box-sizing: border-box;
            background: var(--juel-sunken, rgba(127, 127, 127, 0.08)); border-radius: var(--juel-radius-sm, 4px); overflow: hidden; }
        .slice-stage { padding: 0.75rem; }
        /* The picture on a checkerboard, so a transparent part shows as one. */
        .slicer { position: relative; flex: none; touch-action: none; user-select: none;
            background: repeating-conic-gradient(rgba(127, 127, 127, 0.3) 0 25%, rgba(255, 255, 255, 0.5) 0 50%) 0 0 / 14px 14px; }
        .slicer img { display: block; width: 100%; height: 100%; pointer-events: none; }
        /* What Fill the middle would use: dimmed while it isn't. */
        .slice-middle { position: absolute; background: rgba(0, 0, 0, 0.45); pointer-events: none; }
        .guide { position: absolute; outline: none; z-index: 1; }
        .guide::before { content: ''; position: absolute; background: var(--juel-accent, #3b5bdb); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.9); }
        .guide::after { content: ''; position: absolute; width: 10px; height: 10px; border-radius: 50%; background: var(--juel-accent, #3b5bdb); box-shadow: 0 0 0 1.5px #fff; }
        .guide:focus-visible::after, .guide.chosen::after { width: 14px; height: 14px; }
        .guide:focus-visible::before { box-shadow: 0 0 0 2px #fff; }
        /* A guide is a strip wider than its line, so it's easy to take hold of. */
        .guide.top, .guide.bottom { left: 0; right: 0; height: 16px; margin-top: -8px; cursor: ns-resize; }
        .guide.top::before, .guide.bottom::before { left: 0; right: 0; top: 7px; height: 2px; }
        /* The knobs are at the lines' middles, clear of where the guides cross at the usual slices. */
        .guide.top::after, .guide.bottom::after { top: 8px; left: 50%; translate: -50% -50%; }
        .guide.left, .guide.right { top: 0; bottom: 0; width: 16px; margin-left: -8px; cursor: ew-resize; }
        .guide.left::before, .guide.right::before { top: 0; bottom: 0; left: 7px; width: 2px; }
        .guide.left::after, .guide.right::after { left: 8px; top: 50%; translate: -50% -50%; }
        .presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(4.25rem, 1fr)); gap: 0.35rem; margin-bottom: 0.6rem; }
        button.preset { display: flex; flex-direction: column; align-items: stretch; gap: 2px; min-width: 0; padding: 3px; margin: 0; font: inherit; font-size: 0.6875rem; cursor: pointer;
            color: inherit; background: transparent; border: 1px solid transparent; border-radius: var(--juel-radius-sm, 4px); }
        button.preset:hover { background: var(--juel-hover, rgba(127, 127, 127, 0.12)); }
        button.preset:focus-visible { outline: 2px solid var(--juel-accent, #3b5bdb); outline-offset: 1px; }
        button.preset[aria-pressed='true'] { border-color: var(--juel-accent, #3b5bdb); background: var(--juel-selection, rgba(59, 91, 219, 0.14)); }
        .swatch { display: block; height: 2.6rem; box-sizing: border-box; border-style: solid; background-color: #fff; background-clip: padding-box; }
        .swatch.on-dark { background-color: #16181d; }
        .preset-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-align: center; }
        .preview { width: min(14rem, 100%); min-height: 3.5rem; display: grid; place-items: center; box-sizing: content-box;
            background: var(--juel-surface, #fff); color: var(--juel-text, #212529); }
        .prompt { margin: 0; opacity: 0.75; }
        .source-name { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; opacity: 0.8; }
        .web { flex: 1 1 auto; min-width: 0; font: inherit; padding: 3px 5px; box-sizing: border-box;
            border: 1px solid var(--juel-border, #ccc); border-radius: var(--juel-radius-sm, 4px);
            background: var(--juel-surface, Field); color: var(--juel-text, FieldText); }
        juel-gradient-editor { display: block; margin-bottom: 0.5rem; }
        label.fill, label.repeat-apart { display: inline-flex; align-items: center; gap: 0.35rem; }
    `];

    /** The element's declarations now. */
    @property({ attribute: false }) declarations: Record<string, string | undefined> = {};
    /** A usable address for a picture in the preview, when `border-image-source`'s isn't. */
    @property({ type: String, attribute: 'preview-source' }) previewSource = '';
    /** The built-in pictures on offer; empty to offer none, and Picture goes straight to `source-requested`. */
    @property({ attribute: false }) presets: readonly BorderImagePreset[] = BorderImagePresets;

    /** Chosen before any source exists: which kind of source the editor is offering. */
    @state() private kind: 'picture' | 'gradient' | null = null;
    @state() private place: SidePlace = 'all';
    /** The picture's own size, once it has loaded; the slice grid waits for it. */
    @state() private natural: ImageSize | null = null;
    /** Top and bottom edges set apart from left and right (always, when they differ). */
    @state() private edgesApart = false;
    /** The address `natural` is for. */
    private measured = '';
    private dragging: Side | null = null;

    private get image(): BorderImage | null { return readBorderImage(this.declarations ?? {}); }

    /** The picture's own address from a `url(…)` source. */
    private pictureIn(source: string): string {
        return /^\s*url\(\s*(['"]?)(.*?)\1\s*\)/i.exec(source)?.[2] ?? '';
    }

    /** Where the browser can get the picture: `preview-source`, unless the source is an address in itself. */
    private pictureAddress(image: BorderImage | null): string {
        if (!image || isGradientSource(image.source)) return '';
        const picture = this.pictureIn(image.source);
        return /^(?:data:|https?:\/\/)/i.test(picture) ? picture : this.previewSource || picture;
    }

    protected override willUpdate() {
        const address = this.pictureAddress(this.image);
        if (address === this.measured) return;
        this.measured = address;
        this.natural = null;
        if (!address) return;
        const picture = new Image();
        picture.onload = () => {
            // An SVG with no size of its own says 0: any square will do, as a slice in it can only be a %.
            if (this.measured === address) this.natural = { width: picture.naturalWidth || 100, height: picture.naturalHeight || 100 };
        };
        picture.src = address;
    }

    private emit(change: DeclarationChange & { preview?: boolean }) {
        this.dispatchEvent(new CustomEvent('border-image-changed', { detail: change, bubbles: true, composed: true }));
    }

    private change(part: Partial<BorderImage>, preview = false) {
        const image = this.image;
        if (!image) return;
        this.emit({ ...writeBorderImage({ ...image, ...part }), ...(preview ? { preview: true } : {}) });
    }

    /** Sets the source (`url(…)` or a gradient). A first source, or a change of kind, starts from sensible settings. */
    setSource(source: string, preview = false) {
        const image = this.image;
        const sameKind = image && isGradientSource(image.source) === isGradientSource(source);
        const next = sameKind ? { ...image, source } : defaultBorderImage(source, image?.width);
        this.emit({ ...writeBorderImage(next), ...(preview ? { preview: true } : {}) });
    }

    /** Takes the border image off. */
    clear() {
        this.kind = null;
        this.emit(clearBorderImage());
    }

    private chooseKind(kind: 'picture' | 'gradient') {
        this.kind = kind;
        if (kind === 'gradient' && !isGradientSource(this.image?.source ?? '')) this.setSource(StarterGradient);
        if (kind === 'picture') {
            if (isGradientSource(this.image?.source ?? '')) this.emit(clearBorderImage());
            // With built-in pictures to pick from, nothing's asked until one is wanted.
            if (!this.presets.length && (!this.image || isGradientSource(this.image.source))) this.requestPicture();
        }
    }

    private requestPicture() {
        this.dispatchEvent(new CustomEvent('source-requested', { bubbles: true, composed: true }));
    }

    /** A built-in picture, with the settings it was drawn for. */
    private choosePreset(preset: BorderImagePreset) {
        const { slice, repeat, width, fill } = preset;
        this.place = 'all';
        this.edgesApart = false;
        this.emit(writeBorderImage({
            source: presetSource(preset), slice: [slice, slice, slice, slice], fill: !!fill,
            width, imageWidth: '', outset: '', repeat, repeatSides: repeat,
        }));
    }

    private previewStyle(image: BorderImage | null) {
        if (!image) return {};
        const change = writeBorderImage(image);
        const out: Record<string, string> = { ...change.set };
        const address = this.pictureAddress(image);
        if (address) out['border-image-source'] = `url("${address.replace(/"/g, '%22')}")`;
        return out;
    }

    /** Moves a guide to `fraction` of the picture, in from its edge. All moves all four; otherwise that side becomes the one shown. */
    private moveGuide(side: Side, fraction: number, preview: boolean) {
        const image = this.image;
        if (!image || !this.natural) return;
        const together = this.place === 'all';
        if (!together) this.place = side;
        this.change({ slice: moveSlice(image.slice, side, fraction, this.natural, together) }, preview);
    }

    /** Where the pointer is on the picture, as a fraction in from `side`. */
    private fractionAt(side: Side, e: PointerEvent): number {
        const box = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
        const x = (e.clientX - box.left) / box.width, y = (e.clientY - box.top) / box.height;
        return side === 'top' ? y : side === 'bottom' ? 1 - y : side === 'left' ? x : 1 - x;
    }

    private guideDown(side: Side, e: PointerEvent) {
        if (e.button) return;
        e.preventDefault();
        const guide = e.currentTarget as HTMLElement;
        guide.setPointerCapture(e.pointerId);
        guide.focus({ preventScroll: true });
        this.dragging = side;
    }

    private guideMove(side: Side, e: PointerEvent) {
        if (this.dragging === side) this.moveGuide(side, this.fractionAt(side, e), true);
    }

    /** The drag's end is the edit that counts: one undo step, however far it moved. */
    private guideUp(side: Side, e: PointerEvent) {
        if (this.dragging !== side) return;
        this.dragging = null;
        this.moveGuide(side, this.fractionAt(side, e), false);
    }

    /** The arrow keys along a guide's direction: a whole `%` or px, ten with Shift. */
    private guideKey(side: Side, e: KeyboardEvent) {
        const image = this.image, size = this.natural;
        if (!image || !size) return;
        const sign = e.key === InwardKey[side] ? 1 : e.key === OutwardKey[side] ? -1 : 0;
        if (!sign) return;
        e.preventDefault();
        const along = side === 'top' || side === 'bottom' ? size.height : size.width;
        const unit = /%$/.test(image.slice[Sides.indexOf(side)]) ? 0.01 : 1 / along;
        this.moveGuide(side, sliceFraction(image.slice, side, size) + sign * unit * (e.shiftKey ? 10 : 1), false);
    }

    private renderGuide(side: Side, image: BorderImage, size: ImageSize) {
        const fraction = sliceFraction(image.slice, side, size);
        const horizontal = side === 'top' || side === 'bottom';
        const at = (side === 'top' || side === 'left' ? fraction : 1 - fraction) * 100;
        const value = image.slice[Sides.indexOf(side)];
        return html`<div class="guide ${side} ${this.place === side ? 'chosen' : ''}" data-side=${side} role="slider" tabindex="0"
            aria-label="${SideLabels[side]} slice" aria-orientation=${horizontal ? 'vertical' : 'horizontal'}
            aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(fraction * 100)} aria-valuetext=${/%$/.test(value) ? value : `${value} pixels`}
            style=${horizontal ? `top: ${at}%` : `left: ${at}%`}
            @pointerdown=${(e: PointerEvent) => this.guideDown(side, e)} @pointermove=${(e: PointerEvent) => this.guideMove(side, e)}
            @pointerup=${(e: PointerEvent) => this.guideUp(side, e)} @pointercancel=${(e: PointerEvent) => this.guideUp(side, e)}
            @keydown=${(e: KeyboardEvent) => this.guideKey(side, e)}></div>`;
    }

    /** The picture with its four guides; the middle's dimmed unless Fill the middle uses it. */
    private renderSlicer(image: BorderImage) {
        const size = this.natural;
        if (!size) return nothing;
        const scale = SlicerSize / Math.max(size.width, size.height);
        const [top, right, bottom, left] = Sides.map(side => sliceFraction(image.slice, side, size) * 100);
        return html`<div class="stage slice-stage">
            <div class="slicer" part="slicer" title="Drag a line to choose where the picture is cut: the corners stay whole and the edges between them repeat"
                style="width: ${Math.round(size.width * scale)}px; height: ${Math.round(size.height * scale)}px">
                <img src=${this.pictureAddress(image)} alt="" draggable="false">
                ${image.fill ? nothing : html`<div class="slice-middle" style="top: ${top}%; right: ${right}%; bottom: ${bottom}%; left: ${left}%"></div>`}
                ${Sides.map(side => this.renderGuide(side, image, size))}
            </div>
        </div>`;
    }

    private renderPresets(chosen: string) {
        return html`<div class="presets" role="group" aria-label="Built-in pictures">
            ${this.presets.map(preset => {
                const source = presetSource(preset);
                return html`<button type="button" class="preset" data-preset=${preset.id} title=${preset.label} aria-pressed=${source === chosen ? 'true' : 'false'}
                    @click=${() => this.choosePreset(preset)}>
                    <span class="swatch ${preset.onDark ? 'on-dark' : ''}" style=${styleMap({
                        'border-width': '11px',
                        'border-image-source': source,
                        'border-image-slice': `${preset.slice}${preset.fill ? ' fill' : ''}`,
                        'border-image-repeat': preset.repeat,
                    })}></span>
                    <span class="preset-name">${preset.label}</span>
                </button>`;
            })}
        </div>`;
    }

    /** All | Top | Right | Bottom | Left, for every setting below it. */
    private renderPlace() {
        return html`<div class="row" data-part="place"><span class="lbl">Sides</span>
            ${renderPlaceToggle<SidePlace>({ kind: 'sides', value: this.place, own: new Set(), label: 'Which side to set', onChange: place => { this.place = place; } })}
        </div>`;
    }

    /** A length for the chosen side: Width, Picture width, Reach out. */
    private renderLength(part: 'width' | 'imageWidth' | 'outset', className: string, label: string, title: string, blank: string, ranges: object, units: string[], placeholder: string, image: BorderImage) {
        const value = image[part];
        const shown = sideValue(value, this.place);
        const mixed = !!value && !shown;
        const set = (text: string, preview: boolean) => {
            // The border must have a width to draw on: an emptied Width stays as it was.
            if (!text && part === 'width') return;
            this.change({ [part]: withSide(value, this.place, text, blank) }, preview);
        };
        return html`<div class="row" data-part=${className} title=${title}><span class="lbl">${label}</span>
            <juel-number class=${className} slider hide-label label=${label} .units=${units} .text=${shown} placeholder=${mixed ? 'mixed' : placeholder}
                .ranges=${ranges}
                @value-changed=${(e: CustomEvent<{ text: string }>) => set(e.detail.text, true)}
                @value-committed=${(e: CustomEvent<{ text: string }>) => set(e.detail.text, false)}></juel-number>
        </div>`;
    }

    private renderEdges(image: BorderImage) {
        const apart = this.edgesApart || image.repeat !== image.repeatSides;
        const options = BorderImageRepeats.map(r => ({ value: r, label: RepeatLabels[r].label, title: RepeatLabels[r].title }));
        return html`<div class="row" data-part="repeat"><span class="lbl">${apart ? 'Top, bottom' : 'Edges'}</span>
                <juel-segmented class="repeat" label=${apart ? 'Top and bottom edges' : 'Edges'} .value=${image.repeat} .options=${options}
                    @value-changed=${(e: CustomEvent<{ value: BorderImageRepeat }>) => this.change(apart ? { repeat: e.detail.value } : { repeat: e.detail.value, repeatSides: e.detail.value })}></juel-segmented>
            </div>
            ${apart ? html`<div class="row" data-part="repeat-sides"><span class="lbl">Left, right</span>
                <juel-segmented class="repeat-sides" label="Left and right edges" .value=${image.repeatSides} .options=${options}
                    @value-changed=${(e: CustomEvent<{ value: BorderImageRepeat }>) => this.change({ repeatSides: e.detail.value })}></juel-segmented>
            </div>` : nothing}
            <div class="row"><span class="lbl"></span>
                <label class="repeat-apart"><input type="checkbox" class="edges-apart" .checked=${apart}
                    @change=${(e: Event) => {
                        const on = (e.target as HTMLInputElement).checked;
                        this.edgesApart = on;
                        if (!on) this.change({ repeatSides: image.repeat });
                    }}>Set the top and bottom edges apart from the sides</label>
            </div>`;
    }

    private renderSlice(image: BorderImage) {
        const at = this.place === 'all' ? 0 : Sides.indexOf(this.place);
        const same = image.slice.every(v => v === image.slice[0]);
        const shown = this.place === 'all' && !same ? '' : image.slice[at];
        const asPercent = /%$/.test(shown) || !shown;
        // CSS wants a slice in the image's px as a bare number, so the menu's px is written with no unit.
        const set = (text: string, unit: string, preview: boolean) => {
            if (!text) return;
            const value = unit === 'px' ? text.replace(/px$/, '') : text;
            const slice = (this.place === 'all' ? [value, value, value, value] : image.slice.map((v, i) => i === at ? value : v)) as FourValues;
            this.change({ slice }, preview);
        };
        return html`<div class="row" data-part="slice"><span class="lbl">Slice</span>
                <juel-number class="slice" slider hide-label label="Slice" .units=${['%', 'px']} .unit=${asPercent ? '%' : 'px'}
                    .text=${asPercent ? shown : `${shown}px`} placeholder=${same ? '' : 'mixed'}
                    .ranges=${{ '%': { min: 0, max: 50, step: 1 }, px: { min: 0, max: 300, step: 1 } }}
                    @value-changed=${(e: CustomEvent<{ text: string; unit: string }>) => set(e.detail.text, e.detail.unit, true)}
                    @value-committed=${(e: CustomEvent<{ text: string; unit: string }>) => set(e.detail.text, e.detail.unit, false)}></juel-number>
            </div>`;
    }

    render() {
        const image = this.image;
        const source = image?.source ?? '';
        const kind = image ? (isGradientSource(source) ? 'gradient' : 'picture') : this.kind;
        const picture = this.pictureIn(source);
        const web = /^https?:\/\//i.test(picture);
        const embedded = /^data:/i.test(picture);
        const named = this.presets.find(p => presetSource(p) === source)?.label;
        return html`
            <div class="row"><span class="lbl">Draw it from</span>
                <juel-segmented class="kind" label="Draw it from" .value=${kind}
                    .options=${[{ value: 'picture', label: 'Picture' }, { value: 'gradient', label: 'Gradient' }]}
                    @value-changed=${(e: CustomEvent<{ value: 'picture' | 'gradient' }>) => this.chooseKind(e.detail.value)}></juel-segmented>
            </div>
            ${kind === 'picture' ? html`${this.presets.length ? this.renderPresets(source) : nothing}
                <div class="row"><span class="lbl"></span>
                    <juel-button type="light" class="choose-picture" glyph="lucide-image" label=${this.presets.length ? 'Use your own picture…' : 'Choose picture…'} @click=${() => this.requestPicture()}></juel-button>
                    ${named ? html`<span class="source-name">${named}</span>`
                        : embedded ? html`<span class="source-name">A picture in the CSS</span>`
                        : picture && !web ? html`<span class="source-name" title=${picture}>${picture.replace(/^.*\//, '')}</span>` : nothing}
                </div>
                <div class="row"><span class="lbl"></span>
                    <input class="web" placeholder="Or a web address: https://…" aria-label="A picture's web address" .value=${web ? picture : ''}
                        @change=${(e: Event) => {
                            const typed = (e.target as HTMLInputElement).value.trim();
                            if (/^https?:\/\//i.test(typed)) this.setSource(`url("${typed.replace(/"/g, '%22')}")`);
                        }}>
                </div>` : nothing}
            ${kind === 'gradient' && image ? html`<juel-gradient-editor class="gradient" .value=${source}
                @gradient-changed=${(e: CustomEvent<{ value: string; reason: string }>) => this.setSource(e.detail.value, e.detail.reason === 'preview')}></juel-gradient-editor>` : nothing}
            <div class="stages">
                <div class="stage"><div class="preview" part="preview" style=${styleMap(this.previewStyle(image))}>
                    ${image ? 'Preview' : html`<p class="prompt">Choose a picture or a gradient</p>`}</div></div>
                ${image && kind === 'picture' ? this.renderSlicer(image) : nothing}
            </div>
            ${image ? html`
                ${this.renderPlace()}
                ${kind === 'picture' ? this.renderSlice(image) : nothing}
                ${this.renderLength('width', 'width', 'Width', "The border's width", '16px',
                    { px: { min: 1, max: 80, step: 1 }, em: { min: 0.1, max: 5, step: 0.05 } }, ['px', 'em'], '', image)}
                ${this.renderLength('imageWidth', 'image-width', 'Picture width', 'How wide the picture is drawn. Empty matches the border\'s width', '1',
                    { px: { min: 0, max: 80, step: 1 }, em: { min: 0, max: 5, step: 0.05 }, '%': { min: 0, max: 100, step: 1 } }, ['px', 'em', '%'], 'Same', image)}
                ${this.renderLength('outset', 'outset', 'Reach out', 'How far the picture reaches outside the box', '0',
                    { px: { min: 0, max: 60, step: 1 }, em: { min: 0, max: 4, step: 0.05 } }, ['px', 'em'], '0', image)}
                ${kind === 'picture' ? html`${this.renderEdges(image)}
                <div class="row"><span class="lbl"></span>
                    <label class="fill"><input type="checkbox" class="fill-middle" .checked=${image.fill}
                        @change=${(e: Event) => this.change({ fill: (e.target as HTMLInputElement).checked })}>Fill the middle with the picture</label>
                </div>` : nothing}` : nothing}`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-border-image-editor': JuelBorderImageEditor }
}
