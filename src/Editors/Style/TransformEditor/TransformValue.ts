// An element's transform as the parts juel-transform-editor shows, read from and written to CSS. Move,
// rotate (about Z) and scale are the individual properties (`translate`, `rotate`, `scale`), not
// `transform`: those are what drag handles write, and they combine with an animation that animates
// `transform` instead of being overridden by it. `rotate` holds one axis only, so rotate X and Y live in
// `transform`, as skew does, after anything else already there (a `matrix(…)` or `perspective(…)` is kept
// as `other`, never lost). Pure.

import { splitTopLevel } from '../ShadowEditor/ShadowValue';
import type { DeclarationChange } from '../SidesEditor/SidesValue';

export interface TransformParts {
    /** `translate`'s two parts; when `translate` can't be split (a formula, three values), `x` holds it all. */
    x: string;
    y: string;
    /** About X and Y, in `transform`. */
    rotateX: string;
    rotateY: string;
    /** About Z, the `rotate` property. */
    rotate: string;
    scale: string;
    skewX: string;
    skewY: string;
    /** What's in `transform` besides skew. */
    other: string;
    /** `transform-origin`. */
    origin: string;
}

/** The declarations the editor can write. */
export const TransformProperties = ['translate', 'rotate', 'scale', 'transform', 'transform-origin'] as const;

const Plain = /^-?(?:\d+\.?\d*|\.\d+)[a-z%]*$/i;

/** Whether a value is a plain number with a unit, which a slider can show (not a formula). */
export const isPlainLength = (value: string) => Plain.test(value.trim());

/** The functions in a `transform` value; null when it isn't only functions. */
function transformFunctions(value: string): { name: string; args: string }[] | null {
    const out: { name: string; args: string }[] = [];
    for (const token of splitTopLevel(value, ' ')) {
        const m = /^([a-z][a-z0-9]*)\((.*)\)$/i.exec(token);
        if (!m) return null;
        out.push({ name: m[1], args: m[2].trim() });
    }
    return out;
}

export function readTransform(declarations: Record<string, string | undefined>): TransformParts {
    const parts: TransformParts = {
        x: '', y: '', rotateX: '', rotateY: '', skewX: '', skewY: '', other: '',
        rotate: declarations.rotate?.trim() ?? '',
        scale: declarations.scale?.trim() ?? '',
        origin: declarations['transform-origin']?.trim() ?? '',
    };
    // `rotate: x 30deg` says one axis: it's that axis's slider, and is written back to `transform`.
    const axis = /^([xyz])\s+(\S+)$/i.exec(parts.rotate);
    const after = /^(\S+)\s+([xyz])$/i.exec(parts.rotate);
    const letter = (axis?.[1] ?? after?.[2])?.toLowerCase();
    if (letter) {
        const angle = axis?.[2] ?? after![1];
        parts.rotate = letter === 'z' ? angle : '';
        if (letter === 'x') parts.rotateX = angle;
        if (letter === 'y') parts.rotateY = angle;
    }

    const translate = declarations.translate?.trim() ?? '';
    const pieces = splitTopLevel(translate, ' ');
    if (pieces.length === 2 && pieces.every(isPlainLength)) [parts.x, parts.y] = pieces;
    else parts.x = translate;

    const transform = declarations.transform?.trim() ?? '';
    if (transform) {
        const functions = /^none$/i.test(transform) ? [] : transformFunctions(transform);
        if (!functions) parts.other = transform;
        else {
            const other: string[] = [];
            for (const { name, args } of functions) {
                const lower = name.toLowerCase();
                if (lower === 'rotatex' && !parts.rotateX) parts.rotateX = args;
                else if (lower === 'rotatey' && !parts.rotateY) parts.rotateY = args;
                else if (lower === 'skewx' && !parts.skewX) parts.skewX = args;
                else if (lower === 'skewy' && !parts.skewY) parts.skewY = args;
                else if (lower === 'skew' && !parts.skewX && !parts.skewY) {
                    const [a, b] = args.split(',').map(s => s.trim());
                    parts.skewX = a;
                    if (b && !/^0[a-z]*$/i.test(b)) parts.skewY = b;
                } else other.push(`${name}(${args})`);
            }
            parts.other = other.join(' ');
        }
    }
    return parts;
}

const isZero = (value: string) => /^-?0*\.?0*[a-z%]*$/i.test(value.trim()) && /\d/.test(value);

/** The declarations for `parts`: each written or cleared, so nothing stale is left behind. */
export function writeTransform(parts: TransformParts): DeclarationChange {
    const set: Record<string, string> = {};
    const clear: string[] = [];
    const put = (name: string, value: string) => { if (value) set[name] = value; else clear.push(name); };
    const { x, y } = parts;
    put('translate', y && !isZero(y) ? `${x || 0} ${y}` : x);
    put('rotate', parts.rotate);
    put('scale', parts.scale);
    const transform = [parts.other, parts.rotateX && `rotateX(${parts.rotateX})`, parts.rotateY && `rotateY(${parts.rotateY})`,
        parts.skewX && `skewX(${parts.skewX})`, parts.skewY && `skewY(${parts.skewY})`].filter(Boolean).join(' ');
    put('transform', transform);
    put('transform-origin', parts.origin);
    return { set, clear };
}
