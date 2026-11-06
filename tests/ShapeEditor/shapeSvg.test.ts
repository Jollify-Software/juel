import { DefaultStyle, groupMarks, markBox, shapeToSvg, type BoxMark, type Mark, type PathMark } from '../../src/Editors/ShapeEditor/shapeModel';
import { parsePathData, parseShapeSvg, type Measure } from '../../src/Editors/ShapeEditor/shapeSvg';

const measure: Measure = () => ({ x: 0, y: 0, w: 40, h: 20 });
const read = (body: string, attrs = 'viewBox="0 0 100 100"') => parseShapeSvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${body}</svg>`, measure);
const only = <T extends Mark = Mark>(body: string) => { const { doc } = read(body); expect(doc.marks).toHaveLength(1); return doc.marks[0] as T; };

describe('safe', () => {
    test('a script goes, and the note says so', () => {
        const { doc, notes } = read('<script>alert(1)</script><rect width="10" height="10"/>');
        expect(doc.marks).toHaveLength(1);
        expect(notes.join(' ')).toContain('script');
        expect(JSON.stringify(doc)).not.toContain('alert');
    });
    test('event attributes go, on shapes and on locked parts', () => {
        const { doc, notes } = read('<rect width="10" height="10" onclick="alert(1)"/><text onload="alert(2)" x="1" y="1">Hi</text>');
        expect(JSON.stringify(doc)).not.toMatch(/onclick|onload|alert/);
        expect(notes.join(' ')).toContain('actions');
        expect(doc.marks.map(m => m.kind)).toEqual(['rect', 'locked']);
    });
    test('outside links go: pictures, uses, urls in style and fill', () => {
        const { doc, notes } = read('<image href="https://evil.example/x.png" width="5" height="5"/><use xlink:href="http://evil.example/a.svg#b"/><rect width="9" height="9" style="fill:url(http://evil.example/p)"/><rect width="9" height="9" filter="url(https://evil.example/f)"/>');
        expect(JSON.stringify(doc)).not.toContain('evil.example');
        expect(notes.join(' ')).toContain('links to outside files');
    });
    test('a picture inside the file stays', () => {
        const png = 'data:image/png;base64,AAAA';
        const m = only(`<image href="${png}" width="5" height="5"/>`);
        expect(m.kind).toBe('locked');
        expect((m as any).markup).toContain(png);
    });
    test('a data: url that isn\'t a picture goes', () => {
        const { doc } = read('<image href="data:text/html,<script>alert(1)</script>" width="5" height="5"/>');
        expect(JSON.stringify(doc)).not.toContain('alert');
    });
    test('javascript: links go, and the drawing inside the link stays', () => {
        const { doc, notes } = read('<a href="javascript:alert(1)"><rect width="9" height="9"/></a>');
        expect(JSON.stringify(doc)).not.toContain('javascript');
        expect(doc.marks.map(m => m.kind)).toEqual(['rect']);
        expect(notes.join(' ')).toContain('a link');
    });
    test('embedded web content goes', () => {
        const { doc, notes } = read('<foreignObject width="9" height="9"><iframe xmlns="http://www.w3.org/1999/xhtml" src="https://evil.example"></iframe></foreignObject><rect width="1" height="1"/>');
        expect(JSON.stringify(doc)).not.toContain('evil.example');
        expect(notes.join(' ')).toContain('embedded web content');
    });
    test('an animation that could set a link goes', () => {
        const { doc, notes } = read('<rect width="9" height="9"/><text x="1"><set attributeName="href" to="javascript:alert(1)"/>Hi</text>');
        expect(JSON.stringify(doc)).not.toContain('javascript');
        expect(notes.join(' ')).toContain('animation');
    });
    test('@import and outside urls in a <style> go', () => {
        const { doc, notes } = read('<style>@import url(https://evil.example/a.css); .x { fill: url(https://evil.example/b); }</style><rect class="x" width="9" height="9"/>');
        expect(JSON.stringify(doc)).not.toContain('evil.example');
        expect(notes.join(' ')).toContain('links');
    });
    test('hidden notes are mentioned, other programs\' notes draw nothing', () => {
        const { doc, notes } = read('<title>Secret</title><metadata>x</metadata><rect width="1" height="1"/>');
        expect(doc.marks).toHaveLength(1);
        expect(notes.join(' ')).toContain('hidden');
    });
    test('a clean file has no notes', () => {
        expect(read('<rect width="1" height="1"/>').notes).toEqual([]);
    });
    test('something that is not SVG comes back empty, with a note', () => {
        const r = parseShapeSvg('<html><body>hello</body></html>', measure);
        expect(r.doc.marks).toEqual([]);
        expect(r.notes[0]).toContain('couldn');
        expect(parseShapeSvg('not xml at all', measure).notes[0]).toContain('couldn');
    });
});

describe('shapes become marks', () => {
    test('rect, rounded, circle, ellipse', () => {
        expect(only<BoxMark>('<rect x="1" y="2" width="3" height="4"/>')).toMatchObject({ kind: 'rect', x: 1, y: 2, w: 3, h: 4 });
        expect(only<BoxMark>('<rect width="30" height="40" rx="5"/>').radius).toBe(5);
        expect(only<BoxMark>('<circle cx="10" cy="10" r="5"/>')).toMatchObject({ kind: 'ellipse', x: 5, y: 5, w: 10, h: 10 });
        expect(only<BoxMark>('<ellipse cx="10" cy="10" rx="5" ry="2"/>')).toMatchObject({ kind: 'ellipse', w: 10, h: 4 });
    });
    test('line, polyline, polygon', () => {
        expect(only<PathMark>('<line x1="0" y1="0" x2="5" y2="5" stroke="red"/>').nodes).toHaveLength(2);
        expect(only<PathMark>('<polyline points="0,0 5,5 9,0" fill="none" stroke="red"/>').closed).toBe(false);
        expect(only<PathMark>('<polygon points="0,0 5,5 9,0"/>').closed).toBe(true);
    });
    test('default black fill, no line, as SVG says', () => {
        expect(only('<rect width="1" height="1"/>')).toMatchObject({ fill: '#000000', stroke: null });
    });
    test('colours from attributes, style and a parent', () => {
        expect(only('<rect width="1" height="1" fill="red" stroke="blue" stroke-width="3"/>')).toMatchObject({ fill: 'red', stroke: 'blue', width: 3 });
        expect(only('<rect width="1" height="1" style="fill:#123456;stroke-width:2;stroke:#000"/>')).toMatchObject({ fill: '#123456', width: 2 });
        expect(only('<g fill="green"><rect width="1" height="1"/></g>')).toMatchObject({ fill: 'green' });
        expect(only('<rect width="1" height="1" fill="none"/>')).toMatchObject({ fill: null });
    });
    test('a moved or scaled rectangle stays a rectangle', () => {
        expect(only<BoxMark>('<rect x="1" y="1" width="2" height="2" transform="translate(10 20)"/>')).toMatchObject({ kind: 'rect', x: 11, y: 21, w: 2, h: 2 });
        expect(only<BoxMark>('<g transform="scale(2)"><rect x="1" y="1" width="2" height="2"/></g>')).toMatchObject({ kind: 'rect', x: 2, y: 2, w: 4, h: 4 });
    });
    test('a turned rectangle stays a rectangle with a rotation', () => {
        const m = only<BoxMark>('<rect x="0" y="0" width="10" height="10" transform="rotate(30 5 5)"/>');
        expect(m.kind).toBe('rect');
        expect(m.rotation).toBeCloseTo(30);
        expect(m.x).toBeCloseTo(0);
    });
    test('a skewed rectangle becomes points, its corners where they should be', () => {
        const m = only<PathMark>('<rect width="10" height="10" transform="skewX(45)"/>');
        expect(m.kind).toBe('path');
        expect(m.nodes[2].x).toBeCloseTo(20);
    });
    test('a line width scales with its parents', () => {
        expect(only('<g transform="scale(2)"><line x2="5" stroke="red" stroke-width="3"/></g>')).toMatchObject({ width: 6 });
    });
});

describe('path data', () => {
    test('all the commands', () => {
        const subs = parsePathData('M0 0 L10 0 H20 V10 l-5 5 h-5 v-5 C5 5 5 5 0 0 Z')!;
        expect(subs).toHaveLength(1);
        expect(subs[0].closed).toBe(true);
        expect(subs[0].nodes[0].in).toBeTruthy();
    });
    test('smooth curves follow on', () => {
        const [s] = parsePathData('M0 0 C0 10 10 10 10 0 S20 -10 20 0')!;
        expect(s.nodes[1].out).toEqual({ x: 10, y: -10 });
    });
    test('quadratics become cubics', () => {
        const [s] = parsePathData('M0 0 Q5 10 10 0 T20 0')!;
        expect(s.nodes).toHaveLength(3);
        expect(s.nodes[0].out!.y).toBeCloseTo(6.667, 2);
    });
    test('an arc becomes curves that end where it does', () => {
        const [s] = parsePathData('M0 50 A50 50 0 0 1 100 50')!;
        expect(s.nodes[s.nodes.length - 1]).toMatchObject({ x: 100, y: 50 });
        // A half circle reaches the top.
        const top = Math.min(...s.nodes.map(n => n.y));
        expect(top).toBeCloseTo(0, 3);
    });
    test('arc flags written with no space', () => {
        const [s] = parsePathData('M0 0a5 5 0 015 5')!;
        expect(s.nodes[s.nodes.length - 1]).toMatchObject({ x: 5, y: 5 });
    });
    test('numbers run together', () => {
        const [s] = parsePathData('M1-2.5L.5,3e1')!;
        expect(s.nodes[0]).toMatchObject({ x: 1, y: -2.5 });
        expect(s.nodes[1]).toMatchObject({ x: 0.5, y: 30 });
    });
    test('rubbish is refused', () => {
        expect(parsePathData('')).toBeNull();
        expect(parsePathData('12 13')).toBeNull();
        expect(parsePathData('M1-2.5.5')).toBeNull();
        expect(parsePathData('M0 0 L5 L6 7')).toBeNull();
    });
});

describe('kept word for word', () => {
    test('text and pictures are locked, not lost', () => {
        const m = only('<text x="1" y="9" font-size="8">Hello</text>');
        expect(m.kind).toBe('locked');
        expect((m as any).markup).toContain('Hello');
        expect(markBox(m)).toEqual({ x: 0, y: 0, w: 40, h: 20 });
    });
    test('a gradient fill is locked, and its gradient kept', () => {
        const { doc } = read('<defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs><rect width="9" height="9" fill="url(#g)"/>');
        expect(doc.marks[0].kind).toBe('locked');
        expect(doc.defs).toContain('linearGradient');
        const again = shapeToSvg(doc);
        expect(again).toContain('linearGradient');
        expect(again).toContain('url(#g)');
    });
    test('a filter, a clip, odd line ends and unknown properties lock the shape', () => {
        for (const extra of ['filter="url(#f)"', 'clip-path="url(#c)"', 'stroke="red" stroke-linecap="square"', 'fill-opacity="0.5"', 'mask="url(#m)"', 'stroke="red" stroke-dasharray="1 9"']) {
            expect(only(`<rect width="9" height="9" ${extra}/>`).kind).toBe('locked');
        }
    });
    test('a path with a hole stays whole', () => {
        expect(only('<path d="M0 0H10V10H0Z M2 2H8V8H2Z" fill-rule="evenodd"/>').kind).toBe('locked');
        expect(only('<path d="M0 0H10V10H0Z M2 2H8V8H2Z"/>').kind).toBe('locked');
    });
    test('two unfilled pieces come apart, as a group', () => {
        const { doc } = read('<path d="M0 0L10 0 M0 5L10 5" fill="none" stroke="red"/>');
        expect(doc.marks).toHaveLength(2);
        expect(doc.marks[0].group).toBeTruthy();
        expect(doc.marks[0].group).toBe(doc.marks[1].group);
    });
    test('a class with a <style> keeps its look by staying locked', () => {
        const { doc } = read('<style>.x { fill: red; }</style><rect class="x" width="9" height="9"/>');
        expect(doc.marks[0].kind).toBe('locked');
        expect(doc.defs).toContain('.x');
    });
    test('a see-through group stays together', () => {
        expect(only('<g opacity="0.5"><rect width="9" height="9"/><rect width="9" height="9"/></g>').kind).toBe('locked');
    });
    test('a locked part inherits what its parents gave it', () => {
        const m = only('<g fill="red" transform="translate(5 5)"><text>Hi</text></g>');
        expect((m as any).markup).toMatch(/matrix\(1 0 0 1 5 5\)/);
        expect((m as any).markup).toContain('fill="red"');
    });
});

describe('our own file, round and round', () => {
    const style = { ...DefaultStyle };
    const drawing = (): Mark[] => [
        { id: 'a', kind: 'rect', ...style, x: 10, y: 10, w: 50, h: 30, radius: 6 },
        { id: 'b', kind: 'ellipse', ...style, fill: '#ff0000', x: 70, y: 10, w: 30, h: 30, opacity: 0.5, rotation: 20 },
        { id: 'c', kind: 'path', ...style, fill: null, nodes: [{ x: 0, y: 50 }, { x: 40, y: 80 }], closed: false, arrow: true, dash: 'dashed' },
        { id: 'd', kind: 'path', ...style, nodes: [{ x: 50, y: 50 }, { x: 90, y: 50 }, { x: 70, y: 80 }], closed: true, dash: 'dotted' },
        { id: 'e', kind: 'path', ...style, fill: null, nodes: [{ x: 100, y: 50, out: { x: 110, y: 40 } }, { x: 130, y: 50, in: { x: 120, y: 60 } }], closed: false },
    ];
    test('saved and read back it is the same file', () => {
        const first = shapeToSvg({ marks: drawing() });
        const again = parseShapeSvg(first, measure);
        expect(again.notes).toEqual([]);
        expect(again.doc.marks.map(m => m.kind)).toEqual(['rect', 'ellipse', 'path', 'path', 'path']);
        expect((again.doc.marks[2] as PathMark).arrow).toBe(true);
        expect(again.doc.marks[2].dash).toBe('dashed');
        expect(again.doc.marks[3].dash).toBe('dotted');
        expect(again.doc.marks[1].rotation).toBeCloseTo(20);
        expect(shapeToSvg(again.doc)).toBe(first);
    });
    test('groups come back', () => {
        const first = shapeToSvg(groupMarks({ marks: drawing() }, ['a', 'b']));
        const again = parseShapeSvg(first, measure).doc;
        expect(again.marks[0].group).toBeTruthy();
        expect(again.marks[0].group).toBe(again.marks[1].group);
        expect(again.marks[2].group).toBeUndefined();
        expect(shapeToSvg(again)).toBe(first);
    });
    test('a locked part doesn\'t nest deeper each time it is saved', () => {
        const start = read('<text x="1" y="9">Hello</text><rect x="50" y="0" width="9" height="9"/>').doc;
        const first = shapeToSvg(start);
        const second = shapeToSvg(parseShapeSvg(first, measure).doc);
        const third = shapeToSvg(parseShapeSvg(second, measure).doc);
        expect(second).toBe(first);
        expect(third).toBe(first);
        expect(first.match(/<g /g)).toHaveLength(1);
    });
    test('a flipped, turned locked part keeps its place', () => {
        const m = read('<text>Hello</text>').doc.marks[0];
        const doc = { marks: [{ ...m, x: 10, y: 10, w: 80, h: 40, flipX: true, rotation: 15 } as Mark] };
        const first = shapeToSvg(doc);
        const back = parseShapeSvg(first, measure).doc;
        expect(back.marks[0]).toMatchObject({ kind: 'locked', flipX: true });
        expect(back.marks[0].rotation).toBeCloseTo(15);
        expect(shapeToSvg(back)).toBe(first);
    });
    test('square-cornered lines stay square', () => {
        const m = only('<rect width="9" height="9" stroke="red"/>');
        expect(shapeToSvg({ marks: [m] })).not.toContain('stroke-linejoin');
    });
});
