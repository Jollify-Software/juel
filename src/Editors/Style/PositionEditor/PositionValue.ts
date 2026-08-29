export type PositionUnit = 'percent' | 'px' | 'keyword';

export interface Fraction {
  /** Horizontal position, 0 = left edge, 1 = right edge. May fall outside [0,1]. */
  fx: number;
  /** Vertical position, 0 = top edge, 1 = bottom edge. May fall outside [0,1]. */
  fy: number;
}

export interface Box {
  width: number;
  height: number;
}

const X_KEYWORDS: Record<string, number> = { left: 0, center: 0.5, right: 1 };
const Y_KEYWORDS: Record<string, number> = { top: 0, center: 0.5, bottom: 1 };

function axisFromToken(
  token: string,
  keywords: Record<string, number>,
  size: number
): number | null {
  const t = token.trim().toLowerCase();
  if (t in keywords) {
    return keywords[t];
  }
  if (t.endsWith('%')) {
    const n = parseFloat(t);
    return Number.isFinite(n) ? n / 100 : null;
  }
  // Treat any remaining <length> as pixels (the only unit computed styles emit
  // for these properties). Divide by the reference size to get a fraction.
  const n = parseFloat(t);
  if (!Number.isFinite(n)) {
    return null;
  }
  return size > 0 ? n / size : 0;
}

/**
 * Parse a two-value CSS `<position>` (as accepted by `transform-origin`,
 * `object-position`, `background-position`, `perspective-origin`) into a
 * {@link Fraction}. Handles keywords, percentages and pixel lengths; a single
 * token sets X and leaves Y centred. Returns `null` if nothing usable parses.
 *
 * The 3-/4-token edge-offset syntax (`right 10px bottom 20%`) is not supported.
 */
export function parsePosition(
  value: string | null | undefined,
  box: Box
): Fraction | null {
  if (!value) {
    return null;
  }
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 2) {
    return null;
  }

  // A lone "top"/"bottom" keyword means the Y axis; everything else is X.
  if (tokens.length === 1) {
    const only = tokens[0].toLowerCase();
    if (only in Y_KEYWORDS && !(only in X_KEYWORDS)) {
      return { fx: 0.5, fy: Y_KEYWORDS[only] };
    }
    const fx = axisFromToken(tokens[0], X_KEYWORDS, box.width);
    return fx === null ? null : { fx, fy: 0.5 };
  }

  let [xt, yt] = tokens;
  // `top left` is legal — swap so X keyword is first.
  if (xt.toLowerCase() in Y_KEYWORDS && yt.toLowerCase() in X_KEYWORDS) {
    [xt, yt] = [yt, xt];
  }
  const fx = axisFromToken(xt, X_KEYWORDS, box.width);
  const fy = axisFromToken(yt, Y_KEYWORDS, box.height);
  if (fx === null || fy === null) {
    return null;
  }
  return { fx, fy };
}

function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function keywordFor(
  fraction: number,
  names: [string, string, string],
  threshold: number
): string | null {
  if (Math.abs(fraction - 0) <= threshold) return names[0];
  if (Math.abs(fraction - 0.5) <= threshold) return names[1];
  if (Math.abs(fraction - 1) <= threshold) return names[2];
  return null;
}

export interface FormatOptions {
  unit: PositionUnit;
  box: Box;
  /** Decimal places. Defaults: 2 for percent, 0 for px. */
  precision?: number;
  /** How close (in fraction units) a value must be to snap to a keyword. Default 0.02. */
  keywordThreshold?: number;
}

/**
 * Render a {@link Fraction} as a CSS position string in the requested unit.
 *
 * `keyword` snaps each axis to left/center/right and top/center/bottom; an axis
 * that is not close enough to an anchor falls back to a percentage for that axis
 * only (`left 30%` is valid CSS), and `center center` collapses to `center`.
 */
export function formatPosition(
  { fx, fy }: Fraction,
  { unit, box, precision, keywordThreshold = 0.02 }: FormatOptions
): string {
  if (unit === 'px') {
    const p = precision ?? 0;
    return `${round(fx * box.width, p)}px ${round(fy * box.height, p)}px`;
  }

  const p = precision ?? 2;
  const xPct = `${round(fx * 100, p)}%`;
  const yPct = `${round(fy * 100, p)}%`;

  if (unit === 'keyword') {
    const xk = keywordFor(fx, ['left', 'center', 'right'], keywordThreshold);
    const yk = keywordFor(fy, ['top', 'center', 'bottom'], keywordThreshold);
    if (xk === 'center' && yk === 'center') {
      return 'center';
    }
    return `${xk ?? xPct} ${yk ?? yPct}`;
  }

  return `${xPct} ${yPct}`;
}

export function clampFraction({ fx, fy }: Fraction): Fraction {
  return {
    fx: Math.min(1, Math.max(0, fx)),
    fy: Math.min(1, Math.max(0, fy)),
  };
}
