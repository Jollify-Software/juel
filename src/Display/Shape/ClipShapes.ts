/**
 * Built-in geometric shapes for `<juel-shape type="…">`.
 *
 * Every shape is expressed as a CSS `clip-path` value in a percentage
 * coordinate space (0–100, x → right, y → down) so it scales with the host
 * box with no JavaScript. Each entry also carries an explicit polygon point
 * list used for hover morphing (see `matchShapes`), because CSS only
 * interpolates `polygon()` → `polygon()` when both sides have the same number
 * of points.
 *
 * Consumers can add their own via `registerShape(name, points)`.
 */

export type ShapePoint = readonly [number, number];
export type ShapePoints = ReadonlyArray<ShapePoint>;

export interface ClipShape {
    /** Crisp CSS `clip-path` value for static rendering. */
    css: string;
    /** Polygon approximation (percentage space) for morph interpolation. */
    points: ShapePoints;
}

/** Serialise a percentage-space point list to a CSS `polygon()` value. */
export function pointsToPolygon(points: ShapePoints): string {
    const round = (n: number) => Math.round(n * 1000) / 1000;
    return `polygon(${points.map(([x, y]) => `${round(x)}% ${round(y)}%`).join(", ")})`;
}

/** Build a `ClipShape` whose `css` is the `polygon()` of its own points. */
function poly(points: ShapePoints): ClipShape {
    return { css: pointsToPolygon(points), points };
}

/** N-gon inscribed in the box, first vertex at top-centre, clockwise. */
function ngon(sides: number, radius = 50): ShapePoint[] {
    const pts: ShapePoint[] = [];
    for (let i = 0; i < sides; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
        pts.push([50 + radius * Math.cos(a), 50 + radius * Math.sin(a)]);
    }
    return pts;
}

/** M-pointed star, first point at top-centre. */
function star(points = 5, outer = 50, inner = outer * 0.4): ShapePoint[] {
    const pts: ShapePoint[] = [];
    for (let i = 0; i < points * 2; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / points;
        const r = i % 2 === 0 ? outer : inner;
        pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
    }
    return pts;
}

/**
 * A heart outline, sampled from the classic `x = 16sin³t`,
 * `y = 13cos t − 5cos2t − 2cos3t − cos4t` curve and stretched to fill the box.
 */
function heart(segments = 28): ShapePoint[] {
    const raw: [number, number][] = [];
    for (let i = 0; i < segments; i++) {
        const t = (i / segments) * 2 * Math.PI;
        const x = 16 * Math.sin(t) ** 3;
        // Flip y: screen space grows downward, so the cusp lands on top.
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        raw.push([x, y]);
    }
    const xs = raw.map((p) => p[0]);
    const ys = raw.map((p) => p[1]);
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
    const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
    return raw.map(([x, y]) => [
        ((x - minX) / (maxX - minX)) * 100,
        ((y - minY) / (maxY - minY)) * 100,
    ]);
}

const CIRCLE_SEGMENTS = 64;

const builtins: Record<string, ClipShape> = {
    rect: { css: "inset(0)", points: [[0, 0], [100, 0], [100, 100], [0, 100]] },
    square: { css: "inset(0)", points: [[0, 0], [100, 0], [100, 100], [0, 100]] },
    circle: { css: "circle(50%)", points: ngon(CIRCLE_SEGMENTS) },
    ellipse: { css: "ellipse(50% 50%)", points: ngon(CIRCLE_SEGMENTS) },

    triangle: poly([[50, 0], [100, 100], [0, 100]]),
    "triangle-down": poly([[0, 0], [100, 0], [50, 100]]),
    diamond: poly([[50, 0], [100, 50], [50, 100], [0, 50]]),
    rhombus: poly([[50, 0], [100, 50], [50, 100], [0, 50]]),
    pentagon: poly(ngon(5)),
    hexagon: poly([[50, 0], [100, 25], [100, 75], [50, 100], [0, 75], [0, 25]]),
    "hexagon-flat": poly([[25, 0], [75, 0], [100, 50], [75, 100], [25, 100], [0, 50]]),
    heptagon: poly(ngon(7)),
    octagon: poly([
        [30, 0], [70, 0], [100, 30], [100, 70],
        [70, 100], [30, 100], [0, 70], [0, 30],
    ]),

    star: poly(star(5)),
    "star-4": poly(star(4, 50, 16)),
    "star-6": poly(star(6)),
    "star-8": poly(star(8, 50, 27)),

    arrow: poly([
        [50, 0], [100, 50], [75, 50], [75, 100],
        [25, 100], [25, 50], [0, 50],
    ]),
    chevron: poly([
        [0, 0], [50, 0], [100, 50], [50, 100], [0, 100], [50, 50],
    ]),
    "tab": poly([[8, 0], [92, 0], [100, 22], [100, 100], [0, 100], [0, 22]]),
    trapezoid: poly([[20, 0], [80, 0], [100, 100], [0, 100]]),
    parallelogram: poly([[25, 0], [100, 0], [75, 100], [0, 100]]),
    "plus": poly([
        [35, 0], [65, 0], [65, 35], [100, 35], [100, 65], [65, 65],
        [65, 100], [35, 100], [35, 65], [0, 65], [0, 35], [35, 35],
    ]),
    "cross": poly([
        [35, 0], [65, 0], [65, 35], [100, 35], [100, 65], [65, 65],
        [65, 100], [35, 100], [35, 65], [0, 65], [0, 35], [35, 35],
    ]),

    heart: poly(heart()),
    kite: poly([[50, 0], [100, 38], [50, 100], [0, 38]]),
    gem: poly([[25, 0], [75, 0], [100, 38], [62, 100], [38, 100], [0, 38]]),
    shield: poly([
        [50, 0], [100, 15], [100, 52], [72, 85], [50, 100], [28, 85], [0, 52], [0, 15],
    ]),
    home: poly([[50, 0], [100, 40], [100, 100], [0, 100], [0, 40]]),
    bookmark: poly([[0, 0], [100, 0], [100, 100], [50, 68], [0, 100]]),
    speech: poly([
        [0, 0], [100, 0], [100, 70], [35, 70], [15, 100], [22, 70], [0, 70],
    ]),
    burst: poly(star(12, 50, 33)),
    seal: poly(star(16, 50, 42)),
};

/** Runtime-registered shapes (consumer extensions). */
const custom: Record<string, ClipShape> = {};

/**
 * Register a custom geometric shape, usable as `<juel-shape type="name">`.
 * Pass a percentage-space polygon point list, or a full `ClipShape`.
 */
export function registerShape(name: string, shape: ClipShape | ShapePoints): void {
    custom[name] = Array.isArray(shape) ? poly(shape as ShapePoints) : (shape as ClipShape);
}

/** Names of every geometric shape currently available. */
export function shapeNames(): string[] {
    return [...Object.keys(builtins), ...Object.keys(custom)];
}

/** Look up a geometric shape by name, or `null` if it isn't one. */
export function getClipShape(name: string | null | undefined): ClipShape | null {
    if (!name) return null;
    return custom[name] ?? builtins[name] ?? null;
}

// ---------------------------------------------------------------------------
// Morphing
// ---------------------------------------------------------------------------

/**
 * Grow a closed polygon to exactly `count` points **without moving any of the
 * originals** — each added point is the midpoint of whatever edge is currently
 * longest. Keeping the original corners crisp is what lets a rectangle morph
 * into a hexagon and still look like a rectangle and a hexagon at the ends.
 *
 * `count` must be >= `points.length` (callers use `max` of the two shapes).
 */
export function subdividePolygon(points: ShapePoints, count: number): ShapePoint[] {
    const pts: ShapePoint[] = points.map((p) => [p[0], p[1]]);
    const extra = count - pts.length;
    for (let e = 0; e < extra; e++) {
        let longest = 0;
        let longestLen = -1;
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (len > longestLen) {
                longestLen = len;
                longest = i;
            }
        }
        const a = pts[longest];
        const b = pts[(longest + 1) % pts.length];
        pts.splice(longest + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }
    return pts;
}

/** Total squared distance between two equal-length point lists. */
function pointDistance(a: ShapePoints, b: ShapePoints): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += (a[i][0] - b[i][0]) ** 2 + (a[i][1] - b[i][1]) ** 2;
    }
    return sum;
}

/**
 * Produce two `polygon()` strings with identical point counts and the best
 * rotational vertex alignment, so a CSS `clip-path` transition between them
 * animates smoothly instead of jumping.
 */
export function matchShapes(from: ClipShape, to: ClipShape): { from: string; to: string } {
    const count = Math.max(from.points.length, to.points.length, 3);
    const a = subdividePolygon(from.points, count);
    const bBase = subdividePolygon(to.points, count);

    // Try every rotation of `b` (and its reverse) to best line up with `a`.
    let best = bBase;
    let bestScore = Infinity;
    for (const seq of [bBase, [...bBase].reverse()]) {
        for (let r = 0; r < count; r++) {
            const rotated = seq.slice(r).concat(seq.slice(0, r));
            const score = pointDistance(a, rotated);
            if (score < bestScore) {
                bestScore = score;
                best = rotated;
            }
        }
    }
    return { from: pointsToPolygon(a), to: pointsToPolygon(best) };
}
