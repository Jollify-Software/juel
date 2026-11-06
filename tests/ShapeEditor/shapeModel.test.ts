import {
    arrowHead, boxFromDrag, boxOfPoints, copyMarks, DefaultStyle, editableMark, flipMarks, groupMarks, groupOf, insertPoint, lockAngle, markBox, markPaintBox, markWorldBox,
    movePoint, pathData, pencilPath, polygonPoints, removePoint, reorderMarks, resizeMark, rotateMarks, rotatePoint, shapeToSvg, simplifyPoints, starPoints, trianglePoints, ungroupMarks,
    type BoxMark, type Mark, type PathMark,
} from '../../src/Editors/ShapeEditor/shapeModel';

const rect = (over: Partial<BoxMark> = {}): BoxMark => ({ id: 'a', kind: 'rect', ...DefaultStyle, x: 10, y: 20, w: 100, h: 50, ...over });
const path = (over: Partial<PathMark> = {}): PathMark => ({ id: 'p', kind: 'path', ...DefaultStyle, closed: false, nodes: [{ x: 0, y: 0 }, { x: 100, y: 0 }], ...over });
const near = (a: { x: number; y: number }, b: { x: number; y: number }) => { expect(a.x).toBeCloseTo(b.x, 3); expect(a.y).toBeCloseTo(b.y, 3); };

describe('drawing', () => {
    test('a drag gives a box, any direction', () => {
        expect(boxFromDrag({ x: 50, y: 50 }, { x: 10, y: 90 })).toEqual({ x: 10, y: 50, w: 40, h: 40 });
    });
    test('Shift makes it square, following the drag', () => {
        expect(boxFromDrag({ x: 0, y: 0 }, { x: -30, y: 10 }, { square: true })).toEqual({ x: -30, y: 0, w: 30, h: 30 });
    });
    test('Alt draws from the centre', () => {
        expect(boxFromDrag({ x: 100, y: 100 }, { x: 130, y: 110 }, { fromCentre: true })).toEqual({ x: 70, y: 90, w: 60, h: 20 });
    });
    test('Shift locks a line to 45°', () => {
        const end = lockAngle({ x: 0, y: 0 }, { x: 100, y: 10 });
        expect(end.y).toBeCloseTo(0);
        const diag = lockAngle({ x: 0, y: 0 }, { x: 100, y: 90 });
        expect(diag.x).toBeCloseTo(diag.y);
    });
    test('a triangle, polygon and star fill the box they were dragged', () => {
        const box = { x: 10, y: 20, w: 200, h: 100 };
        for (const points of [trianglePoints(box), polygonPoints(box, 5), polygonPoints(box, 6), starPoints(box, 5), starPoints(box, 7)]) {
            const b = boxOfPoints(points);
            expect(b.x).toBeCloseTo(10); expect(b.y).toBeCloseTo(20); expect(b.w).toBeCloseTo(200); expect(b.h).toBeCloseTo(100);
        }
        expect(polygonPoints(box, 6)).toHaveLength(6);
        expect(starPoints(box, 5)).toHaveLength(10);
    });
});

describe('the pencil', () => {
    const wobble = Array.from({ length: 200 }, (_, i) => ({ x: i, y: Math.sin(i / 20) * 30 + (i % 2 ? 0.2 : -0.2) }));
    test('simplifying keeps far fewer points, and stays on the line', () => {
        const kept = simplifyPoints(wobble, 1.2);
        expect(kept.length).toBeLessThan(30);
        expect(kept[0]).toEqual(wobble[0]);
        expect(kept[kept.length - 1]).toEqual(wobble[199]);
    });
    test('a stroke becomes a smooth open path', () => {
        const { nodes, closed } = pencilPath(wobble, 1.2, 10);
        expect(closed).toBe(false);
        expect(nodes.length).toBeGreaterThan(3);
        expect(nodes[1].in && nodes[1].out).toBeTruthy();
        expect(nodes[0].in).toBeUndefined();
        expect(nodes[nodes.length - 1].out).toBeUndefined();
    });
    test('ending where it began closes it, so it can be filled', () => {
        const ring = Array.from({ length: 60 }, (_, i) => ({ x: Math.cos(i / 59 * 2 * Math.PI) * 50, y: Math.sin(i / 59 * 2 * Math.PI) * 50 }));
        const { nodes, closed } = pencilPath(ring, 1.2, 10);
        expect(closed).toBe(true);
        expect(nodes[0].in).toBeTruthy();
    });
    test('a press with no drag is a dot', () => {
        const { nodes, closed } = pencilPath([{ x: 5, y: 5 }], 1, 10);
        expect(closed).toBe(false);
        expect(nodes).toHaveLength(2);
    });
    test('a straight stroke is two points, no curves', () => {
        const { nodes } = pencilPath(Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: 0 })), 1, 10);
        expect(nodes).toEqual([{ x: 0, y: 0 }, { x: 95, y: 0 }]);
    });
});

describe('moving and resizing', () => {
    test('resizing from a corner keeps the far corner', () => {
        const next = resizeMark(rect(), 'se', { x: 210, y: 120 });
        expect(markBox(next)).toEqual({ x: 10, y: 20, w: 200, h: 100 });
    });
    test('a side handle changes one way only', () => {
        expect(markBox(resizeMark(rect(), 'e', { x: 60, y: 999 }))).toEqual({ x: 10, y: 20, w: 50, h: 50 });
    });
    test('Shift keeps the proportions', () => {
        const b = markBox(resizeMark(rect(), 'se', { x: 310, y: 30 }, { keepRatio: true }));
        expect(b.w).toBeCloseTo(300); expect(b.h).toBeCloseTo(150);
    });
    test('Alt resizes from the middle', () => {
        const b = markBox(resizeMark(rect(), 'e', { x: 160, y: 45 }, { fromCentre: true }));
        expect(b.x).toBeCloseTo(-40); expect(b.w).toBeCloseTo(200); expect(b.y).toBe(20);
    });
    test('dragging past the far side flips it, and it is never lost to nothing', () => {
        const b = markBox(resizeMark(rect(), 'e', { x: 10, y: 45 }));
        expect(b.w).toBeGreaterThan(0);
        const over = markBox(resizeMark(rect(), 'e', { x: -40, y: 45 }));
        expect(over).toEqual({ x: -40, y: 20, w: 50, h: 50 });
    });
    test('a turned mark resizes along its own sides, its far corner staying put on the page', () => {
        const start = rect({ rotation: 30 });
        const c = { x: 60, y: 45 };
        const anchorBefore = rotatePoint({ x: 10, y: 20 }, c, 30);
        const pointer = rotatePoint({ x: 210, y: 120 }, c, 30);
        const next = resizeMark(start, 'se', pointer);
        const b = markBox(next);
        expect(b.w).toBeCloseTo(200); expect(b.h).toBeCloseTo(100);
        const anchorAfter = rotatePoint({ x: b.x, y: b.y }, { x: b.x + b.w / 2, y: b.y + b.h / 2 }, 30);
        near(anchorAfter, anchorBefore);
    });
    test('resizing a line with no height does not divide by nothing', () => {
        const next = resizeMark(path(), 'se', { x: 50, y: 40 }) as PathMark;
        expect(next.nodes[1]).toEqual({ x: 50, y: 0 });
    });
    test('turning together moves each mark round the middle and turns it', () => {
        const [a] = rotateMarks([rect()], { x: 10, y: 20 }, 90);
        expect(a.rotation).toBe(90);
        near({ x: markBox(a).x + 50, y: markBox(a).y + 25 }, rotatePoint({ x: 60, y: 45 }, { x: 10, y: 20 }, 90));
    });
    test('turning all the way back leaves no rotation', () => {
        const [a] = rotateMarks([rect({ rotation: 90 })], { x: 60, y: 45 }, -90);
        expect(a.rotation).toBeUndefined();
    });
    test('flipping two marks swaps their sides and mirrors the geometry', () => {
        const left = path({ id: 'l', nodes: [{ x: 0, y: 0 }, { x: 10, y: 10 }] });
        const right = rect({ id: 'r', x: 90, y: 0, w: 10, h: 10 });
        const [l, r] = flipMarks([left, right], 'x') as [PathMark, BoxMark];
        expect(r.x).toBe(0);
        expect(l.nodes).toEqual([{ x: 100, y: 0 }, { x: 90, y: 10 }]);
    });
    test('flipping a turned mark turns it the other way', () => {
        const [m] = flipMarks([rect({ rotation: 30 })], 'x');
        expect(m.rotation).toBe(-30);
    });
});

describe('groups and order', () => {
    const three: Mark[] = [rect({ id: 'a' }), rect({ id: 'b' }), rect({ id: 'c' })];
    test('grouping puts them next to each other and they select as one', () => {
        const doc = groupMarks({ marks: three }, ['a', 'c']);
        expect(doc.marks.map(m => m.id)).toEqual(['b', 'a', 'c']);
        expect(groupOf(doc, 'a')).toEqual(['a', 'c']);
        expect(groupOf(doc, 'b')).toEqual(['b']);
        expect(ungroupMarks(doc, ['a', 'c']).marks.every(m => !m.group)).toBe(true);
    });
    test('front and back', () => {
        expect(reorderMarks({ marks: three }, ['a'], 'front').marks.map(m => m.id)).toEqual(['b', 'c', 'a']);
        expect(reorderMarks({ marks: three }, ['c'], 'back').marks.map(m => m.id)).toEqual(['c', 'a', 'b']);
    });
    test('copies have new ids, and a copied group a new group of its own', () => {
        const doc = groupMarks({ marks: three }, ['a', 'b']);
        const copies = copyMarks(doc.marks.filter(m => m.group), ['a', 'b', 'c'], [doc.marks[0].group!], { x: 20, y: 20 });
        expect(new Set(copies.map(c => c.id)).size).toBe(2);
        expect(copies.some(c => ['a', 'b', 'c'].includes(c.id))).toBe(false);
        expect(copies[0].group).toBe(copies[1].group);
        expect(copies[0].group).not.toBe(doc.marks[0].group);
    });
});

describe('editing points', () => {
    test('a rectangle becomes four corners, an ellipse four round points', () => {
        expect(editableMark(rect())!.nodes).toEqual([{ x: 10, y: 20 }, { x: 110, y: 20 }, { x: 110, y: 70 }, { x: 10, y: 70 }]);
        const e = editableMark(rect({ kind: 'ellipse' }))!;
        expect(e.nodes).toHaveLength(4);
        expect(e.nodes[0].out).toBeTruthy();
        expect(e.closed).toBe(true);
    });
    test('an ellipse keeps its box when it becomes points', () => {
        const b = markBox(editableMark(rect({ kind: 'ellipse' }))!);
        expect(b.x).toBeCloseTo(10, 0); expect(b.w).toBeCloseTo(100, 0); expect(b.h).toBeCloseTo(50, 0);
    });
    test('a rounded rectangle stays rounded', () => {
        const e = editableMark(rect({ radius: 10 }))!;
        expect(e.nodes).toHaveLength(8);
        expect(pathData(e)).toContain('C');
    });
    test('the rotation goes into the points', () => {
        const e = editableMark(rect({ rotation: 90 }))!;
        expect(e.rotation).toBeUndefined();
        near(e.nodes[0], rotatePoint({ x: 10, y: 20 }, { x: 60, y: 45 }, 90));
    });
    test('a locked mark has no points', () => {
        expect(editableMark({ id: 'l', kind: 'locked', ...DefaultStyle, x: 0, y: 0, w: 1, h: 1, markup: '<text/>', natural: { x: 0, y: 0, w: 1, h: 1 } })).toBeNull();
    });
    test('moving a point brings its handles', () => {
        const m = path({ nodes: [{ x: 0, y: 0, out: { x: 5, y: 5 } }, { x: 100, y: 0 }] });
        expect(movePoint(m, 0, { x: 10, y: 10 }).nodes[0]).toEqual({ x: 10, y: 10, out: { x: 15, y: 15 } });
    });
    test('a new point on a straight line sits on the line', () => {
        const added = insertPoint(path(), { x: 25, y: 3 }, 12)!;
        expect(added.index).toBe(1);
        expect(added.mark.nodes[1].x).toBeCloseTo(25);
        expect(added.mark.nodes[1].y).toBeCloseTo(0);
        expect(insertPoint(path(), { x: 25, y: 40 }, 12)).toBeNull();
    });
    test('a new point on a curve leaves its shape alone', () => {
        const curve = path({ nodes: [{ x: 0, y: 0, out: { x: 0, y: 50 } }, { x: 100, y: 0, in: { x: 100, y: 50 } }] });
        const before = markBox(curve);
        const after = markBox(insertPoint(curve, { x: 50, y: 37.5 }, 12)!.mark);
        expect(after.h).toBeCloseTo(before.h, 1);
        expect(after.w).toBeCloseTo(before.w, 1);
    });
    test('a new point on the closing line of a closed shape', () => {
        const tri = path({ closed: true, nodes: trianglePoints({ x: 0, y: 0, w: 100, h: 100 }) });
        const added = insertPoint(tri, { x: 25, y: 50 }, 5)!;
        expect(added.mark.nodes).toHaveLength(4);
        expect(added.index).toBe(3);
    });
    test('too few points are refused', () => {
        expect(removePoint(path(), 0)).toBeNull();
        expect(removePoint(path({ closed: true, nodes: trianglePoints({ x: 0, y: 0, w: 1, h: 1 }) }), 0)).toBeNull();
        expect(removePoint(path({ nodes: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] }), 1)!.nodes).toHaveLength(2);
    });
});

describe('the file', () => {
    test('nothing but drawing, trimmed to what was drawn plus the line', () => {
        const text = shapeToSvg({ marks: [rect({ x: 100, y: 200, w: 50, h: 30, width: 4 })] });
        expect(text).toMatch(/viewBox="0 0 54 34"/);
        expect(text).toContain('<rect x="2" y="2" width="50" height="30"');
        expect(text).not.toMatch(/<script|href|data-id/);
    });
    test('no line, no room for one', () => {
        expect(shapeToSvg({ marks: [rect({ x: 5, y: 5, w: 10, h: 10, stroke: null })] })).toMatch(/viewBox="0 0 10 10"/);
    });
    test('a turned mark trims to where it really is', () => {
        const box = markWorldBox(rect({ x: 0, y: 0, w: 100, h: 10, rotation: 90, stroke: null }));
        expect(box.w).toBeCloseTo(10); expect(box.h).toBeCloseTo(100);
    });
    test('a square turned 45° has a wider box', () => {
        expect(markWorldBox(rect({ x: 0, y: 0, w: 100, h: 100, rotation: 45 })).w).toBeCloseTo(141.42, 1);
    });
    test('a circle turned has the same box', () => {
        expect(markWorldBox(rect({ kind: 'ellipse', x: 0, y: 0, w: 100, h: 100, rotation: 33 })).w).toBeCloseTo(100);
    });
    test('fill none is written, and no line writes nothing', () => {
        const text = shapeToSvg({ marks: [rect({ fill: null, stroke: null })] });
        expect(text).toContain('fill="none"');
        expect(text).not.toContain('stroke');
    });
    test('dashed, dotted and see-through', () => {
        expect(shapeToSvg({ marks: [rect({ dash: 'dashed', width: 2 })] })).toContain('stroke-dasharray="8 6"');
        expect(shapeToSvg({ marks: [rect({ dash: 'dotted', width: 2 })] })).toContain('stroke-dasharray="0 4"');
        expect(shapeToSvg({ marks: [rect({ opacity: 0.5 })] })).toContain('opacity="0.5"');
    });
    test('the kinds of path are written as what they are', () => {
        expect(shapeToSvg({ marks: [path()] })).toContain('<line ');
        expect(shapeToSvg({ marks: [path({ closed: true, nodes: trianglePoints({ x: 0, y: 0, w: 10, h: 10 }) })] })).toContain('<polygon ');
        expect(shapeToSvg({ marks: [path({ nodes: [{ x: 0, y: 0, out: { x: 5, y: 5 } }, { x: 10, y: 0 }] })] })).toContain('<path ');
    });
    test('an arrow is a line and a head that stays inside the box', () => {
        const m = path({ arrow: true, stroke: '#ff0000', width: 2 });
        const text = shapeToSvg({ marks: [m] });
        expect(text).toContain('data-shape="arrow"');
        expect(text).toContain('fill="#ff0000"');
        const head = arrowHead(m);
        expect(head[0]).toEqual({ x: 100, y: 0 });
        const paint = markPaintBox(m);
        for (const p of head) { expect(p.y).toBeGreaterThanOrEqual(paint.y); expect(p.y).toBeLessThanOrEqual(paint.y + paint.h); }
    });
    test('a group is one <g>', () => {
        const doc = groupMarks({ marks: [rect({ id: 'a' }), rect({ id: 'b' })] }, ['a', 'b']);
        expect(shapeToSvg(doc).match(/data-shape="group"/g)).toHaveLength(1);
    });
    test('a colour can\'t break out of its attribute', () => {
        const text = shapeToSvg({ marks: [rect({ fill: '"><script>alert(1)</script>' })] });
        expect(text).not.toContain('<script');
    });
    test('an empty drawing is still a file', () => {
        expect(shapeToSvg({ marks: [] })).toContain('viewBox="0 0 100 100"');
    });
});
