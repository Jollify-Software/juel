import {
    getClipShape,
    matchShapes,
    pointsToPolygon,
    registerShape,
    shapeNames,
    ShapePoints,
    subdividePolygon,
} from "../../src/Display/Shape/ClipShapes";

const perimeter = (pts: ShapePoints): number => {
    let p = 0;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        p += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return p;
};

describe("getClipShape", () => {
    it("returns built-ins with a css value and a polygon point list", () => {
        const hex = getClipShape("hexagon")!;
        expect(hex.css).toMatch(/^polygon\(/);
        expect(hex.points).toHaveLength(6);
    });

    it("keeps circle/ellipse as crisp CSS functions but still exposes points for morphing", () => {
        expect(getClipShape("circle")!.css).toBe("circle(50%)");
        expect(getClipShape("circle")!.points.length).toBeGreaterThan(16);
        expect(getClipShape("ellipse")!.css).toBe("ellipse(50% 50%)");
    });

    it("returns null for unknown names and nullish input", () => {
        expect(getClipShape("definitely-not-a-shape")).toBeNull();
        expect(getClipShape(null)).toBeNull();
        expect(getClipShape(undefined)).toBeNull();
    });

    it("exposes a star with 10 vertices, first point at top-centre", () => {
        const star = getClipShape("star")!;
        expect(star.points).toHaveLength(10);
        expect(star.points[0][0]).toBeCloseTo(50);
        expect(star.points[0][1]).toBeCloseTo(0);
    });

    it("exposes 4-, 6- and 8-point star variants (2 vertices per point)", () => {
        expect(getClipShape("star-4")!.points).toHaveLength(8);
        expect(getClipShape("star-6")!.points).toHaveLength(12);
        expect(getClipShape("star-8")!.points).toHaveLength(16);
        // 8-point star: alternating outer (r=50) / inner (r=27) radii from centre.
        const pts = getClipShape("star-8")!.points;
        const rOf = (p: readonly [number, number]) => Math.hypot(p[0] - 50, p[1] - 50);
        expect(rOf(pts[0])).toBeCloseTo(50);
        expect(rOf(pts[1])).toBeCloseTo(27);
    });

    it("every built-in resolves to a usable clip shape that fills the 0–100 box", () => {
        const BUILTINS = [
            "rect", "square", "circle", "ellipse", "triangle", "triangle-down",
            "diamond", "rhombus", "kite", "pentagon", "hexagon", "hexagon-flat",
            "heptagon", "octagon", "star", "star-4", "star-6", "star-8", "burst",
            "seal", "arrow", "chevron", "tab", "trapezoid", "parallelogram",
            "gem", "shield", "home", "bookmark", "heart", "speech", "plus", "cross",
        ];
        for (const name of BUILTINS) {
            const s = getClipShape(name);
            expect(s).not.toBeNull();
            expect(s!.css).toMatch(/^(polygon|circle|ellipse|inset)\(/);
            expect(s!.points.length).toBeGreaterThanOrEqual(3);
            for (const [x, y] of s!.points) {
                expect(x).toBeGreaterThanOrEqual(-0.01);
                expect(x).toBeLessThanOrEqual(100.01);
                expect(y).toBeGreaterThanOrEqual(-0.01);
                expect(y).toBeLessThanOrEqual(100.01);
            }
            expect(shapeNames()).toContain(name);
        }
    });

    it("the heart curve is a closed loop stretched to the full box", () => {
        const h = getClipShape("heart")!;
        expect(h.points.length).toBeGreaterThanOrEqual(20);
        const xs = h.points.map((p) => p[0]);
        const ys = h.points.map((p) => p[1]);
        expect(Math.min(...xs)).toBeCloseTo(0);
        expect(Math.max(...xs)).toBeCloseTo(100);
        expect(Math.min(...ys)).toBeCloseTo(0);
        expect(Math.max(...ys)).toBeCloseTo(100);
        // symmetric about the vertical centre-line
        expect(xs.reduce((a, b) => a + b, 0) / xs.length).toBeCloseTo(50, 0);
    });
});

describe("registerShape", () => {
    it("accepts a bare point list and makes it resolvable by name", () => {
        registerShape("test-wedge", [[0, 0], [100, 0], [0, 100]]);
        const s = getClipShape("test-wedge")!;
        expect(s.css).toBe("polygon(0% 0%, 100% 0%, 0% 100%)");
        expect(shapeNames()).toContain("test-wedge");
    });

    it("accepts a full ClipShape (custom css)", () => {
        registerShape("test-native", { css: "circle(40%)", points: [[50, 10], [90, 50], [50, 90], [10, 50]] });
        expect(getClipShape("test-native")!.css).toBe("circle(40%)");
    });
});

describe("pointsToPolygon", () => {
    it("formats percentage pairs and rounds to 3dp", () => {
        expect(pointsToPolygon([[0, 0], [100, 33.333333], [50.5, 100]]))
            .toBe("polygon(0% 0%, 100% 33.333%, 50.5% 100%)");
    });
});

describe("subdividePolygon", () => {
    it("returns a copy unchanged when the count already matches", () => {
        const tri: ShapePoints = [[50, 0], [100, 100], [0, 100]];
        const out = subdividePolygon(tri, 3);
        expect(out).toEqual(tri);
        expect(out).not.toBe(tri);
    });

    it("grows to the requested count while preserving the perimeter and every original vertex", () => {
        const square: ShapePoints = [[0, 0], [100, 0], [100, 100], [0, 100]];
        const out = subdividePolygon(square, 12);
        expect(out).toHaveLength(12);
        expect(perimeter(out)).toBeCloseTo(perimeter(square), 5);
        for (const corner of square) {
            expect(out.some((p) => p[0] === corner[0] && p[1] === corner[1])).toBe(true);
        }
    });

    it("splits the longest edges first (balanced subdivision)", () => {
        // One long edge, two short: the extra point lands on the long edge.
        const out = subdividePolygon([[0, 0], [100, 0], [90, 10]], 4);
        expect(out).toContainEqual([50, 0]);
    });
});

describe("matchShapes", () => {
    it("emits two polygons with identical vertex counts", () => {
        const { from, to } = matchShapes(getClipShape("rect")!, getClipShape("hexagon")!);
        const count = (s: string) => s.split(",").length;
        expect(count(from)).toBe(count(to));
        expect(from).toMatch(/^polygon\(/);
        expect(to).toMatch(/^polygon\(/);
    });

    it("uses the larger of the two point counts", () => {
        const { from } = matchShapes(getClipShape("triangle")!, getClipShape("octagon")!);
        expect(from.split(",")).toHaveLength(8);
    });

    it("aligns vertices so a shape matched against itself is (near) identity", () => {
        const hex = getClipShape("hexagon")!;
        const { from, to } = matchShapes(hex, hex);
        expect(from).toBe(to);
    });
});
