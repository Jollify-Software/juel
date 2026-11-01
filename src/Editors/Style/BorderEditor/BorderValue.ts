// CSS borders as four sides (width, style, colour each): read from every way CSS can say them, and
// written back as the shortest CSS (`border` when all four match, else `border-<side>`), with every
// declaration to clear so a leftover can't override the new value. Pure, for juel-border-editor.

import { splitTopLevel } from '../ShadowEditor/ShadowValue';
import { Sides, expandFour, type DeclarationChange, type Side } from '../SidesEditor/SidesValue';

/** One side's border; '' for a part not set. */
export interface BorderSide {
  width: string;
  style: string;
  color: string;
}
export type BorderSides = Record<Side, BorderSide>;

/** The styles offered, in the order shown. (The legacy editor had no `solid`.) */
export const BorderStyles = ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'] as const;
const StyleSet = new Set<string>([...BorderStyles, 'hidden']);
const WidthKeyword = /^(thin|medium|thick)$/i;
const Length = /^-?(\d*\.?\d+)([a-z%]*)$/i;

export const emptySide = (): BorderSide => ({ width: '', style: '', color: '' });
export const emptySides = (): BorderSides => ({ top: emptySide(), right: emptySide(), bottom: emptySide(), left: emptySide() });

/** A `border` / `border-<side>` value as its parts (any order; missing parts ''). `none` alone is style none. */
export function parseBorder(value: string | undefined): BorderSide | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const side = emptySide();
  const color: string[] = [];
  for (const token of splitTopLevel(v, ' ')) {
    if (StyleSet.has(token.toLowerCase()) && !side.style) side.style = token.toLowerCase();
    else if ((Length.test(token) || WidthKeyword.test(token)) && !side.width) side.width = token;
    else color.push(token);
  }
  side.color = color.join(' ');
  return side;
}

/** A side as a `border` value: its parts that are set, width style colour; '' when none is. */
export function borderText(side: BorderSide): string {
  return [side.width, side.style, side.color].filter(Boolean).join(' ');
}

const sameSide = (a: BorderSide, b: BorderSide) => a.width === b.width && a.style === b.style && a.color === b.color;
const isSet = (side: BorderSide) => !!(side.width || side.style || side.color);

/** Every declaration name a border can be written with (what a write clears). */
export function borderNames(): string[] {
  const names = ['border', 'border-width', 'border-style', 'border-color'];
  for (const side of Sides) names.push(`border-${side}`, `border-${side}-width`, `border-${side}-style`, `border-${side}-color`);
  return names;
}

/**
 * The four sides the declarations say, applied in the order a stylesheet would most likely have
 * them: `border`, then the `border-width/-style/-color` lists, then `border-<side>`, then the
 * `border-<side>-width/-style/-color` longhands.
 */
export function readBorder(declarations: Record<string, string | undefined>): BorderSides {
  const sides = emptySides();
  const all = parseBorder(declarations.border);
  if (all) for (const side of Sides) sides[side] = { ...all };
  for (const part of ['width', 'style', 'color'] as const) {
    const four = expandFour(declarations[`border-${part}`]);
    if (four) Sides.forEach((side, i) => { sides[side][part] = part === 'style' ? four[i].toLowerCase() : four[i]; });
  }
  for (const side of Sides) {
    const own = parseBorder(declarations[`border-${side}`]);
    if (own) sides[side] = own;
    for (const part of ['width', 'style', 'color'] as const) {
      const v = declarations[`border-${side}-${part}`]?.trim();
      if (v) sides[side][part] = part === 'style' ? v.toLowerCase() : v;
    }
  }
  return sides;
}

/**
 * The shortest CSS for four sides: `border` when all four are the same and set; otherwise a
 * `border-<side>` for each side that's set. Everything else a border can be written with is cleared.
 */
export function writeBorder(sides: BorderSides): DeclarationChange {
  const names = borderNames();
  const first = sides.top;
  if (isSet(first) && Sides.every(side => sameSide(sides[side], first))) {
    return { set: { border: borderText(first) }, clear: names.filter(n => n !== 'border') };
  }
  const set: Record<string, string> = {};
  for (const side of Sides) if (isSet(sides[side])) set[`border-${side}`] = borderText(sides[side]);
  return { set, clear: names.filter(n => !(n in set)) };
}

/** Whether all four sides are the same (the "All" toggle can show one value). */
export function sidesAlike(sides: BorderSides): boolean {
  return Sides.every(side => sameSide(sides[side], sides.top));
}
