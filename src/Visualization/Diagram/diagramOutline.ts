// The diagram editor's outline as pure functions, so they are unit-tested: which moves a row can make
// (the toolbar's arrows are off when there's nowhere to go) and dropping a row on another (the grip).
import type { Diagram, DiagramNode } from './diagramModel';

/** The rows in a row's group: the people with the same manager (org), or every row. */
function group(diagram: Diagram, node: DiagramNode): DiagramNode[] {
    return diagram.type === 'org' ? diagram.nodes.filter(n => n.parent === node.parent) : diagram.nodes;
}

/** Whether Move up (-1) or Move down (1) has somewhere to go. */
export function canMove(diagram: Diagram, id: string | null, delta: -1 | 1): boolean {
    const node = diagram.nodes.find(n => n.id === id);
    if (!node) return false;
    const rows = group(diagram, node);
    const to = rows.indexOf(node) + delta;
    return to >= 0 && to < rows.length;
}

/** org: whether "under the one above" (`deeper`) or "up a level" has somewhere to go. */
export function canIndent(diagram: Diagram, id: string | null, deeper: boolean): boolean {
    const node = diagram.nodes.find(n => n.id === id);
    if (!node || diagram.type !== 'org') return false;
    return deeper ? group(diagram, node).indexOf(node) > 0 : node.parent !== undefined;
}

/** Whether `id` is `of` or anywhere under it. */
function inSubtree(diagram: Diagram, id: string, of: string): boolean {
    let at: string | undefined = id;
    const seen = new Set<string>();
    while (at !== undefined && !seen.has(at)) {
        if (at === of) return true;
        seen.add(at);
        at = diagram.nodes.find(n => n.id === at)?.parent;
    }
    return false;
}

/** The nodes in tree order (org: depth first), so the array stays the outline's order. */
export function treeOrder(nodes: DiagramNode[], type: Diagram['type']): DiagramNode[] {
    if (type !== 'org') return nodes;
    const ids = new Set(nodes.map(n => n.id));
    const out: DiagramNode[] = [];
    const walk = (id: string | undefined) => {
        for (const child of nodes.filter(n => (n.parent !== undefined && ids.has(n.parent) ? n.parent : undefined) === id)) {
            out.push(child);
            walk(child.id);
        }
    };
    walk(undefined);
    return out;
}

/**
 * A copy of `diagram` with row `id` dropped before or after row `target`; null when that changes
 * nothing, or can't be (a person dropped on someone under them). In an org chart the row, and everyone
 * under it, joins the target's group. Dropped after someone who has people under them, it becomes
 * their first, as that's where it lands in the outline.
 */
export function dropRow(diagram: Diagram, id: string, target: string, after: boolean): Diagram | null {
    if (id === target) return null;
    const org = diagram.type === 'org';
    if (org && inSubtree(diagram, target, id)) return null;
    const next: Diagram = JSON.parse(JSON.stringify(diagram));
    const node = next.nodes.find(n => n.id === id);
    const onto = next.nodes.find(n => n.id === target);
    if (!node || !onto) return null;
    if (org) {
        const firstChild = after && next.nodes.some(n => n.parent === target && n.id !== id);
        const parent = firstChild ? target : onto.parent;
        if (parent === undefined) delete node.parent; else node.parent = parent;
    }
    next.nodes.splice(next.nodes.indexOf(node), 1);
    next.nodes.splice(next.nodes.indexOf(onto) + (after ? 1 : 0), 0, node);
    next.nodes = treeOrder(next.nodes, next.type);
    if (org && next.nodes.every(n => n.parent !== undefined)) return null; // nobody left at the top
    return JSON.stringify(next.nodes) === JSON.stringify(diagram.nodes) ? null : next;
}
