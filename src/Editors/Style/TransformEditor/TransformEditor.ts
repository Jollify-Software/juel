import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../Number/Number';
import '../../PointSelector/PointSelector';
import '../../../Buttons/Button/Button';
import type { NumberRange } from '../../Number/Number';
import type { DeclarationChange } from '../SidesEditor/SidesValue';
import { isPlainLength, readTransform, writeTransform, type TransformParts } from './TransformValue';

/** `transform-changed`'s detail: the declarations to set and to clear; `preview` while a slider moves. */
export type TransformChangedDetail = DeclarationChange & { preview?: boolean };

type Part = 'x' | 'y' | 'rotate' | 'scale' | 'skewX' | 'skewY';

const Move: Record<string, NumberRange> = {
    vw: { min: -50, max: 50, step: 0.1 },
    vh: { min: -50, max: 50, step: 0.1 },
    px: { min: -500, max: 500, step: 1 },
    '%': { min: -100, max: 100, step: 1 },
};
const Turn: Record<string, NumberRange> = {
    deg: { min: -180, max: 180, step: 1 },
    turn: { min: -1, max: 1, step: 0.01 },
};
const Skew: Record<string, NumberRange> = { deg: { min: -45, max: 45, step: 1 } };

/** The CSS property that holds a part, for the calculator and the formula shown instead of a slider. */
const PropertyOf: Record<Part, string> = { x: 'translate', y: 'translate', rotate: 'rotate', scale: 'scale', skewX: 'transform', skewY: 'transform' };

/**
 * `<juel-transform-editor>` — an element's move, rotate, scale, skew and origin, each a slider, number
 * and unit on one row. It reads `declarations` (`translate`, `rotate`, `scale`, `transform`,
 * `transform-origin`) and fires `transform-changed` `{ set, clear, preview? }`: `preview` while a
 * slider moves, then once without it (one undo step). Move, rotate and scale are written as the
 * individual properties, which combine with an animation of `transform`; skew goes in `transform`,
 * after anything else already there, which is shown in a box of its own and never lost.
 *
 * A value a slider can't show (a formula such as `calc(…)`) is shown as text with a clear button.
 * `formulas` lists the properties with a calculator button, which fires `formula-requested`
 * `{ property }`: building the formula is the page's. **Origin** opens a `juel-point-selector` in `box`
 * mode (`aspect` is the element's width over its height), so the point is picked in place, with the
 * element itself in view.
 */
@customElement('juel-transform-editor')
export class JuelTransformEditor extends LitElement {
    static styles = css`
        :host { display: block; font-family: inherit; font-size: 0.8125rem; color: var(--juel-text, inherit); }
        .row { display: flex; align-items: center; gap: 0.4rem; min-height: 1.9rem; }
        .lbl { width: 3.6rem; flex: none; opacity: 0.75; }
        juel-number { flex: 1 1 auto; min-width: 0; }
        /* The sliders end level: the same width for every number and unit, and room for the tools. */
        juel-number::part(quantity) { width: 6.6rem; }
        juel-number::part(input) { min-width: 0; }
        juel-number::part(unit) { flex: 1 1 auto; }
        .tools { display: inline-flex; flex: none; justify-content: flex-end; min-width: 1.75rem; }
        juel-button.tool { --padding: 2px 4px; --font-size: 12px; flex: none; }
        .formula { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 0.75rem; opacity: 0.85; }
        .other { flex: 1 1 auto; min-width: 0; font: inherit; font-size: 0.75rem; padding: 3px 5px; box-sizing: border-box;
            border: 1px solid var(--juel-border, #ccc); border-radius: var(--juel-radius-sm, 4px);
            background: var(--juel-surface, Field); color: var(--juel-text, FieldText); }
        .origin-button { --padding: 2px 8px; --font-size: 0.75rem; }
        juel-point-selector { display: block; margin: 0.35rem 0 0.25rem; }
    `;

    /** The element's declarations now. */
    @property({ attribute: false }) declarations: Record<string, string | undefined> = {};
    /** The properties with a calculator button (`formula-requested`). */
    @property({ attribute: false }) formulas: readonly string[] = [];
    /** The element's width over its height, for the origin picker's box. */
    @property({ type: Number }) aspect = 1.6;
    /** How many px one of each unit is, so changing the unit keeps the distance (`juel-number`'s `basis`). */
    @property({ attribute: false }) basis?: Record<string, number>;

    @state() private originOpen = false;

    private get parts(): TransformParts { return readTransform(this.declarations ?? {}); }

    private emit(parts: TransformParts, preview = false) {
        this.dispatchEvent(new CustomEvent<TransformChangedDetail>('transform-changed', {
            detail: { ...writeTransform(parts), ...(preview ? { preview: true } : {}) }, bubbles: true, composed: true,
        }));
    }

    private set(part: keyof TransformParts, value: string, preview = false) {
        this.emit({ ...this.parts, [part]: value }, preview);
    }

    private tools(part: Part, value: string) {
        const property = PropertyOf[part];
        return html`<span class="tools">${this.formulas.includes(property) ? html`<juel-button type="plain" class="tool formula-button" glyph="lucide-calculator"
                button-label="Formula for ${property}" title="Build it from the deck's variables, so it changes as the deck plays"
                @click=${() => this.dispatchEvent(new CustomEvent('formula-requested', { detail: { property }, bubbles: true, composed: true }))}></juel-button>` : nothing}
            ${value && !isPlainLength(value) ? html`<juel-button type="plain" class="tool clear" glyph="lucide-x" button-label="Clear ${property}" title="Back to none"
                @click=${() => this.set(part, '')}></juel-button>` : nothing}</span>`;
    }

    /** One row: a slider, number and unit, or the formula as text when a slider can't show it. */
    private row(label: string, part: Part, value: string, units: string[], ranges: Record<string, NumberRange> | null, extra: { min?: number; max?: number; step?: number; fallback?: number; placeholder?: string } = {}) {
        const unit = /[a-z%]+$/i.exec(value)?.[0];
        return html`<div class="row" data-part=${part}><span class="lbl">${label}</span>
            ${value && !isPlainLength(value)
                ? html`<code class="formula" title=${value}>${value}</code>`
                : html`<juel-number class="part" slider hide-label label=${label} .units=${units} .unit=${unit && units.includes(unit) ? unit : units[0] ?? ''}
                    .text=${value} .ranges=${ranges ?? undefined} .basis=${units.includes('px') ? this.basis : undefined}
                    min=${extra.min ?? nothing} max=${extra.max ?? nothing} step=${extra.step ?? nothing}
                    .fallback=${extra.fallback ?? 0} placeholder=${extra.placeholder ?? '0'}
                    @value-changed=${(e: CustomEvent<{ text: string }>) => this.set(part, e.detail.text, true)}
                    @value-committed=${(e: CustomEvent<{ text: string }>) => this.set(part, e.detail.text)}></juel-number>`}
            ${this.tools(part, value)}
        </div>`;
    }

    render() {
        const p = this.parts;
        return html`
            ${p.y || !p.x || isPlainLength(p.x)
                ? html`${this.row('Move X', 'x', p.x, Object.keys(Move), Move)}${this.row('Move Y', 'y', p.y, Object.keys(Move), Move)}`
                : this.row('Move', 'x', p.x, Object.keys(Move), Move)}
            ${this.row('Rotate', 'rotate', p.rotate, Object.keys(Turn), Turn)}
            ${this.row('Scale', 'scale', p.scale, [], null, { min: 0, max: 3, step: 0.01, fallback: 1, placeholder: '1' })}
            ${this.row('Skew X', 'skewX', p.skewX, ['deg'], Skew)}
            ${this.row('Skew Y', 'skewY', p.skewY, ['deg'], Skew)}
            ${p.other ? html`<div class="row" data-part="other"><span class="lbl">Other</span>
                <input class="other" aria-label="Other transforms" title="Anything else in this element's transform" .value=${p.other}
                    @change=${(e: Event) => this.set('other', (e.target as HTMLInputElement).value.trim())}></div>` : nothing}
            <div class="row" data-part="origin"><span class="lbl">Origin</span>
                <juel-button type="light" class="origin-button" toggle ?pressed=${this.originOpen} glyph="lucide-locate-fixed" label=${p.origin || 'Centre'}
                    title="The point it rotates and scales around" @click=${() => { this.originOpen = !this.originOpen; }}></juel-button>
                ${p.origin ? html`<juel-button type="plain" class="tool clear-origin" glyph="lucide-x" button-label="Clear the origin" title="Back to the centre"
                    @click=${() => this.set('origin', '')}></juel-button>` : nothing}
            </div>
            ${this.originOpen ? html`<juel-point-selector box aspect=${this.aspect} .value=${p.origin || '50% 50%'}
                @point-preview=${(e: CustomEvent<{ value: string }>) => this.set('origin', e.detail.value, true)}
                @point-selected=${(e: CustomEvent<{ value: string }>) => this.set('origin', e.detail.value)}></juel-point-selector>` : nothing}`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-transform-editor': JuelTransformEditor }
}
