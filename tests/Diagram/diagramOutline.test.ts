import { canIndent, canMove, dropRow } from '../../src/Visualization/Diagram/diagramOutline';
import type { Diagram } from '../../src/Visualization/Diagram/diagramModel';

const org: Diagram = {
    type: 'org',
    nodes: [
        { id: 'a', text: 'Head' },
        { id: 'b', text: 'B', parent: 'a' },
        { id: 'b1', text: 'B1', parent: 'b' },
        { id: 'c', text: 'C', parent: 'a' },
        { id: 'd', text: 'D', parent: 'a' },
    ],
};
const steps: Diagram = { type: 'process', nodes: [{ id: 'x', text: 'X' }, { id: 'y', text: 'Y' }, { id: 'z', text: 'Z' }] };
const order = (d: Diagram | null) => d?.nodes.map(n => n.id).join(' ');

describe('canMove', () => {
    test('is off at either end of the row\'s group, and with nothing picked', () => {
        expect(canMove(org, 'b', -1)).toBe(false);
        expect(canMove(org, 'b', 1)).toBe(true);
        expect(canMove(org, 'd', 1)).toBe(false);
        expect(canMove(org, 'd', -1)).toBe(true);
        expect(canMove(org, 'a', -1)).toBe(false);
        expect(canMove(org, 'a', 1)).toBe(false);
        expect(canMove(org, null, 1)).toBe(false);
        expect(canMove(steps, 'y', -1)).toBe(true);
        expect(canMove(steps, 'z', 1)).toBe(false);
    });
});

describe('canIndent', () => {
    test('needs someone above in the group to go under, and a manager to go up from', () => {
        expect(canIndent(org, 'b', true)).toBe(false);
        expect(canIndent(org, 'c', true)).toBe(true);
        expect(canIndent(org, 'a', false)).toBe(false);
        expect(canIndent(org, 'b1', false)).toBe(true);
        expect(canIndent(steps, 'y', true)).toBe(false);
    });
});

describe('dropRow', () => {
    test('a flat list: before and after', () => {
        expect(order(dropRow(steps, 'z', 'x', false))).toBe('z x y');
        expect(order(dropRow(steps, 'x', 'z', true))).toBe('y z x');
    });

    test('a drop that changes nothing is null', () => {
        expect(dropRow(steps, 'x', 'x', true)).toBeNull();
        expect(dropRow(steps, 'x', 'y', false)).toBeNull();
        expect(dropRow(steps, 'y', 'x', true)).toBeNull();
    });

    test('org: joins the target\'s group, with everyone under it', () => {
        const moved = dropRow(org, 'b', 'd', true)!;
        expect(order(moved)).toBe('a c d b b1');
        expect(moved.nodes.find(n => n.id === 'b')?.parent).toBe('a');
        expect(moved.nodes.find(n => n.id === 'b1')?.parent).toBe('b');
        const under = dropRow(org, 'd', 'b1', false)!;
        expect(under.nodes.find(n => n.id === 'd')?.parent).toBe('b');
        expect(order(under)).toBe('a b d b1 c');
    });

    test('org: dropped after someone with people under them, it becomes their first', () => {
        const moved = dropRow(org, 'd', 'b', true)!;
        expect(moved.nodes.find(n => n.id === 'd')?.parent).toBe('b');
        expect(order(moved)).toBe('a b d b1 c');
    });

    test('org: dropped after the head, it is the first under them', () => {
        const moved = dropRow(org, 'c', 'a', true)!;
        expect(moved.nodes.find(n => n.id === 'c')?.parent).toBe('a');
        expect(order(moved)).toBe('a c b b1 d');
    });

    test('org: never under itself', () => {
        expect(dropRow(org, 'b', 'b1', true)).toBeNull();
        expect(dropRow(org, 'a', 'c', true)).toBeNull();
    });

    test('the original is left as it was', () => {
        const before = JSON.stringify(org);
        dropRow(org, 'b', 'd', true);
        expect(JSON.stringify(org)).toBe(before);
    });
});
