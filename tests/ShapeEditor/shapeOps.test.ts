import { DefaultStyle, markBox, moveMark, pathData, shapeToSvg, type BoxMark, type Mark, type PathMark, type PathNode, type Pt } from '../../src/Editors/ShapeEditor/shapeModel';
import { combineMarks, isClosedShape, outlinesToNodes, rubOutPath, traceOutlines } from '../../src/Editors/ShapeEditor/shapeOps';
import { presetNodes, Presets } from '../../src/Editors/ShapeEditor/shapePresets';
import { parseShapeSvg } from '../../src/Editors/ShapeEditor/shapeSvg';

const rect = (x: number, y: number, w: number, h: number, over: Partial<BoxMark> = {}): BoxMark => ({ id: 'r', kind: 'rect', ...DefaultStyle, x, y, w, h, ...over });
const ellipse = (x: number, y: number, w: number, h: number): BoxMark => ({ id: 'e', kind: 'ellipse', ...DefaultStyle, x, y, w, h });
const line = (over: Partial<PathMark> = {}): PathMark => ({ id: 'p', kind: 'path', ...DefaultStyle, fill: null, closed: false, nodes: [{ x: 0, y: 0 }, { x: 100, y: 0 }], ...over });
const ids = (i: number) => `n${i}`;

function curvePoint(a: PathNode, b: PathNode, t: number): Pt {
    const c1 = a.out ?? a, c2 = b.in ?? b, u = 1 - t;
    return {
        x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
    };
}

/** The outline as many points, whichever way its curves go. */
function outline(nodes: PathNode[]): Pt[] {
    return nodes.flatMap((a, i) => {
        const b = nodes[(i + 1) % nodes.length];
        return Array.from({ length: 32 }, (_, k) => curvePoint(a, b, k / 32));
    });
}
const signedArea = (loop: Pt[]) => loop.reduce((sum, p, i) => { const q = loop[(i + 1) % loop.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2;
/** The area painted: outlines facing opposite ways take from each other, as SVG's fill does. */
const area = (m: PathMark) => Math.abs([m.nodes, ...(m.more ?? [])].reduce((sum, nodes) => sum + signedArea(outline(nodes)), 0));

function combined(marks: Mark[], op: 'join' | 'cut'): PathMark {
    const result = combineMarks(marks, op);
    if (!result.ok) throw new Error(`expected a result, got ${result.reason}`);
    return result.mark!;
}

describe('rubbing out part of a line', () => {
    test('a stroke across the middle leaves two pieces', () => {
        const pieces = rubOutPath(line(), { x: 50, y: -20 }, { x: 50, y: 20 }, 5, ids)!;
        expect(pieces).toHaveLength(2);
        expect(pieces[0].id).toBe('p');
        expect(pieces[1].id).toBe('n1');
        expect(pieces[0].nodes[0]).toMatchObject({ x: 0, y: 0 });
        expect(pieces[0].nodes[1].x).toBeCloseTo(45, 1);
        expect(pieces[1].nodes[0].x).toBeCloseTo(55, 1);
        expect(pieces[1].nodes[1]).toMatchObject({ x: 100, y: 0 });
    });

    test('a stroke that misses says so, and rubbing all of it leaves nothing', () => {
        expect(rubOutPath(line(), { x: 50, y: 40 }, { x: 60, y: 40 }, 5, ids)).toBeNull();
        expect(rubOutPath(line(), { x: 0, y: 0 }, { x: 100, y: 0 }, 5, ids)).toEqual([]);
    });

    test('off one end leaves one piece, with the same look and no little leftover', () => {
        const pieces = rubOutPath(line({ stroke: '#ff0000', width: 7, dash: 'dashed' }), { x: 100, y: 0 }, { x: 90, y: 0 }, 2, ids)!;
        expect(pieces).toHaveLength(1);
        expect(pieces[0]).toMatchObject({ stroke: '#ff0000', width: 7, dash: 'dashed' });
        expect(pieces[0].nodes[1].x).toBeCloseTo(88, 1);
        const crumb = rubOutPath(line(), { x: 5, y: -9 }, { x: 5, y: 9 }, 4.8, ids)!;
        expect(crumb).toHaveLength(1);
        expect(crumb[0].nodes[0].x).toBeCloseTo(9.8, 1);
    });

    test('the arrowhead stays on the piece with the end of the line', () => {
        const pieces = rubOutPath(line({ arrow: true }), { x: 50, y: -20 }, { x: 50, y: 20 }, 5, ids)!;
        expect(pieces.map(p => !!p.arrow)).toEqual([false, true]);
        const noTip = rubOutPath(line({ arrow: true }), { x: 95, y: -20 }, { x: 95, y: 20 }, 10, ids)!;
        expect(noTip.map(p => !!p.arrow)).toEqual([false]);
    });

    test('a curve stays on the curve it was', () => {
        const curve = line({ nodes: [{ x: 0, y: 0, out: { x: 0, y: 100 } }, { x: 100, y: 0, in: { x: 100, y: 100 } }] });
        const pieces = rubOutPath(curve, { x: 50, y: 60 }, { x: 50, y: 90 }, 5, ids)!;
        expect(pieces).toHaveLength(2);
        const whole = Array.from({ length: 500 }, (_, k) => curvePoint(curve.nodes[0], curve.nodes[1], k / 499));
        for (const piece of pieces) {
            expect(piece.nodes[0].out).toBeDefined();
            for (let k = 0; k <= 16; k++) {
                const p = curvePoint(piece.nodes[0], piece.nodes[1], k / 16);
                expect(Math.min(...whole.map(q => Math.hypot(p.x - q.x, p.y - q.y)))).toBeLessThan(0.4);
            }
        }
    });

    test('a closed outline opens where it was rubbed, in one piece, and joins up past its start', () => {
        const square = line({ closed: true, nodes: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] });
        const pieces = rubOutPath(square, { x: 50, y: 90 }, { x: 50, y: 110 }, 5, ids)!;
        expect(pieces).toHaveLength(1);
        expect(pieces[0].closed).toBe(false);
        expect(pieces[0].fill).toBeNull();
        // It starts just past the gap, and runs round through the old first point to the other side of the gap.
        expect(pieces[0].nodes[0].x).toBeCloseTo(45, 1);
        expect(pieces[0].nodes[pieces[0].nodes.length - 1].x).toBeCloseTo(55, 1);
        expect(pieces[0].nodes).toHaveLength(6);
    });
});

describe('join and cut out', () => {
    test('two overlapping squares join into one outline', () => {
        const mark = combined([rect(0, 0, 100, 100), rect(50, 50, 100, 100, { id: 's', fill: '#ff0000' })], 'join');
        expect(mark.more).toBeUndefined();
        expect(area(mark)).toBeCloseTo(17500, 0);
        expect(mark.nodes).toHaveLength(8);
        // The look and the id are the first one's.
        expect(mark.id).toBe('r');
        expect(mark.fill).toBe(DefaultStyle.fill);
    });

    test('squares side by side lose the wall between them', () => {
        const mark = combined([rect(0, 0, 100, 100), rect(100, 0, 100, 100, { id: 's' })], 'join');
        expect(mark.more).toBeUndefined();
        expect(area(mark)).toBeCloseTo(20000, 0);
        expect(markBox(mark)).toEqual({ x: 0, y: 0, w: 200, h: 100 });
        // One straight run along the top, however it was split.
        expect(mark.nodes).toHaveLength(6);
    });

    test('a shape joined with itself, or with something inside it, stays as it was', () => {
        expect(area(combined([rect(0, 0, 100, 100), rect(0, 0, 100, 100)], 'join'))).toBeCloseTo(10000, 0);
        const inside = combined([rect(0, 0, 100, 100), rect(25, 25, 50, 50)], 'join');
        expect(inside.more).toBeUndefined();
        expect(area(inside)).toBeCloseTo(10000, 0);
    });

    test("shapes that don't touch join as one mark in two parts", () => {
        const mark = combined([rect(0, 0, 10, 10), rect(100, 0, 20, 20)], 'join');
        expect(mark.more).toHaveLength(1);
        expect(mark.nodes.map(n => n.x)).toContain(120);
        expect(area(mark)).toBeCloseTo(500, 0);
    });

    test('cutting a bite out of a square', () => {
        const mark = combined([rect(0, 0, 100, 100), rect(50, 50, 100, 100)], 'cut');
        expect(mark.more).toBeUndefined();
        expect(area(mark)).toBeCloseTo(7500, 0);
        expect(mark.nodes).toHaveLength(6);
    });

    test('cutting from the middle leaves a hole that paints as a hole', () => {
        const mark = combined([rect(0, 0, 100, 100), rect(25, 25, 50, 50)], 'cut');
        expect(mark.more).toHaveLength(1);
        expect(area(mark)).toBeCloseTo(7500, 0);
        expect(Math.sign(signedArea(mark.nodes))).toBe(-Math.sign(signedArea(mark.more![0])));
    });

    test('cutting right across leaves two parts', () => {
        const mark = combined([rect(0, 0, 100, 100), rect(-10, 40, 120, 20)], 'cut');
        expect(mark.more).toHaveLength(1);
        expect(area(mark)).toBeCloseTo(8000, 0);
    });

    test('a curve stays a curve, with few points', () => {
        const bite = combined([ellipse(0, 0, 100, 100), rect(50, -10, 100, 120)], 'cut');
        // Half a circle: the true area, and not hundreds of little lines.
        expect(area(bite)).toBeGreaterThan(Math.PI * 1250 * 0.995);
        expect(area(bite)).toBeLessThan(Math.PI * 1250 * 1.005);
        expect(bite.nodes.length).toBeLessThanOrEqual(5);
        expect(bite.nodes.some(n => n.out)).toBe(true);
        for (const p of outline(bite.nodes)) {
            const onCircle = Math.abs(Math.hypot(p.x - 50, p.y - 50) - 50) < 0.15;
            expect(onCircle || Math.abs(p.x - 50) < 0.15).toBe(true);
        }
    });

    test('two circles join with their true area', () => {
        const mark = combined([ellipse(0, 0, 100, 100), ellipse(50, 0, 100, 100)], 'join');
        const lens = 2 * 2500 * Math.acos(0.5) - 25 * Math.sqrt(4 * 2500 - 2500);
        const expected = 2 * Math.PI * 2500 - lens;
        expect(Math.abs(area(mark) - expected) / expected).toBeLessThan(0.003);
        expect(mark.nodes.length).toBeLessThanOrEqual(10);
    });

    test('a turned shape is cut where it shows', () => {
        // A square turned 45° is a diamond reaching 70.7 either side of its middle (50, 50): the cut's edge at x = 50 halves it.
        const mark = combined([rect(0, 0, 100, 100, { rotation: 45 }), rect(50, -50, 100, 200)], 'cut');
        expect(area(mark)).toBeCloseTo(5000, 0);
        expect(mark.rotation).toBeUndefined();
        expect(markBox(mark).x).toBeCloseTo(50 - 70.71, 1);
    });

    test('three shapes: the later two both cut the first, and both join', () => {
        expect(area(combined([rect(0, 0, 100, 100), rect(0, 0, 10, 100), rect(90, 0, 10, 100)], 'cut'))).toBeCloseTo(8000, 0);
        expect(area(combined([rect(0, 0, 10, 10), rect(10, 0, 10, 10), rect(20, 0, 10, 10)], 'join'))).toBeCloseTo(300, 0);
    });

    test('a square drawn the other way round still takes a hole', () => {
        const backwards: PathMark = { id: 'b', kind: 'path', ...DefaultStyle, closed: true, nodes: [{ x: 0, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 0 }] };
        const mark = combined([backwards, ellipse(25, 25, 50, 50)], 'cut');
        expect(mark.more).toHaveLength(1);
        expect(Math.abs(area(mark) - (10000 - Math.PI * 625)) / 8000).toBeLessThan(0.003);
    });

    test('what it refuses', () => {
        expect(combineMarks([rect(0, 0, 10, 10), rect(100, 100, 10, 10)], 'cut')).toEqual({ ok: false, reason: 'not-touching' });
        expect(combineMarks([rect(10, 10, 10, 10), rect(0, 0, 100, 100)], 'cut')).toEqual({ ok: false, reason: 'nothing-left' });
        expect(combineMarks([rect(0, 0, 10, 10), line()], 'join')).toEqual({ ok: false, reason: 'failed' });
        expect(combineMarks([rect(0, 0, 10, 10)], 'join')).toEqual({ ok: false, reason: 'failed' });
        expect(isClosedShape(line())).toBe(false);
        expect(isClosedShape(ellipse(0, 0, 1, 1))).toBe(true);
    });

    test('a hole survives moving, a second cut, and saving and reopening', () => {
        const once = combined([rect(0, 0, 100, 100), rect(10, 10, 20, 20)], 'cut');
        const twice = combined([once, rect(60, 60, 20, 20)], 'cut');
        expect(twice.more).toHaveLength(2);
        expect(area(twice)).toBeCloseTo(9200, 0);
        const moved = moveMark(twice, 7, 9);
        expect(moved.more![0][0].x - twice.more![0][0].x).toBe(7);
        expect(markBox(moved)).toEqual({ x: 7, y: 9, w: 100, h: 100 });

        const svg = shapeToSvg({ marks: [moved] });
        expect(svg).toContain('data-shape="holes"');
        expect((pathData(moved).match(/Z/g) ?? [])).toHaveLength(3);
        const read = parseShapeSvg(svg, () => null);
        expect(read.doc.marks).toHaveLength(1);
        const back = read.doc.marks[0] as PathMark;
        expect(back.kind).toBe('path');
        expect(back.more).toHaveLength(2);
        expect(area(back)).toBeCloseTo(9200, 0);
    });

    test('a curved hole saved and reopened is the same size', () => {
        const mark = combined([rect(0, 0, 100, 100), ellipse(25, 25, 50, 50)], 'cut');
        const back = parseShapeSvg(shapeToSvg({ marks: [mark] }), () => null).doc.marks[0] as PathMark;
        expect(back.more).toHaveLength(1);
        expect(Math.abs(area(back) - area(mark))).toBeLessThan(20);
    });
});

describe('ready-made shapes', () => {
    test('each one fills the box it is dragged to', () => {
        expect(Presets.length).toBeGreaterThanOrEqual(10);
        const box = { x: 10, y: 20, w: 300, h: 150 };
        for (const preset of Presets) {
            const nodes = presetNodes(preset.id, box);
            const mark: PathMark = { id: 'x', kind: 'path', ...DefaultStyle, nodes, closed: true };
            const got = markBox(mark);
            expect(got.x).toBeCloseTo(10, 0);
            expect(got.y).toBeCloseTo(20, 0);
            expect(got.w).toBeCloseTo(300, 0);
            expect(got.h).toBeCloseTo(150, 0);
            expect(nodes.length).toBeGreaterThanOrEqual(3);
        }
    });

    test('they come out with their curves, and can be cut like any other', () => {
        const heart = presetNodes('heart', { x: 0, y: 0, w: 100, h: 100 });
        expect(heart.some(n => n.in || n.out)).toBe(true);
        const mark: PathMark = { id: 'h', kind: 'path', ...DefaultStyle, nodes: heart, closed: true };
        const half = combined([mark, rect(50, -10, 100, 200)], 'cut');
        expect(area(half)).toBeCloseTo(area(mark) / 2, -1);
    });

    test('an unknown one falls back rather than failing', () => {
        expect(presetNodes('nope', { x: 0, y: 0, w: 10, h: 10 }).length).toBeGreaterThan(2);
    });
});

describe('words as outlines', () => {
    /** A bitmap from rows of text: # is solid. */
    const bitmap = (rows: string[]) => ({ w: rows[0].length, h: rows.length, alpha: Uint8Array.from(rows.join('').split('').map(c => c === '#' ? 255 : 0)) });

    test('a solid block is one outline with four corners', () => {
        const { alpha, w, h } = bitmap(['.....', '.###.', '.###.', '.....']);
        const loops = traceOutlines(alpha, w, h);
        expect(loops).toHaveLength(1);
        expect(loops[0]).toHaveLength(4);
        expect(Math.abs(signedArea(loops[0]))).toBe(6);
    });

    test('a ring has a hole facing the other way, and a separate blob is separate', () => {
        const { alpha, w, h } = bitmap(['#####....', '#...#.###', '#...#.###', '#####.###']);
        // A finer tolerance than the default: this hole is only 3 by 2, and 1 pixel of slack would take a corner off it.
        const loops = traceOutlines(alpha, w, h, 0.5).sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)));
        expect(loops).toHaveLength(3);
        expect(Math.abs(signedArea(loops[0]))).toBe(20);
        expect(Math.abs(signedArea(loops[1]))).toBe(9);
        expect(Math.abs(signedArea(loops[2]))).toBe(6);
        expect(Math.sign(signedArea(loops[0]))).toBe(Math.sign(signedArea(loops[1])));
        expect(Math.sign(signedArea(loops[0]))).toBe(-Math.sign(signedArea(loops[2])));
    });

    test('corners that only touch diagonally still close up', () => {
        const { alpha, w, h } = bitmap(['##..', '##..', '..##', '..##']);
        const loops = traceOutlines(alpha, w, h);
        expect(loops.reduce((sum, loop) => sum + signedArea(loop), 0)).toBe(8);
    });

    test('nothing to see is no outlines; a smooth circle comes out with few points', () => {
        expect(traceOutlines(new Uint8Array(16), 4, 4)).toEqual([]);
        const size = 200;
        const alpha = new Uint8Array(size * size);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (Math.hypot(x + 0.5 - 100, y + 0.5 - 100) < 80) alpha[y * size + x] = 255;
        const [circle] = traceOutlines(alpha, size, size);
        expect(circle.length).toBeLessThan(100);
        expect(Math.abs(Math.abs(signedArea(circle)) - Math.PI * 6400) / (Math.PI * 6400)).toBeLessThan(0.01);
    });

    test('softened, a curve has no uneven flat sides: every corner stays close to the true circle, and turns gently', () => {
        const size = 500, r = 200;
        const alpha = new Uint8Array(size * size);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (Math.hypot(x + 0.5 - 250, y + 0.5 - 250) < r) alpha[y * size + x] = 255;
        const [soft] = traceOutlines(alpha, size, size, 0.4, 2);
        const [hard] = traceOutlines(alpha, size, size, 0.4, 0);
        /** The sharpest turn between neighbouring straight bits, in degrees. */
        const sharpest = (loop: Pt[]) => Math.max(...loop.map((p, i) => {
            const a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length];
            let turn = Math.abs(Math.atan2(b.y - p.y, b.x - p.x) - Math.atan2(p.y - a.y, p.x - a.x)) * 180 / Math.PI;
            if (turn > 180) turn = 360 - turn;
            return turn;
        }));
        expect(sharpest(soft)).toBeLessThan(20);
        // Without it the steps show: this is what the test is here to catch.
        expect(sharpest(hard)).toBeGreaterThan(30);
        for (const p of soft) expect(Math.abs(Math.hypot(p.x - 250, p.y - 250) - r)).toBeLessThan(1.5);
        expect(soft.length).toBeLessThan(200);
    });

    test('they stand in the box keeping their proportions, biggest outline first, and can be cut like any other', () => {
        const small = [{ x: 30, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 10 }, { x: 30, y: 10 }], big = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }];
        const placed = outlinesToNodes([small, big], { x: 100, y: 100, w: 400, h: 40 });
        expect(placed.nodes[0]).toEqual({ x: 100, y: 100 });
        expect(placed.nodes[2]).toEqual({ x: 140, y: 140 });
        expect(placed.more).toHaveLength(1);
        expect(placed.more![0][1]).toEqual({ x: 180, y: 100 });
        const mark: PathMark = { id: 'w', kind: 'path', ...DefaultStyle, closed: true, ...placed };
        expect(area(mark)).toBeCloseTo(1600 + 400, 0);
        expect(area(combined([mark, rect(100, 100, 20, 40)], 'cut'))).toBeCloseTo(800 + 400, 0);
    });
});