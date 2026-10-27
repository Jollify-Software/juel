// The pure parts of juel-move-handle and juel-rotate-handle: angles round a
// centre, snapping, and CSS `rotate` values. Unit-tested (tests/handles/).

export interface Point { x: number; y: number }

/** The angle of `point` seen from `center`, in degrees, clockwise from the x axis (screen y points down). */
export function angleAt(center: Point, point: Point): number {
    return Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
}

/** `angle` in (-180, 180]. */
export function normaliseAngle(angle: number): number {
    let a = angle % 360;
    if (a > 180) a -= 360;
    if (a <= -180) a += 360;
    return Object.is(a, -0) ? 0 : a;
}

/**
 * The angle after a drag round `center` from `from` to `to`, starting at `start` degrees: the start
 * plus the angle swept. `snap` (degrees, 0 for none) rounds the result to a multiple of it; otherwise
 * it is rounded to a tenth of a degree. Normalised to (-180, 180].
 */
export function dragAngle(start: number, center: Point, from: Point, to: Point, snap = 0): number {
    const swept = angleAt(center, to) - angleAt(center, from);
    const raw = normaliseAngle(start + swept);
    return normaliseAngle(snap > 0 ? Math.round(raw / snap) * snap : Math.round(raw * 10) / 10);
}

/** A CSS angle (`12deg`, `0.25turn`, `1rad`, `50grad`, or a bare number as degrees) in degrees; 0 when empty or unreadable. */
export function parseAngle(value: string | null | undefined): number {
    const m = /^\s*(-?\d*\.?\d+(?:e-?\d+)?)\s*(deg|turn|rad|grad)?\s*$/i.exec(value ?? '');
    if (!m) return 0;
    const n = Number(m[1]);
    switch ((m[2] ?? 'deg').toLowerCase()) {
        case 'turn': return n * 360;
        case 'rad': return n * 180 / Math.PI;
        case 'grad': return n * 0.9;
        default: return n;
    }
}

/** Degrees as a CSS `rotate` value (`12.5deg`), or '' for none (0). */
export function formatAngle(degrees: number): string {
    const a = Math.round(normaliseAngle(degrees) * 10) / 10;
    return a === 0 ? '' : `${a}deg`;
}
