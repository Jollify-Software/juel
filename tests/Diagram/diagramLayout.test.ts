import { boxesOverlap, layoutDiagram, measureNode, routeOrthogonal, wrapText, type DiagramBox } from '../../src/Visualization/Diagram/diagramLayout';
import { starterDiagram, type Diagram } from '../../src/Visualization/Diagram/diagramModel';

const noOverlaps = (boxes: DiagramBox[]) => {
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++)
        if (boxesOverlap(boxes[i], boxes[j])) return `${boxes[i].id} overlaps ${boxes[j].id}`;
    return '';
};
const inside = (l: { width: number; height: number; boxes: DiagramBox[] }) => l.boxes.every(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= l.width && b.y + b.h <= l.height);
const box = (id: string, x: number, y: number, w = 100, h = 50): DiagramBox => ({ id, x, y, w, h, lines: [id], detailLines: [], shape: 'box', depth: 0 });

describe('text', () => {
    test('wrapText: words kept whole, long words cut, blank lines dropped at the end', () => {
        expect(wrapText('First week of onboarding', 11)).toEqual(['First week', 'of', 'onboarding']);
        expect(wrapText('Supercalifragilistic', 8)).toEqual(['Supercal', 'ifragili', 'stic']);
        expect(wrapText('a\nb\n\n', 10)).toEqual(['a', 'b']);
        expect(wrapText('', 10)).toEqual(['']);
    });
    test('measureNode: boxes grow with their text, to a maximum, and with a detail line', () => {
        const short = measureNode({ id: 'a', text: 'Go' });
        const long = measureNode({ id: 'b', text: 'A much longer step name here' });
        const detailed = measureNode({ id: 'c', text: 'Go', detail: 'and then some' });
        expect(long.w).toBeGreaterThan(short.w);
        expect(long.w).toBeLessThanOrEqual(200);
        expect(detailed.h).toBeGreaterThan(short.h);
        expect(measureNode({ id: 'd', text: 'A step whose name is really very long indeed, far too long for one line' }).lines.length).toBeGreaterThan(1);
    });
});

describe('process', () => {
    test('a row of equal steps with arrows between them', () => {
        const l = layoutDiagram(starterDiagram('process'));
        expect(l.boxes.map(b => b.id)).toEqual(['offer', 'day1', 'week1', 'review']);
        expect(new Set(l.boxes.map(b => `${b.w}x${b.h}`)).size).toBe(1);
        expect(new Set(l.boxes.map(b => b.y)).size).toBe(1);
        expect(l.edges.map(e => `${e.from}>${e.to}`)).toEqual(['offer>day1', 'day1>week1', 'week1>review']);
        expect(l.edges.every(e => e.arrow && e.points.length === 2)).toBe(true);
        expect(noOverlaps(l.boxes)).toBe('');
        expect(inside(l)).toBe(true);
        expect(l.titleAt).toBeDefined();
    });
    test('wraps past `wrap` per row, the row break routed as an elbow; `down` is a column', () => {
        const nodes = Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, text: `Step ${i + 1}` }));
        const l = layoutDiagram({ type: 'process', nodes, options: { wrap: 3 } });
        expect(new Set(l.boxes.map(b => b.y)).size).toBe(3);
        expect(l.boxes[3].x).toBe(l.boxes[0].x);
        expect(l.edges[2].points.length).toBe(4);
        expect(noOverlaps(l.boxes)).toBe('');
        const down = layoutDiagram({ type: 'process', nodes, options: { direction: 'down' } });
        expect(new Set(down.boxes.map(b => b.x)).size).toBe(1);
        expect(down.boxes.map(b => b.y)).toEqual([...down.boxes.map(b => b.y)].sort((a, b) => a - b));
    });
});

describe('org', () => {
    test('children centred under their parent, siblings apart, every node placed', () => {
        const d = starterDiagram('org');
        const l = layoutDiagram(d);
        expect(l.boxes.map(b => b.id).sort()).toEqual(d.nodes.map(n => n.id).sort());
        const at = (id: string) => l.boxes.find(b => b.id === id)!;
        const centre = (b: DiagramBox) => b.x + b.w / 2;
        expect(centre(at('ceo'))).toBeCloseTo((centre(at('ops')) + centre(at('fin'))) / 2, 3);
        expect(centre(at('ops'))).toBeCloseTo((centre(at('ops1')) + centre(at('ops2'))) / 2, 3);
        expect(at('ops').y).toBe(at('sales').y);
        expect(at('ops1').y).toBeGreaterThan(at('ops').y + at('ops').h);
        expect(at('ceo').depth).toBe(0);
        expect(at('ops1').depth).toBe(2);
        expect(noOverlaps(l.boxes)).toBe('');
        expect(inside(l)).toBe(true);
        // Elbows: parent bottom → bus → child top, no arrowheads.
        const e = l.edges.find(e => e.from === 'ceo' && e.to === 'sales')!;
        expect(e.points.length).toBe(4);
        expect(e.arrow).toBe(false);
        expect(e.points[3]).toEqual({ x: centre(at('sales')), y: at('sales').y });
    });
    test('a long row of leaves stacks in a column; `across` turns the tree on its side', () => {
        const nodes = [{ id: 'm', text: 'Manager' }, ...Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, text: `Report ${i + 1}`, parent: 'm' }))];
        const l = layoutDiagram({ type: 'org', nodes });
        const reports = l.boxes.filter(b => b.id.startsWith('r'));
        expect(new Set(reports.map(b => b.x)).size).toBe(1);
        expect(reports.map(b => b.y)).toEqual([...reports.map(b => b.y)].sort((a, b) => a - b));
        expect(l.width).toBeLessThan(400);
        expect(noOverlaps(l.boxes)).toBe('');
        const upright = layoutDiagram(starterDiagram('org'));
        const side = layoutDiagram({ ...starterDiagram('org'), options: { direction: 'across' } });
        // On its side: what was wide is tall; the top of the tree is at the left.
        expect(side.height).toBeGreaterThan(side.width);
        expect(side.height).toBeGreaterThan(upright.height);
        expect(Math.min(...side.boxes.map(b => b.x))).toBe(side.boxes.find(b => b.id === 'ceo')!.x);
        expect(noOverlaps(side.boxes)).toBe('');
    });
});

describe('timeline', () => {
    test('a line with a marker per node, labels alternating above and below', () => {
        const l = layoutDiagram(starterDiagram('timeline'));
        expect(l.axis).toBeDefined();
        expect(l.markers!.map(k => k.id)).toEqual(['q1', 'q2', 'q3', 'q4']);
        expect(l.markers!.every(k => k.y === l.axis!.y1)).toBe(true);
        const ys = l.boxes.map(b => b.y + b.h / 2 < l.axis!.y1 ? 'above' : 'below');
        expect(ys).toEqual(['above', 'below', 'above', 'below']);
        expect(l.boxes.map(b => b.date)).toEqual(['Jan', 'Mar', 'Jun', 'Sep']);
        expect(noOverlaps(l.boxes)).toBe('');
        expect(inside(l)).toBe(true);
        // Long labels don't collide: neighbours are on opposite sides.
        const long = layoutDiagram({ type: 'timeline', nodes: Array.from({ length: 8 }, (_, i) => ({ id: `e${i}`, text: 'A long milestone name that wraps', date: `${2020 + i}` })) });
        expect(noOverlaps(long.boxes)).toBe('');
    });
});

describe('flowchart', () => {
    test('nodes where they are, default sizes by shape, links routed as elbows with labels', () => {
        const d = starterDiagram('flowchart');
        const l = layoutDiagram(d);
        const at = (id: string) => l.boxes.find(b => b.id === id)!;
        expect(at('check').shape).toBe('decision');
        expect(at('check').h).toBeGreaterThan(at('manager').h);
        expect(at('auto').x - at('check').x).toBe(260 - 40); // relative positions kept (the margin shifts both)
        const yes = l.edges.find(e => e.label === 'yes')!;
        expect(yes.points[0].x).toBe(at('check').x + at('check').w); // out of the right side
        expect(yes.points[yes.points.length - 1].x).toBe(at('auto').x);   // into the left side
        expect(yes.labelAt).toBeDefined();
        const down = l.edges.find(e => e.from === 'start' && e.to === 'check')!;
        expect(down.points[0].y).toBe(at('start').y + at('start').h);
        expect(l.edges.every(e => e.arrow)).toBe(true);
        expect(inside(l)).toBe(true);
    });
    test('unplaced nodes go in a grid under the placed ones; a self link loops', () => {
        const d: Diagram = { type: 'flowchart', nodes: [{ id: 'a', text: 'A', x: 0, y: 0 }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }], links: [{ from: 'a', to: 'a', label: 'retry' }] };
        const l = layoutDiagram(d);
        const at = (id: string) => l.boxes.find(b => b.id === id)!;
        expect(at('b').y).toBeGreaterThan(at('a').y + at('a').h);
        expect(at('c').x).toBeGreaterThan(at('b').x);
        expect(noOverlaps(l.boxes)).toBe('');
        expect(l.edges[0].points.length).toBe(5);
    });
    test('routeOrthogonal: straight when aligned, an elbow otherwise, the nearest sides', () => {
        expect(routeOrthogonal(box('a', 0, 0), box('b', 200, 0))).toEqual([{ x: 100, y: 25 }, { x: 200, y: 25 }]);
        expect(routeOrthogonal(box('a', 0, 0), box('b', 0, 100))).toEqual([{ x: 50, y: 50 }, { x: 50, y: 100 }]);
        expect(routeOrthogonal(box('a', 0, 0), box('b', 200, 100))).toEqual([{ x: 100, y: 25 }, { x: 150, y: 25 }, { x: 150, y: 125 }, { x: 200, y: 125 }]);
        expect(routeOrthogonal(box('a', 0, 0), box('b', 20, 150))).toEqual([{ x: 50, y: 50 }, { x: 50, y: 100 }, { x: 70, y: 100 }, { x: 70, y: 150 }]);
        // Right to left and bottom to top too.
        expect(routeOrthogonal(box('a', 200, 0), box('b', 0, 0))[0]).toEqual({ x: 200, y: 25 });
        expect(routeOrthogonal(box('a', 0, 100), box('b', 0, 0))[0]).toEqual({ x: 50, y: 100 });
    });
});
