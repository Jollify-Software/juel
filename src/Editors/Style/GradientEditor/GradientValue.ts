export type GradientKind = 'linear' | 'radial' | 'conic';

export interface ColorStop {
  kind: 'stop';
  color: string;
  /** First position — `<length-percentage>` (linear/radial) or `<angle>` (conic). */
  pos?: string;
  /** Second position of a double-position stop (`red 20% 40%`). */
  pos2?: string;
}

/** A bare `<length-percentage>`/`<angle>` between two stops — the interpolation midpoint. */
export interface ColorHint {
  kind: 'hint';
  hint: string;
}

export type StopEntry = ColorStop | ColorHint;

export interface GradientLayer {
  type: 'gradient';
  kind: GradientKind;
  repeating: boolean;
  /** linear: `45deg` | `to top right`. */
  angle?: string;
  /** radial: `circle` | `ellipse`. */
  shape?: string;
  /** radial: `farthest-corner` | `closest-side` | `50px` | `40% 60%`. */
  size?: string;
  /** radial / conic: the `<position>` after `at`. */
  position?: string;
  /** conic: the `<angle>` after `from`. */
  from?: string;
  /** colour interpolation method, e.g. `in oklch`, `in hsl longer hue`. */
  interpolation?: string;
  stops: StopEntry[];
}

/** A flat colour layer. Serialised as `linear-gradient(<c>, <c>)` (valid in `background-image`). */
export interface SolidLayer {
  type: 'solid';
  color: string;
}

export type Layer = GradientLayer | SolidLayer;

export interface LayeredGradient {
  layers: Layer[];
}

// --- splitting helpers ---------------------------------------------------

/** Split on `sep` only where paren depth is zero. */
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

const LENGTH_RE = /^-?[\d.]+(px|%|em|rem|vw|vh|vmin|vmax|fr|ch|ex|cm|mm|in|pt|pc|q)?$/i;
const ANGLE_RE = /^-?[\d.]+(deg|grad|rad|turn)$/i;
const NUMBERISH_RE = /^-?[\d.]+(px|%|em|rem|vw|vh|vmin|vmax|fr|ch|ex|cm|mm|in|pt|pc|q|deg|grad|rad|turn)?$/i;

// --- parsing -----------------------------------------------------------

function parseStops(parts: string[]): StopEntry[] {
  const stops: StopEntry[] = [];
  for (const part of parts) {
    const tokens = splitTopLevel(part, ' ');
    const positions: string[] = [];
    while (tokens.length && NUMBERISH_RE.test(tokens[tokens.length - 1])) {
      positions.unshift(tokens.pop() as string);
      if (positions.length === 2) break;
    }
    const color = tokens.join(' ').trim();
    if (!color) {
      // All-numeric part between two stops -> interpolation hint.
      if (positions.length) stops.push({ kind: 'hint', hint: positions.join(' ') });
      continue;
    }
    const stop: ColorStop = { kind: 'stop', color };
    if (positions[0]) stop.pos = positions[0];
    if (positions[1]) stop.pos2 = positions[1];
    stops.push(stop);
  }
  return stops;
}

function looksLikeConfig(kind: GradientKind, token: string): boolean {
  const t = token.toLowerCase().trim();
  const t0 = splitTopLevel(t, ' ')[0] || '';
  // Leading keyword: `to …`, `at …`, `from …`, `in …`.
  if (/^(to|at|from|in)$/.test(t0)) return true;
  // Leading angle (`45deg`, or `45deg in oklch`).
  if (ANGLE_RE.test(t0)) return true;
  // A colour-interpolation method anywhere in the part.
  if (/\bin\s+[a-z]/.test(t)) return true;
  if (kind === 'radial') {
    if (/^(circle|ellipse)$/.test(t0)) return true;
    if (/^(closest|farthest)-(side|corner)$/.test(t0)) return true;
    // A leading length/percentage is a radial size, not a colour.
    if (LENGTH_RE.test(t0)) return true;
  }
  return false;
}

function parseGradientConfig(kind: GradientKind, cfg: string, layer: GradientLayer): void {
  let rest = cfg.trim();

  const inMatch = rest.match(/\bin\s+([a-z0-9-]+(?:\s+(?:longer|shorter|increasing|decreasing)\s+hue)?)\s*$/i);
  if (inMatch) {
    layer.interpolation = `in ${inMatch[1]}`;
    rest = rest.slice(0, inMatch.index).trim();
  }

  const atMatch = rest.match(/\bat\s+(.+)$/i);
  if (atMatch) {
    layer.position = atMatch[1].trim();
    rest = rest.slice(0, atMatch.index).trim();
  }

  if (kind === 'linear') {
    if (rest) layer.angle = rest;
    return;
  }
  if (kind === 'conic') {
    const fromMatch = rest.match(/\bfrom\s+(.+)$/i);
    if (fromMatch) layer.from = fromMatch[1].trim();
    return;
  }
  // radial: what's left is [shape] [size]
  const toks = splitTopLevel(rest, ' ');
  const sizeToks: string[] = [];
  for (const tk of toks) {
    if (/^(circle|ellipse)$/i.test(tk)) layer.shape = tk.toLowerCase();
    else sizeToks.push(tk);
  }
  if (sizeToks.length) layer.size = sizeToks.join(' ');
}

function parseLayer(raw: string): Layer | null {
  const str = raw.trim();
  const m = str.match(/^(repeating-)?(linear|radial|conic)-gradient\s*\(([\s\S]*)\)$/i);
  if (!m) return null;
  const repeating = !!m[1];
  const kind = m[2].toLowerCase() as GradientKind;
  const parts = splitTopLevel(m[3], ',');
  if (parts.length === 0) return null;

  const layer: GradientLayer = { type: 'gradient', kind, repeating, stops: [] };
  let stopParts = parts;
  if (looksLikeConfig(kind, parts[0])) {
    parseGradientConfig(kind, parts[0], layer);
    stopParts = parts.slice(1);
  }
  layer.stops = parseStops(stopParts);

  // A plain 2-stop linear gradient with one colour and no geometry is a flat fill.
  if (
    kind === 'linear' &&
    !repeating &&
    !layer.angle &&
    !layer.interpolation &&
    layer.stops.length === 2 &&
    layer.stops.every((s) => s.kind === 'stop' && !s.pos) &&
    (layer.stops[0] as ColorStop).color === (layer.stops[1] as ColorStop).color
  ) {
    return { type: 'solid', color: (layer.stops[0] as ColorStop).color };
  }
  return layer;
}

/**
 * Parse a `background-image`-style value (one gradient, or a comma-separated
 * stack) into a {@link LayeredGradient}. Non-gradient layers (e.g. `url(...)`)
 * are dropped. Returns `null` if nothing parses.
 */
export function parseLayeredGradient(value: string | null | undefined): LayeredGradient | null {
  if (!value) return null;
  const v = value.trim();
  if (!v || v === 'none') return null;
  const layers: Layer[] = [];
  for (const raw of splitTopLevel(v, ',')) {
    const layer = parseLayer(raw);
    if (layer) layers.push(layer);
  }
  return layers.length ? { layers } : null;
}

// --- serialising -----------------------------------------------------

function stopToString(s: StopEntry): string {
  if (s.kind === 'hint') return s.hint;
  return [s.color, s.pos, s.pos2].filter(Boolean).join(' ');
}

function gradientConfigString(layer: GradientLayer): string {
  const bits: string[] = [];
  if (layer.kind === 'linear') {
    if (layer.angle) bits.push(layer.angle);
  } else if (layer.kind === 'radial') {
    const geo = [layer.shape, layer.size].filter(Boolean).join(' ');
    if (geo) bits.push(geo);
    if (layer.position) bits.push(`at ${layer.position}`);
  } else {
    if (layer.from) bits.push(`from ${layer.from}`);
    if (layer.position) bits.push(`at ${layer.position}`);
  }
  let cfg = bits.join(' ');
  if (layer.interpolation) cfg = cfg ? `${cfg} ${layer.interpolation}` : layer.interpolation;
  return cfg;
}

export function layerToString(layer: Layer): string {
  if (layer.type === 'solid') {
    return `linear-gradient(${layer.color}, ${layer.color})`;
  }
  const fn = `${layer.repeating ? 'repeating-' : ''}${layer.kind}-gradient`;
  const cfg = gradientConfigString(layer);
  const stops = layer.stops.map(stopToString).join(', ');
  return `${fn}(${cfg ? `${cfg}, ` : ''}${stops})`;
}

export function stringifyLayeredGradient(model: LayeredGradient): string {
  return model.layers.map(layerToString).join(', ');
}

// --- construction helpers ------------------------------------------

export function defaultGradientLayer(kind: GradientKind = 'linear'): GradientLayer {
  const base: GradientLayer = {
    type: 'gradient',
    kind,
    repeating: false,
    stops: [
      { kind: 'stop', color: '#4f46e5', pos: '0%' },
      { kind: 'stop', color: '#06b6d4', pos: '100%' },
    ],
  };
  if (kind === 'linear') base.angle = '90deg';
  if (kind === 'radial') base.position = 'center';
  if (kind === 'conic') {
    base.from = '0deg';
    base.position = 'center';
  }
  return base;
}

export function defaultLayeredGradient(): LayeredGradient {
  return { layers: [defaultGradientLayer('linear')] };
}

/** Insert a stop at `percent` (0–100) into a gradient layer, keeping stops ordered. Returns its index. */
export function insertStop(layer: GradientLayer, percent: number, color: string): number {
  const clamped = Math.min(100, Math.max(0, percent));
  const stop: ColorStop = { kind: 'stop', color, pos: `${round(clamped, 2)}%` };
  let idx = layer.stops.length;
  for (let i = 0; i < layer.stops.length; i++) {
    const s = layer.stops[i];
    if (s.kind === 'stop' && parsePercent(s.pos) > clamped) {
      idx = i;
      break;
    }
  }
  layer.stops.splice(idx, 0, stop);
  return idx;
}

export function parsePercent(pos: string | undefined): number {
  if (!pos) return 0;
  const n = parseFloat(pos);
  return Number.isFinite(n) ? n : 0;
}

export function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
