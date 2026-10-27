import { diagramText, parseDiagram, starterDiagram, DiagramTypes } from '../../src/Visualization/Diagram/diagramModel';

describe('parseDiagram', () => {
    test('reads JSON text or an object, keeping only what the schema knows', () => {
        const r = parseDiagram('{"type":"process","title":" Onboarding ","nodes":[{"id":"a","text":"Offer","extra":1},{"id":2,"text":"Day one","detail":"HR"}],"links":[{"from":"a","to":2,"label":"then"}],"options":{"direction":"down","wrap":3.7,"mystery":true}}');
        expect(r.errors).toEqual([]);
        expect(r.warnings).toEqual([]);
        expect(r.diagram).toEqual({
            type: 'process', title: 'Onboarding',
            nodes: [{ id: 'a', text: 'Offer' }, { id: '2', text: 'Day one', detail: 'HR' }],
            links: [{ from: 'a', to: '2', label: 'then' }],
            options: { direction: 'down', wrap: 3 },
        });
        expect(parseDiagram({ type: 'timeline', nodes: [{ id: 'x', text: 'X', date: '2026' }] }).diagram?.nodes[0].date).toBe('2026');
    });

    test('errors: bad JSON, no type, no nodes, duplicate ids, links to nowhere', () => {
        expect(parseDiagram('{oops').errors[0]).toMatch(/Not valid JSON/);
        expect(parseDiagram('[]').errors[0]).toMatch(/object/);
        expect(parseDiagram({ type: 'mindmap', nodes: [{ id: 'a' }] }).errors[0]).toMatch(/"type" must be one of process, org, timeline, flowchart \(not "mindmap"\)/);
        expect(parseDiagram({ type: 'process', nodes: [] }).errors[0]).toMatch(/at least one node/);
        expect(parseDiagram({ type: 'process', nodes: [{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }] }).errors).toEqual(['node 2: the id "a" is used twice.']);
        const r = parseDiagram({ type: 'flowchart', nodes: [{ id: 'a', text: 'A' }], links: [{ from: 'a', to: 'zz' }] });
        expect(r.errors).toEqual(['link 1: "to" names no node ("zz").']);
        expect(r.diagram).toBeNull();
    });

    test('warnings: things ignored, with the diagram still drawn', () => {
        const r = parseDiagram({ type: 'flowchart', nodes: [{ id: 'a', text: 'A', shape: 'cloud', x: 10, w: -5 }, { id: 'b' }], options: { direction: 'sideways' } });
        expect(r.errors).toEqual([]);
        expect(r.warnings).toEqual([
            'node 1 ("a"): "shape" must be one of box, rounded, decision, start-end; using box.',
            'node 1 ("a"): size must be positive; using the default.',
            'node 2 ("b"): no "text".',
            '"options.direction" must be across or down; ignored.',
            'node "a": both "x" and "y" are needed; placed automatically.',
        ]);
        expect(r.diagram?.nodes[0]).toEqual({ id: 'a', text: 'A', x: 10 });
    });

    test('org: parents must exist, no cycles, one top', () => {
        expect(parseDiagram({ type: 'org', nodes: [{ id: 'a', text: 'A', parent: 'q' }] }).errors).toEqual(['node "a": "parent" names no node ("q").']);
        expect(parseDiagram({ type: 'org', nodes: [{ id: 'a', text: 'A', parent: 'b' }, { id: 'b', text: 'B', parent: 'a' }] }).errors).toContain('node "a": its managers go round in a circle.');
        expect(parseDiagram({ type: 'org', nodes: [{ id: 'a', text: 'A', parent: 'a' }] }).errors).toContain('node "a" is its own parent.');
        expect(parseDiagram({ type: 'org', nodes: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B', parent: 'a' }] }).errors).toEqual([]);
    });

    test('starters parse clean and round-trip through diagramText', () => {
        for (const type of DiagramTypes) {
            const starter = starterDiagram(type);
            const r = parseDiagram(diagramText(starter));
            expect(r.errors).toEqual([]);
            expect(r.warnings).toEqual([]);
            expect(r.diagram).toEqual(starter);
        }
        expect(diagramText(starterDiagram('process'))).toMatch(/^\{\n {2}"type": "process",\n {2}"title": "Onboarding",\n {2}"nodes": \[/);
    });
});
