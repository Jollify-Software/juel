export interface Shadow {
  inset: boolean;
  /** Offset X — a `<length>` (may be negative). */
  x: string;
  /** Offset Y — a `<length>` (may be negative). */
  y: string;
  /** Blur radius — a non-negative `<length>`. */
  blur: string;
  /** Spread radius — a `<length>` (may be negative). */
  spread: string;
  /** Colour. Empty string means "omit" (CSS defaults to `currentcolor`). */
  color: string;
}

export interface ShadowList {
  shadows: Shadow[];
}

/** Split on `sep` only where paren depth is zero (keeps `rgb(1, 2, 3)` intact). */
export function splitTopLevel(input: string, sep: ',' | ' '): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && (sep === ',' ? ch === ',' : /\s/.test(ch))) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const LENGTH_RE = /^-?(\d*\.?\d+)(px|em|rem|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q)?$/i;

function isLength(token: string): boolean {
  return token === '0' || LENGTH_RE.test(token);
}

function parseShadow(raw: string): Shadow | null {
  const tokens = splitTopLevel(raw, ' ');
  if (!tokens.length) return null;

  let inset = false;
  const lengths: string[] = [];
  const colorParts: string[] = [];
  for (const tk of tokens) {
    if (/^inset$/i.test(tk)) inset = true;
    else if (isLength(tk)) lengths.push(tk);
    else colorParts.push(tk);
  }
  if (lengths.length < 2) return null;

  return {
    inset,
    x: lengths[0],
    y: lengths[1],
    blur: lengths[2] ?? '0',
    spread: lengths[3] ?? '0',
    color: colorParts.join(' '),
  };
}

/** Parse a `box-shadow` value (one shadow, or a comma-separated list) into a {@link ShadowList}. */
export function parseShadowList(value: string | null | undefined): ShadowList | null {
  if (!value) return null;
  const v = value.trim();
  if (!v || v === 'none') return null;
  const shadows: Shadow[] = [];
  for (const raw of splitTopLevel(v, ',')) {
    const s = parseShadow(raw);
    if (s) shadows.push(s);
  }
  return shadows.length ? { shadows } : null;
}

export function num(len: string | undefined): number {
  if (!len) return 0;
  const n = parseFloat(len);
  return Number.isFinite(n) ? n : 0;
}

function nonZero(len: string): boolean {
  return num(len) !== 0;
}

export function shadowToString(s: Shadow): string {
  const bits: string[] = [];
  if (s.inset) bits.push('inset');
  bits.push(s.x, s.y);
  if (nonZero(s.blur) || nonZero(s.spread)) bits.push(s.blur);
  if (nonZero(s.spread)) bits.push(s.spread);
  if (s.color) bits.push(s.color);
  return bits.join(' ');
}

export function stringifyShadowList(model: ShadowList): string {
  return model.shadows.length ? model.shadows.map(shadowToString).join(', ') : 'none';
}

export function defaultShadow(): Shadow {
  return { inset: false, x: '0px', y: '4px', blur: '12px', spread: '0px', color: 'rgba(0, 0, 0, 0.25)' };
}

export function defaultShadowList(): ShadowList {
  return { shadows: [defaultShadow()] };
}

// --- colour + alpha helpers (box shadows almost always want an alpha) ---------

/** Pull an `rgb()/rgba()/#rrggbbaa` colour apart into an opaque form + its alpha (0–1). */
export function splitAlpha(color: string): { base: string; alpha: number } {
  const c = color.trim();
  let m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { base: `rgb(${m[1]}, ${m[2]}, ${m[3]})`, alpha: clamp01(a) };
  }
  m = c.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i);
  if (m) return { base: `#${m[1]}`, alpha: clamp01(parseInt(m[2], 16) / 255) };
  return { base: c || '#000000', alpha: 1 };
}

/** Combine an opaque colour string with an alpha into an `rgba()` string. */
export function withAlpha(base: string, alpha: number): string {
  const rgb = toRgb(base);
  if (!rgb) return base;
  const a = Math.round(clamp01(alpha) * 1000) / 1000;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
}

function toRgb(color: string): [number, number, number] | null {
  const h = color.trim();
  let m = h.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const [r, g, b] = m[1].split('');
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }
  m = h.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    return [
      parseInt(m[1].slice(0, 2), 16),
      parseInt(m[1].slice(2, 4), 16),
      parseInt(m[1].slice(4, 6), 16),
    ];
  }
  m = h.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])];
  return null;
}
