// A border drawn from a picture or gradient, read from and written to CSS. Pure, for
// juel-border-image-editor.
//
// `border-image` needs a border to draw on, so it's written with `border-style` and `border-width`,
// longhands: the `border` shorthand resets `border-image`, so a `border` written after it would wipe it.

import { borderNames } from '../BorderEditor/BorderValue';
import { expandFour, compressFour, Sides, type DeclarationChange, type FourValues } from '../SidesEditor/SidesValue';

export type BorderImageRepeat = 'stretch' | 'repeat' | 'round' | 'space';
export const BorderImageRepeats: readonly BorderImageRepeat[] = ['stretch', 'repeat', 'round', 'space'];

export interface BorderImage {
    /** `url(…)` or a gradient; '' for none. */
    source: string;
    /** The four slices (top, right, bottom, left), each `30%` or a number of the image's px. */
    slice: FourValues;
    /** Fill the middle with the picture's centre. */
    fill: boolean;
    /** The border's width, a length. */
    width: string;
    /** How far the image reaches outside the box, a length. */
    outset: string;
    repeat: BorderImageRepeat;
}

export const isGradientSource = (source: string) => /gradient\(/i.test(source);

/** A new border image's settings: a picture is cut in thirds and tiled, a gradient just stretched. */
export function defaultBorderImage(source: string, width = '16px'): BorderImage {
    const gradient = isGradientSource(source);
    const slice = gradient ? '1' : '33%';
    return { source, slice: [slice, slice, slice, slice], fill: false, width, outset: '', repeat: gradient ? 'stretch' : 'round' };
}

/** The border image the declarations say, or null when there's none. */
export function readBorderImage(declarations: Record<string, string | undefined>): BorderImage | null {
    const source = declarations['border-image-source']?.trim() ?? '';
    if (!source || /^none$/i.test(source)) return null;
    const sliceText = declarations['border-image-slice']?.trim() ?? '100%';
    const fill = /\bfill\b/i.test(sliceText);
    const slice = expandFour(sliceText.replace(/\bfill\b/gi, '').trim()) ?? (['100%', '100%', '100%', '100%'] as FourValues);
    const repeat = (declarations['border-image-repeat']?.trim().toLowerCase().split(/\s+/)[0] ?? 'stretch') as BorderImageRepeat;
    return {
        source, slice, fill,
        width: declarations['border-width']?.trim() || '16px',
        outset: declarations['border-image-outset']?.trim() ?? '',
        repeat: BorderImageRepeats.includes(repeat) ? repeat : 'stretch',
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
        'border-image-repeat': image.repeat,
    };
    if (image.outset && !/^0[a-z]*$/i.test(image.outset)) set['border-image-outset'] = image.outset;
    return { set, clear: [...BorderImageNames, ...borderNames()].filter(name => !(name in set)) };
}

/** Takes the border image off, with the border it was drawn on. */
export function clearBorderImage(): DeclarationChange {
    return { set: {}, clear: [...BorderImageNames, ...borderNames()] };
}

export { Sides };
