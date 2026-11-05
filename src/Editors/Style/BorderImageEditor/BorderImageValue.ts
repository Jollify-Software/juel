// A border drawn from a picture or gradient, read from and written to CSS. Pure, for
// juel-border-image-editor.
//
// `border-image` needs a border to draw on, so it's written with `border-style` and `border-width`,
// longhands: the `border` shorthand resets `border-image`, so a `border` written after it would wipe it.

import { borderNames } from '../BorderEditor/BorderValue';
import { expandFour, compressFour, Sides, type DeclarationChange, type FourValues, type Side } from '../SidesEditor/SidesValue';

export type BorderImageRepeat = 'stretch' | 'repeat' | 'round' | 'space';
export const BorderImageRepeats: readonly BorderImageRepeat[] = ['stretch', 'repeat', 'round', 'space'];

export interface BorderImage {
    /** `url(…)` or a gradient; '' for none. */
    source: string;
    /** The four slices (top, right, bottom, left), each `30%` or a number of the image's px. */
    slice: FourValues;
    /** Fill the middle with the picture's centre. */
    fill: boolean;
    /** The border's width (`border-width`): one to four lengths. */
    width: string;
    /** How wide the picture is drawn (`border-image-width`), one to four values; '' to match the border. */
    imageWidth: string;
    /** How far the image reaches outside the box: '', or one to four lengths. */
    outset: string;
    /** The top and bottom edges. */
    repeat: BorderImageRepeat;
    /** The left and right edges. */
    repeatSides: BorderImageRepeat;
}

/** An image's size in its own px, to turn a px slice into a place on the picture. */
export interface ImageSize { width: number; height: number }

const isRepeat = (value: string | undefined): value is BorderImageRepeat => BorderImageRepeats.includes(value as BorderImageRepeat);

/** A one-to-four-value property as shown for a place: '' for All when the sides differ. */
export function sideValue(value: string, place: 'all' | Side): string {
    const four = expandFour(value);
    if (!four) return '';
    if (place === 'all') return four.every(v => v === four[0]) ? four[0] : '';
    return four[Sides.indexOf(place)];
}

/** `value` with one place changed (All replaces it); `blank` is what a side with no value of its own says. */
export function withSide(value: string, place: 'all' | Side, text: string, blank: string): string {
    if (place === 'all') return text;
    const four = expandFour(value) ?? [blank, blank, blank, blank] as FourValues;
    four[Sides.indexOf(place)] = text || blank;
    return compressFour(four);
}

const sizeAlong = (side: Side, size: ImageSize) => side === 'top' || side === 'bottom' ? size.height : size.width;

/** How far in from its edge a slice cuts, as a fraction of the picture along that side (0 to 1). */
export function sliceFraction(slice: FourValues, side: Side, size: ImageSize): number {
    const text = slice[Sides.indexOf(side)];
    const value = parseFloat(text);
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, /%$/.test(text) ? value / 100 : value / (sizeAlong(side, size) || 1)));
}

/**
 * The slices after dragging one side's guide to `fraction`. `together` (All) moves all four, so none can
 * pass the middle; otherwise it stops at the opposite guide. Each value keeps its unit: `%`, or the image's
 * px as a bare number, whole numbers either way.
 */
export function moveSlice(slice: FourValues, side: Side, fraction: number, size: ImageSize, together: boolean): FourValues {
    const at = Sides.indexOf(side);
    const percent = /%$/.test(slice[at]);
    if (together) {
        const f = Math.min(0.5, Math.max(0, fraction));
        const value = percent
            ? `${Math.round(f * 100)}%`
            : `${Math.round(Math.min(f * sizeAlong(side, size), Math.min(size.width, size.height) / 2))}`;
        return [value, value, value, value];
    }
    const opposite = Sides[(at + 2) % 4];
    const f = Math.min(1 - sliceFraction(slice, opposite, size), Math.max(0, fraction));
    const next = [...slice] as FourValues;
    next[at] = percent ? `${Math.round(f * 100)}%` : `${Math.round(f * sizeAlong(side, size))}`;
    return next;
}

export const isGradientSource = (source: string) => /gradient\(/i.test(source);

/** A new border image's settings: a picture is cut in thirds and tiled, a gradient just stretched. */
export function defaultBorderImage(source: string, width = '16px'): BorderImage {
    const gradient = isGradientSource(source);
    const slice = gradient ? '1' : '33%';
    const repeat = gradient ? 'stretch' : 'round';
    return { source, slice: [slice, slice, slice, slice], fill: false, width, imageWidth: '', outset: '', repeat, repeatSides: repeat };
}

/** The border image the declarations say, or null when there's none. */
export function readBorderImage(declarations: Record<string, string | undefined>): BorderImage | null {
    const source = declarations['border-image-source']?.trim() ?? '';
    if (!source || /^none$/i.test(source)) return null;
    const sliceText = declarations['border-image-slice']?.trim() ?? '100%';
    const fill = /\bfill\b/i.test(sliceText);
    const slice = expandFour(sliceText.replace(/\bfill\b/gi, '').trim()) ?? (['100%', '100%', '100%', '100%'] as FourValues);
    const [first, second = first] = declarations['border-image-repeat']?.trim().toLowerCase().split(/\s+/) ?? [];
    return {
        source, slice, fill,
        width: declarations['border-width']?.trim() || '16px',
        imageWidth: declarations['border-image-width']?.trim() ?? '',
        outset: declarations['border-image-outset']?.trim() ?? '',
        repeat: isRepeat(first) ? first : 'stretch',
        repeatSides: isRepeat(second) ? second : 'stretch',
    };
}

/** Every border-image declaration, for clearing. */
export const BorderImageNames = ['border-image', 'border-image-source', 'border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat'];

/** The declarations for `image`; the other ways of writing a border are cleared, so none can override it. */
export function writeBorderImage(image: BorderImage): DeclarationChange {
    const set: Record<string, string> = {
        'border-style': 'solid',
        'border-width': image.width || '16px',
        'border-image-source': image.source,
        'border-image-slice': `${compressFour(image.slice)}${image.fill ? ' fill' : ''}`,
        'border-image-repeat': image.repeat === image.repeatSides ? image.repeat : `${image.repeat} ${image.repeatSides}`,
    };
    if (image.imageWidth) set['border-image-width'] = image.imageWidth;
    if (image.outset && !/^0[a-z]*$/i.test(image.outset)) set['border-image-outset'] = image.outset;
    return { set, clear: [...BorderImageNames, ...borderNames()].filter(name => !(name in set)) };
}

/** Takes the border image off, with the border it was drawn on. */
export function clearBorderImage(): DeclarationChange {
    return { set: {}, clear: [...BorderImageNames, ...borderNames()] };
}

export { Sides };
