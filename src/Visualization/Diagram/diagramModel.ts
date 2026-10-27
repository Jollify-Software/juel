// The diagram model (DASHBOARD-PLAN §8.4 as decided 2026-10-27: our own JSON, no text syntax).
// A diagram is an asset (`assets/diagrams/<name>.json`) drawn by `<juel-diagram>` and edited in
// `<juel-diagram-editor>`; `parseDiagram` reads one from JSON text or a parsed object, validating
// it and reporting every problem it finds (errors stop the drawing; warnings don't).
//
//   { "type": "process", "title": "Onboarding",
//     "nodes": [ { "id": "a", "text": "Offer" }, { "id": "b", "text": "First day", "detail": "HR, IT" } ],
//     "links": [ { "from": "a", "to": "b", "label": "signed" } ],
//     "options": { "direction": "across" } }
//
// Per type: process = the nodes in order (direction across | down; `wrap` per row); org = `parent`
// (direction down | across); timeline = `date` (or any label) in order; flowchart = `shape` and
// `x`, `y`, `w`, `h`, placed freely, with `links` between them. Links are optional on the other
// types (an extra arrow). Pure: no DOM.

export type DiagramType = 'process' | 'org' | 'timeline' | 'flowchart';
export const DiagramTypes: readonly DiagramType[] = ['process', 'org', 'timeline', 'flowchart'];

export type FlowShape = 'box' | 'rounded' | 'decision' | 'start-end';
export const FlowShapes: readonly FlowShape[] = ['box', 'rounded', 'decision', 'start-end'];

export type DiagramDirection = 'across' | 'down';

export interface DiagramNode {
    id: string;
    text: string;
    /** A second, smaller line. */
    detail?: string;
    /** A CSS colour for the node's fill (default: the theme's accent, or `--chart-N` by depth). */
    colour?: string;
    /** An mdi icon name (`mdi-account`), drawn before the text. */
    icon?: string;
    /** org: the manager's id; none for the root. */
    parent?: string;
    /** timeline: the marker's label (a date, or anything). */
    date?: string;
    /** flowchart: the shape; default `box`. */
    shape?: FlowShape;
    /** flowchart: position and size, in diagram units (px at scale 1). */
    x?: number;
    y?: number;
    w?: number;
    h?: number;
}

export interface DiagramLink {
    from: string;
    to: string;
    label?: string;
}

export interface DiagramOptions {
    /** process: across (default) | down; org: down (default) | across. */
    direction?: DiagramDirection;
    /** process: steps per row before wrapping (default 5). */
    wrap?: number;
    /** A second style per type, for later (`options.look`). */
    look?: string;
}

export interface Diagram {
    type: DiagramType;
    title?: string;
    nodes: DiagramNode[];
    links?: DiagramLink[];
    options?: DiagramOptions;
}

export interface DiagramParseResult {
    /** The diagram, cleaned (ids as strings, defaults left out); null when there are errors. */
    diagram: Diagram | null;
    errors: string[];
    warnings: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Reads a diagram from JSON text or an already-parsed value. Every problem is reported, with
 * the node it concerns; `diagram` is null if any is an error. Unknown keys are kept out (they
 * aren't errors, so a newer file still draws).
 */
export function parseDiagram(input: unknown): DiagramParseResult {
    const errors: string[] = [], warnings: string[] = [];
    let value = input;
    if (typeof input === 'string') {
        try { value = JSON.parse(input); } catch (e) { return { diagram: null, errors: [`Not valid JSON: ${(e as Error).message}`], warnings }; }
    }
    if (!isRecord(value)) return { diagram: null, errors: ['A diagram is an object with "type" and "nodes".'], warnings };

    const type = value.type;
    if (typeof type !== 'string' || !DiagramTypes.includes(type as DiagramType))
        errors.push(`"type" must be one of ${DiagramTypes.join(', ')}${typeof type === 'string' ? ` (not "${type}")` : ''}.`);
    const title = typeof value.title === 'string' && value.title.trim() ? value.title.trim() : undefined;
    if (value.title !== undefined && typeof value.title !== 'string') warnings.push('"title" should be text; ignored.');

    const nodes: DiagramNode[] = [];
    const ids = new Set<string>();
    if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
        errors.push('"nodes" must be a list with at least one node.');
    } else {
        value.nodes.forEach((raw, i) => {
            const where = `node ${i + 1}`;
            if (!isRecord(raw)) { errors.push(`${where}: not an object.`); return; }
            const id = raw.id === undefined ? String(i + 1) : typeof raw.id === 'string' || typeof raw.id === 'number' ? String(raw.id) : '';
            if (!id.trim()) { errors.push(`${where}: "id" must be text.`); return; }
            if (ids.has(id)) { errors.push(`${where}: the id "${id}" is used twice.`); return; }
            ids.add(id);
            const node: DiagramNode = { id, text: typeof raw.text === 'string' ? raw.text : raw.text === undefined ? '' : String(raw.text) };
            if (raw.text === undefined) warnings.push(`${where} ("${id}"): no "text".`);
            for (const key of ['detail', 'colour', 'icon', 'parent', 'date'] as const) {
                const v = raw[key] ?? (key === 'colour' ? raw.color : undefined);
                if (v === undefined || v === null || v === '') continue;
                if (typeof v === 'string' || typeof v === 'number') node[key] = String(v);
                else warnings.push(`${where} ("${id}"): "${key}" should be text; ignored.`);
            }
            if (raw.shape !== undefined) {
                if (typeof raw.shape === 'string' && FlowShapes.includes(raw.shape as FlowShape)) node.shape = raw.shape as FlowShape;
                else warnings.push(`${where} ("${id}"): "shape" must be one of ${FlowShapes.join(', ')}; using box.`);
            }
            for (const key of ['x', 'y', 'w', 'h'] as const) {
                if (raw[key] === undefined) continue;
                if (isFiniteNumber(raw[key])) node[key] = raw[key] as number;
                else warnings.push(`${where} ("${id}"): "${key}" must be a number; ignored.`);
            }
            if ((node.w !== undefined && node.w <= 0) || (node.h !== undefined && node.h <= 0)) { warnings.push(`${where} ("${id}"): size must be positive; using the default.`); delete node.w; delete node.h; }
            nodes.push(node);
        });
    }

    const links: DiagramLink[] = [];
    if (value.links !== undefined) {
        if (!Array.isArray(value.links)) errors.push('"links" must be a list.');
        else value.links.forEach((raw, i) => {
            const where = `link ${i + 1}`;
            if (!isRecord(raw)) { errors.push(`${where}: not an object.`); return; }
            const from = raw.from === undefined ? '' : String(raw.from), to = raw.to === undefined ? '' : String(raw.to);
            if (!ids.has(from)) { errors.push(`${where}: "from" names no node ("${from}").`); return; }
            if (!ids.has(to)) { errors.push(`${where}: "to" names no node ("${to}").`); return; }
            const link: DiagramLink = { from, to };
            if (raw.label !== undefined && raw.label !== null && raw.label !== '') link.label = String(raw.label);
            links.push(link);
        });
    }

    const options: DiagramOptions = {};
    if (value.options !== undefined) {
        if (!isRecord(value.options)) warnings.push('"options" should be an object; ignored.');
        else {
            const o = value.options;
            if (o.direction !== undefined) {
                if (o.direction === 'across' || o.direction === 'down') options.direction = o.direction;
                else warnings.push('"options.direction" must be across or down; ignored.');
            }
            if (o.wrap !== undefined) {
                if (isFiniteNumber(o.wrap) && o.wrap >= 1) options.wrap = Math.floor(o.wrap);
                else warnings.push('"options.wrap" must be a number of 1 or more; ignored.');
            }
            if (typeof o.look === 'string' && o.look.trim()) options.look = o.look.trim();
        }
    }

    // Per-type checks.
    if (type === 'org') {
        for (const node of nodes) {
            if (node.parent !== undefined && !ids.has(node.parent)) errors.push(`node "${node.id}": "parent" names no node ("${node.parent}").`);
            if (node.parent === node.id) errors.push(`node "${node.id}" is its own parent.`);
        }
        // A cycle: walk up from each node; the walk must end at a root.
        const byId = new Map(nodes.map(n => [n.id, n]));
        for (const node of nodes) {
            const seen = new Set<string>();
            let at: DiagramNode | undefined = node;
            while (at?.parent !== undefined && ids.has(at.parent)) {
                if (seen.has(at.id)) { errors.push(`node "${node.id}": its managers go round in a circle.`); break; }
                seen.add(at.id);
                at = byId.get(at.parent);
            }
        }
        if (!errors.length && nodes.every(n => n.parent !== undefined)) errors.push('An org chart needs a node with no "parent" (the top).');
    }
    if (type === 'flowchart') {
        for (const node of nodes) {
            if ((node.x === undefined) !== (node.y === undefined)) warnings.push(`node "${node.id}": both "x" and "y" are needed; placed automatically.`);
        }
    }
    if (type === 'process' || type === 'timeline') {
        for (const node of nodes) if (node.parent !== undefined) warnings.push(`node "${node.id}": "parent" means nothing in a ${type}; ignored.`);
    }

    if (errors.length) return { diagram: null, errors, warnings };
    const diagram: Diagram = { type: type as DiagramType, nodes };
    if (title) diagram.title = title;
    if (links.length) diagram.links = links;
    if (Object.keys(options).length) diagram.options = options;
    return { diagram, errors, warnings };
}

/** The diagram as JSON text for its asset file (two-space indent, keys in a steady order). */
export function diagramText(diagram: Diagram): string {
    const node = (n: DiagramNode) => {
        const out: Record<string, unknown> = { id: n.id, text: n.text };
        for (const key of ['detail', 'colour', 'icon', 'parent', 'date', 'shape', 'x', 'y', 'w', 'h'] as const) if (n[key] !== undefined) out[key] = n[key];
        return out;
    };
    const out: Record<string, unknown> = { type: diagram.type };
    if (diagram.title) out.title = diagram.title;
    out.nodes = diagram.nodes.map(node);
    if (diagram.links?.length) out.links = diagram.links.map(l => l.label ? { from: l.from, to: l.to, label: l.label } : { from: l.from, to: l.to });
    if (diagram.options && Object.keys(diagram.options).length) out.options = diagram.options;
    return JSON.stringify(out, null, 2) + '\n';
}

/** A starter diagram of each type, for Insert › Diagram › New (business-shaped, not lorem ipsum). */
export function starterDiagram(type: DiagramType): Diagram {
    switch (type) {
        case 'process': return {
            type, title: 'Onboarding',
            nodes: [
                { id: 'offer', text: 'Offer', detail: 'Contract signed' },
                { id: 'day1', text: 'First day', detail: 'Laptop, badge, buddy' },
                { id: 'week1', text: 'First week', detail: 'Team intros' },
                { id: 'review', text: 'Review', detail: 'At 30 days' },
            ],
        };
        case 'org': return {
            type, title: 'Our team',
            nodes: [
                { id: 'ceo', text: 'Alex Morgan', detail: 'Managing Director' },
                { id: 'ops', text: 'Sam Lee', detail: 'Operations', parent: 'ceo' },
                { id: 'sales', text: 'Jo Patel', detail: 'Sales', parent: 'ceo' },
                { id: 'fin', text: 'Chris Diaz', detail: 'Finance', parent: 'ceo' },
                { id: 'ops1', text: 'Dana Kim', detail: 'Logistics', parent: 'ops' },
                { id: 'ops2', text: 'Riley Chen', detail: 'Support', parent: 'ops' },
                { id: 'sales1', text: 'Taylor Reed', detail: 'Accounts', parent: 'sales' },
            ],
        };
        case 'timeline': return {
            type, title: 'Roadmap',
            nodes: [
                { id: 'q1', date: 'Jan', text: 'Kick-off', detail: 'Team in place' },
                { id: 'q2', date: 'Mar', text: 'Pilot', detail: 'Three customers' },
                { id: 'q3', date: 'Jun', text: 'Launch', detail: 'General release' },
                { id: 'q4', date: 'Sep', text: 'Review', detail: 'What next' },
            ],
        };
        case 'flowchart': return {
            type, title: 'Expense claim',
            nodes: [
                { id: 'start', text: 'Claim submitted', shape: 'start-end', x: 40, y: 40 },
                { id: 'check', text: 'Under £100?', shape: 'decision', x: 40, y: 160 },
                { id: 'auto', text: 'Approved automatically', shape: 'rounded', x: 260, y: 160 },
                { id: 'manager', text: 'Manager reviews', shape: 'box', x: 40, y: 300 },
                { id: 'paid', text: 'Paid', shape: 'start-end', x: 260, y: 300 },
            ],
            links: [
                { from: 'start', to: 'check' },
                { from: 'check', to: 'auto', label: 'yes' },
                { from: 'check', to: 'manager', label: 'no' },
                { from: 'auto', to: 'paid' },
                { from: 'manager', to: 'paid', label: 'approved' },
            ],
        };
    }
}
