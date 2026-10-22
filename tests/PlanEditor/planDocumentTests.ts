import { ensureIds, levelOf, parsePlan, planBounds, planItems, planLevels, serializePlan, setAttributesOf, snapTo, translateItem, translatePoints } from '../../src/Editors/PlanEditor/planDocument';

const plan = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 440">
  <defs><pattern id="hatch"/></defs>
  <rect data-fixture="ground" x="20" y="20" width="560" height="400"/>
  <g data-fixture="level" data-level="0">
    <rect id="hall" data-fixture="room" x="60" y="60" width="200" height="320"/>
    <g data-fixture="room" id="apse"><rect x="300" y="60" width="100" height="100"/><path data-edge="north" d="M300 60 Q350 20 400 60"/></g>
  </g>
  <g data-fixture="level" data-level="1">
    <polygon data-fixture="room" points="60,60 200,60 200,200"/>
    <line data-fixture="wall" data-level="2" x1="0" y1="0" x2="10" y2="0"/>
  </g>
  <text x="120" y="230">Hall</text>
</svg>`;

describe('planDocument', () => {
    test('items: top-level shapes and those in storey groups, not the storeys or defs', () => {
        const root = parsePlan(plan);
        expect(planItems(root).map(e => e.localName)).toEqual(['rect', 'rect', 'g', 'polygon', 'line', 'text']);
    });

    test('storeys: an item\'s own data-level, else its group\'s, else 0', () => {
        const root = parsePlan(plan);
        expect(planItems(root).map(levelOf)).toEqual([0, 0, 0, 1, 2, 0]);
        expect(planLevels(root)).toEqual([0, 1, 2]);
    });

    test('ids are added where missing, without clashing', () => {
        const root = parsePlan(plan.replace('id="apse"', 'id="p2"'));
        ensureIds(root);
        expect(planItems(root).map(e => e.id)).toEqual(['p1', 'hall', 'p2', 'p3', 'p4', 'p5']);
    });

    test('moving: coordinates for plain shapes, a translate for paths, groups and transformed shapes', () => {
        const root = parsePlan(plan);
        const [ground, hall, apse, poly, line, text] = planItems(root);
        translateItem(hall, 10, -5);
        expect([hall.getAttribute('x'), hall.getAttribute('y')]).toEqual(['70', '55']);
        translateItem(apse, 1.5, 2);
        expect(apse.getAttribute('transform')).toBe('translate(1.5 2)');
        translateItem(apse, 1, 1);
        expect(apse.getAttribute('transform')).toBe('translate(1 1) translate(1.5 2)');
        translateItem(poly, 5, 5);
        expect(poly.getAttribute('points')).toBe('65,65 205,65 205,205');
        translateItem(line, 1, 2);
        expect(['x1', 'y1', 'x2', 'y2'].map(a => line.getAttribute(a))).toEqual(['1', '2', '11', '2']);
        translateItem(text, -20, 0);
        expect(text.getAttribute('x')).toBe('100');
        ground.setAttribute('transform', 'rotate(10)');
        translateItem(ground, 3, 4);
        expect([ground.getAttribute('x'), ground.getAttribute('transform')]).toEqual(['20', 'translate(3 4) rotate(10)']);
        expect(translatePoints('0 0, 10 10', 1, 1)).toBe('1,1 11,11');
    });

    test('attributes are set and removed; the plan serializes with its own root', () => {
        const root = parsePlan(plan);
        const hall = root.querySelector('#hall')!;
        setAttributesOf(hall, { 'data-label': 'Entrance Hall', 'data-fixture': null, width: '' });
        expect(hall.getAttribute('data-label')).toBe('Entrance Hall');
        expect(hall.hasAttribute('data-fixture') || hall.hasAttribute('width')).toBe(false);
        const text = serializePlan(root);
        expect(text.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 440">')).toBe(true);
        expect(text).toContain('data-label="Entrance Hall"');
    });

    test('snapping and bounds', () => {
        expect(snapTo(26, 25)).toBe(25);
        expect(snapTo(38, 25)).toBe(50);
        expect(snapTo(38, 0)).toBe(38);
        expect(planBounds(parsePlan(plan))).toEqual({ x: 0, y: 0, width: 600, height: 440 });
        expect(planBounds(parsePlan('<svg xmlns="http://www.w3.org/2000/svg" width="300px" height="200"/>'))).toEqual({ x: 0, y: 0, width: 300, height: 200 });
        expect(() => parsePlan('<html/>')).toThrow('Not an SVG plan');
    });
});

import { containerFor, cornersOf, formatPoints, nearestEdge, nearestPoint, parsePoints, rectFrom, snapAngle } from '../../src/Editors/PlanEditor/planDocument';

describe('planDocument: drawing', () => {
    test('points parse and format', () => {
        expect(parsePoints('0,0 10 5, 20,20')).toEqual([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 20 }]);
        expect(formatPoints([{ x: 1.23456, y: 2 }])).toBe('1.235,2');
    });

    test('Shift snaps to 45° steps, keeping the distance along the snapped direction', () => {
        expect(snapAngle({ x: 0, y: 0 }, { x: 100, y: 8 })).toEqual({ x: 100, y: 0 });
        expect(snapAngle({ x: 0, y: 0 }, { x: -6, y: 50 })).toEqual({ x: 0, y: 50 });
        const d = snapAngle({ x: 0, y: 0 }, { x: 50, y: 45 });
        expect(d.x).toBeCloseTo(47.5, 2);
        expect(d.y).toBeCloseTo(47.5, 2);
    });

    test('corners to snap to, the nearest within tolerance, and edges to add a point on', () => {
        const root = parsePlan(`<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="100" height="50"/><polygon points="0,0 10,0 10,10"/><rect transform="rotate(5)" x="0" y="0" width="1" height="1"/></svg>`);
        const [rect, poly, turned] = Array.from(root.children);
        expect(cornersOf(rect)).toEqual([{ x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 60 }, { x: 10, y: 60 }]);
        expect(cornersOf(poly)).toHaveLength(3);
        expect(cornersOf(turned)).toEqual([]);
        expect(nearestPoint(cornersOf(rect), { x: 107, y: 12 }, 5)).toEqual({ x: 110, y: 10 });
        expect(nearestPoint(cornersOf(rect), { x: 60, y: 30 }, 5)).toBeUndefined();
        expect(nearestEdge(cornersOf(rect), true, { x: 60, y: 12 }, 5)).toEqual({ index: 0, at: { x: 60, y: 10 } });
        expect(nearestEdge(cornersOf(rect), true, { x: 12, y: 30 }, 5)).toEqual({ index: 3, at: { x: 10, y: 30 } });
        expect(nearestEdge(cornersOf(rect), false, { x: 12, y: 30 }, 5)).toBeUndefined();
    });

    test('rects from two corners, at least a minimum size', () => {
        expect(rectFrom({ x: 50, y: 40 }, { x: 10, y: 10 })).toEqual({ x: 10, y: 10, width: 40, height: 30 });
        expect(rectFrom({ x: 0, y: 0 }, { x: 0, y: 5 }, 10)).toEqual({ x: 0, y: 0, width: 10, height: 10 });
    });

    test('new shapes go in their storey\'s group, made in order when missing', () => {
        const flat = parsePlan('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
        expect(containerFor(flat, 0)).toBe(flat);
        const root = parsePlan('<svg xmlns="http://www.w3.org/2000/svg"><g data-fixture="level" data-level="0"/><g data-fixture="level" data-level="2"/></svg>');
        expect(containerFor(root, 2)).toBe(root.children[1]);
        const one = containerFor(root, 1);
        expect(Array.from(root.children).map(g => g.getAttribute('data-level'))).toEqual(['0', '1', '2']);
        expect(one.getAttribute('data-fixture')).toBe('level');
        containerFor(root, -1);
        expect(Array.from(root.children).map(g => g.getAttribute('data-level'))).toEqual(['-1', '0', '1', '2']);
    });
});
