// Four-sided CSS values (padding, margin, border-width, …, and four-corner border-radius): reading
// the shorthand and its longhands into four values, and writing the shortest CSS that says them,
// with the declarations to clear so leftovers don't override it. Pure, for juel-sides-editor and
// juel-border-editor (and unit-tested).

import { splitTopLevel } from '../ShadowEditor/ShadowValue';

/** The sides in CSS order. */
export const Sides = ['top', 'right', 'bottom', 'left'] as const;
export type Side = typeof Sides[number];
/** The corners in CSS order (`border-radius`). */
export const Corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const;
export type Corner = typeof Corners[number];

/** Four values, in CSS order; '' for one not set. */
export type FourValues = [string, string, string, string];

/** A shorthand's 1–4 values as four (CSS's rule: top, right = top, bottom = top, left = right). */
export function expandFour(value: string | null | undefined): FourValues | null {
  const parts = splitTopLevel((value ?? '').trim(), ' ');
  if (!parts.length || parts.length > 4) return null;
  const [t, r = t, b = t, l = r] = parts;
  return [t, r, b, l];
}

/** Four values as the shortest shorthand (1–4 values). All four must be set. */
export function compressFour([t, r, b, l]: FourValues): string {
  if (l === r) {
    if (b === t) return r === t ? t : `${t} ${r}`;
    return `${t} ${r} ${b}`;
  }
  return `${t} ${r} ${b} ${l}`;
}

/** The longhand for one place: `padding-top`, `border-top-width` (`suffix`), `border-top-left-radius`. */
export function longhand(prefix: string, place: string, suffix = ''): string {
  return `${prefix}-${place}${suffix ? `-${suffix}` : ''}`;
}

export interface FourSpec {
  /** The shorthand: `padding`, `margin`, `border-width`, `border-radius`. */
  shorthand: string;
  /** The longhands' prefix and suffix: `padding` + '' → `padding-top`; `border` + `width` → `border-top-width`. */
  prefix: string;
  suffix?: string;
  /** Corners (`border-radius`) rather than sides. */
  corners?: boolean;
}

/** The longhand names of a spec, in CSS order. */
export function longhands(spec: FourSpec): string[] {
  return (spec.corners ? Corners : Sides).map(place => longhand(spec.prefix, place, spec.suffix));
}

/** Reads a spec's four values from declarations: the shorthand, then each longhand over it. */
export function readFour(declarations: Record<string, string | undefined>, spec: FourSpec): FourValues {
  const out: FourValues = expandFour(declarations[spec.shorthand]) ?? ['', '', '', ''];
  longhands(spec).forEach((name, i) => {
    const v = declarations[name]?.trim();
    if (v) out[i] = v;
  });
  return out;
}

/** What an editor writes: the declarations to set and the ones to clear. */
export interface DeclarationChange {
  set: Record<string, string>;
  clear: string[];
}

/**
 * The shortest CSS for four values: the shorthand when all four are set (clearing the longhands),
 * longhands for those set when some aren't (clearing the shorthand and the rest), and everything
 * cleared when none is.
 */
export function writeFour(values: FourValues, spec: FourSpec): DeclarationChange {
  const names = longhands(spec);
  if (values.every(v => v.trim())) {
    return { set: { [spec.shorthand]: compressFour(values.map(v => v.trim()) as FourValues) }, clear: names };
  }
  const set: Record<string, string> = {};
  const clear = [spec.shorthand];
  values.forEach((v, i) => {
    if (v.trim()) set[names[i]] = v.trim();
    else clear.push(names[i]);
  });
  return { set, clear };
}

/** Merges changes in order: a later set wins over an earlier clear and the other way round. */
export function mergeChanges(...changes: DeclarationChange[]): DeclarationChange {
  const set: Record<string, string> = {};
  const clear = new Set<string>();
  for (const c of changes) {
    for (const name of c.clear) { delete set[name]; clear.add(name); }
    for (const [name, v] of Object.entries(c.set)) { set[name] = v; clear.delete(name); }
  }
  return { set, clear: [...clear] };
}

/** Whether the four values are all the same (the "All" toggle can show one value). */
export function allSame(values: FourValues): boolean {
  return values.every(v => v === values[0]);
}

const LengthRe = /^(-?\d*\.?\d+)([a-z%]*)$/i;

/** `12px` → 12 + px; `0` → 0 + ''; null for `auto` or anything not a number. */
export function splitLength(value: string): { value: number; unit: string } | null {
  const m = LengthRe.exec(value.trim());
  return m ? { value: parseFloat(m[1]), unit: m[2].toLowerCase() } : null;
}
