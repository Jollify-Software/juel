import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import '../../Number/Number';
import '../../../Buttons/Button/Button';
import '../../../Buttons/Segmented/Segmented';
import '../GradientEditor/GradientEditor';
import { renderPlaceToggle, placeToggleStyles, type SidePlace } from '../SidesEditor/SideToggle';
import type { DeclarationChange, FourValues } from '../SidesEditor/SidesValue';
import { Sides, clearBorderImage, defaultBorderImage, isGradientSource, readBorderImage, writeBorderImage, BorderImageRepeats, type BorderImage, type BorderImageRepeat } from './BorderImageValue';

const StarterGradient = 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)';
const RepeatLabels: Record<BorderImageRepeat, { label: string; title: string }> = {
    stretch: { label: 'Stretch', title: 'Stretch each edge to fit' },
    repeat: { label: 'Repeat', title: 'Tile each edge, cutting the last tile if it must' },
    round: { label: 'Round', title: 'Tile each edge, resizing the tiles to fit exactly' },
    space: { label: 'Space', title: 'Tile each edge, with gaps so whole tiles fit' },
};

/**
 * `<juel-border-image-editor>` — a border drawn from a picture or a gradient: **Slice** (how far in from
 * each edge the picture is cut, all sides or each), **Width**, **Reach out** (`border-image-outset`),
 * **Edges** (stretch, repeat, round, space) and **Fill the middle**, with a live preview.
 *
 * It reads `declarations` and fires `border-image-changed` `{ set, clear }` for each edit (`preview` while
 * a slider moves). Choosing the picture is the page's: **Choose picture…** fires `source-requested`, and
 * the page sets the `url(…)` it chose with `setSource`. A page whose picture paths mean nothing to the
 * browser (a library path) passes a usable address for the preview as `preview-source`.
 */
@customElement('juel-border-image-editor')
export class JuelBorderImageEditor extends LitElement {
    static styles = [placeToggleStyles, css`
        :host { display: block; font-family: inherit; font-size: 0.8125rem; color: var(--juel-text, inherit); }
        .row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .lbl { width: 5rem; flex: none; opacity: 0.75; }
        juel-number { flex: 1 1 auto; min-width: 0; }
        .stage { display: grid; place-items: center; min-height: 9rem; margin-bottom: 0.75rem; padding: 1.5rem; box-sizing: border-box;
            background: var(--juel-sunken, rgba(127, 127, 127, 0.08)); border-radius: var(--juel-radius-sm, 4px); overflow: hidden; }
        .preview { width: min(14rem, 100%); min-height: 3.5rem; display: grid; place-items: center; box-sizing: content-box;
            background: var(--juel-surface, #fff); color: var(--juel-text, #212529); }
        .empty { margin: 0; opacity: 0.75; }
        .source-name { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; opacity: 0.8; }
        .web { flex: 1 1 auto; min-width: 0; font: inherit; padding: 3px 5px; box-sizing: border-box;
            border: 1px solid var(--juel-border, #ccc); border-radius: var(--juel-radius-sm, 4px);
            background: var(--juel-surface, Field); color: var(--juel-text, FieldText); }
        juel-gradient-editor { display: block; margin-bottom: 0.5rem; }
        label.fill { display: inline-flex; align-items: center; gap: 0.35rem; }
    `];

    /** The element's declarations now. */
    @property({ attribute: false }) declarations: Record<string, string | undefined> = {};
    /** A usable address for a picture in the preview, when `border-image-source`'s isn't. */
    @property({ type: String, attribute: 'preview-source' }) previewSource = '';

    /** Chosen before any source exists: which kind of source the editor is offering. */
    @state() private kind: 'picture' | 'gradient' | null = null;
    @state() private place: SidePlace = 'all';

    private get image(): BorderImage | null { return readBorderImage(this.declarations ?? {}); }

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
            if (!this.image || isGradientSource(this.image.source)) this.requestPicture();
        }
    }

    private requestPicture() {
        this.dispatchEvent(new CustomEvent('source-requested', { bubbles: true, composed: true }));
    }

    private previewStyle(image: BorderImage | null) {
        if (!image) return {};
        const change = writeBorderImage(image);
        const out: Record<string, string> = { ...change.set };
        if (this.previewSource && !isGradientSource(image.source)) out['border-image-source'] = `url("${this.previewSource.replace(/"/g, '%22')}")`;
        return out;
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
            </div>
            <div class="row"><span class="lbl"></span>
                ${renderPlaceToggle<SidePlace>({ kind: 'sides', value: this.place, own: new Set(), label: 'Slice: which side', onChange: place => { this.place = place; } })}
            </div>`;
    }

    render() {
        const image = this.image;
        const source = image?.source ?? '';
        const kind = image ? (isGradientSource(source) ? 'gradient' : 'picture') : this.kind;
        const picture = /^\s*url\(\s*(['"]?)(.*?)\1\s*\)/i.exec(source)?.[2] ?? '';
        const web = /^https?:\/\//i.test(picture);
        return html`
            <div class="stage"><div class="preview" part="preview" style=${styleMap(this.previewStyle(image))}>
                ${image ? 'Preview' : html`<p class="empty">Choose a picture or a gradient</p>`}</div></div>
            <div class="row"><span class="lbl">Draw it from</span>
                <juel-segmented class="kind" label="Draw it from" .value=${kind}
                    .options=${[{ value: 'picture', label: 'Picture' }, { value: 'gradient', label: 'Gradient' }]}
                    @value-changed=${(e: CustomEvent<{ value: 'picture' | 'gradient' }>) => this.chooseKind(e.detail.value)}></juel-segmented>
            </div>
            ${kind === 'picture' ? html`<div class="row"><span class="lbl"></span>
                    <juel-button type="light" class="choose-picture" glyph="lucide-image" label="Choose picture…" @click=${() => this.requestPicture()}></juel-button>
                    ${picture && !web ? html`<span class="source-name" title=${picture}>${picture.replace(/^.*\//, '')}</span>` : nothing}
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
            ${image ? html`
                ${kind === 'picture' ? this.renderSlice(image) : nothing}
                <div class="row" data-part="width"><span class="lbl">Width</span>
                    <juel-number class="width" slider hide-label label="Width" .units=${['px', 'em']} .text=${image.width}
                        .ranges=${{ px: { min: 1, max: 80, step: 1 }, em: { min: 0.1, max: 5, step: 0.05 } }}
                        @value-changed=${(e: CustomEvent<{ text: string }>) => { if (e.detail.text) this.change({ width: e.detail.text }, true); }}
                        @value-committed=${(e: CustomEvent<{ text: string }>) => { if (e.detail.text) this.change({ width: e.detail.text }); }}></juel-number>
                </div>
                <div class="row" data-part="outset"><span class="lbl">Reach out</span>
                    <juel-number class="outset" slider hide-label label="Reach out" .units=${['px', 'em']} .text=${image.outset} placeholder="0"
                        .ranges=${{ px: { min: 0, max: 60, step: 1 }, em: { min: 0, max: 4, step: 0.05 } }}
                        @value-changed=${(e: CustomEvent<{ text: string }>) => this.change({ outset: e.detail.text }, true)}
                        @value-committed=${(e: CustomEvent<{ text: string }>) => this.change({ outset: e.detail.text })}></juel-number>
                </div>
                ${kind === 'picture' ? html`<div class="row" data-part="repeat"><span class="lbl">Edges</span>
                    <juel-segmented class="repeat" label="Edges" .value=${image.repeat}
                        .options=${BorderImageRepeats.map(r => ({ value: r, label: RepeatLabels[r].label, title: RepeatLabels[r].title }))}
                        @value-changed=${(e: CustomEvent<{ value: BorderImageRepeat }>) => this.change({ repeat: e.detail.value })}></juel-segmented>
                </div>
                <div class="row"><span class="lbl"></span>
                    <label class="fill"><input type="checkbox" class="fill-middle" .checked=${image.fill}
                        @change=${(e: Event) => this.change({ fill: (e.target as HTMLInputElement).checked })}>Fill the middle with the picture</label>
                </div>` : nothing}` : nothing}`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-border-image-editor': JuelBorderImageEditor }
}
