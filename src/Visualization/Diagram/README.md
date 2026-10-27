# Diagrams

Our own diagrams, for business people who never type a diagram syntax: a diagram is a
small JSON asset, drawn by `<juel-diagram>` and edited visually in `<juel-diagram-editor>`
(no Mermaid, no text form; Jollify's `DASHBOARD-PLAN.md` §8.4 as decided 2026-10-27). Four
types, each laid out from its structure except the flowchart, which is placed by hand:

| Type | What | Laid out from |
|---|---|---|
| `process` | Steps with arrows, across (wrapping past `options.wrap` per row) or down | the order of `nodes` |
| `org` | An org chart: a tidy tree, children centred under their manager; many reports stack in a column; `direction: across` turns it on its side | `parent` |
| `timeline` | A line with dated markers, labels alternating above and below | the order of `nodes`, `date` |
| `flowchart` | Boxes, decisions and start/end pills where you put them, linked by orthogonal arrows | `shape`, `x`, `y`, `w`, `h`, `links` |

Built in pieces (night 13, 2026-10-27):

| Piece | What | State |
|---|---|---|
| C1 | `diagramModel.ts`: the schema, `parseDiagram` (errors and warnings, with the node named), `diagramText`, `starterDiagram` | Done |
| C2 | `diagramLayout.ts`: pure layout, boxes + edges in diagram units; `wrapText`, `measureNode`, `routeOrthogonal` | Done |
| C3 | `<juel-diagram>`: draws a layout as SVG, themed from the page's tokens, scaled to its box | Done |
| C5 | `<juel-diagram-editor>`: the outline (process, org, timeline) and the canvas (flowchart), undo/redo | |

## The model

```json
{ "type": "process", "title": "Onboarding",
  "nodes": [
    { "id": "offer", "text": "Offer", "detail": "Contract signed" },
    { "id": "day1",  "text": "First day", "detail": "Laptop, badge, buddy", "colour": "#2a7", "icon": "mdi-laptop" }
  ],
  "links": [ { "from": "offer", "to": "day1", "label": "signed" } ],
  "options": { "direction": "across", "wrap": 5 } }
```

- `nodes[]`: `id` (text; a number is read as text; missing ids are numbered), `text`, and
  optionally `detail` (a second, smaller line), `colour` (any CSS colour; `color` is read
  too), `icon` (an mdi name). Per type: `parent` (org), `date` (timeline; any label),
  `shape` (`box` | `rounded` | `decision` | `start-end`) with `x`, `y`, `w`, `h` (flowchart;
  a node with no position is placed in a grid under the rest).
- `links[]`: `from`, `to`, optional `label`. The flowchart's arrows; on the other types an
  extra arrow on top of the layout.
- `options`: `direction` (`across` | `down`), `wrap` (process, steps per row, default 5),
  `look` (a second style per type, later).

`parseDiagram(textOrObject)` returns `{ diagram, errors, warnings }`: an unknown type, no
nodes, a duplicate id, a link or parent naming no node, a cycle of managers, or an org chart
with no top are **errors** (`diagram` is null); an unknown shape, a non-number position, a
missing `text` or a key that means nothing on that type are **warnings** (the diagram still
draws). Unknown keys are dropped quietly. `diagramText(diagram)` writes the asset file
(two-space JSON, keys in a steady order); `starterDiagram(type)` is Insert › Diagram › New.

## The layout

`layoutDiagram(diagram, metrics?)` → `{ width, height, boxes, edges, axis?, markers?, title? }`,
in diagram units (px at scale 1; the drawing scales the whole thing to its box). Each box
carries its wrapped `lines` and `detailLines`, so the drawing never overflows: text is
measured by an average glyph width (`metrics.charWidth` × the font size), there being no
DOM here. Boxes grow with their text between `minBoxWidth` and `maxBoxWidth`, then wrap.
Within a process, org chart or timeline every box is the size of the biggest, which reads
tidier than a ragged row. Edges are polylines; `arrow` says whether to draw a head
(process and flowchart arrows do, an org chart's connectors and a timeline's stems don't);
a `label` sits at `labelAt`, the middle of the longest segment. `routeOrthogonal(a, b)`
leaves by the side facing the other box and bends once or twice in the gap.

## `<juel-diagram>`

```html
<juel-diagram src="assets/diagrams/onboarding.json"></juel-diagram>
<juel-diagram><script type="application/json">{ "type": "process", "nodes": [ … ] }</script></juel-diagram>
<script>document.querySelector('juel-diagram').data = juel.diagram.starterDiagram('org');</script>
```

The model comes from the `data` property (an object or JSON text), a
`<script type="application/json">` child (how Slipway writes a deck's diagram inline, so the
page is self-contained), or a `src` URL. It draws the layout as one `<svg>` with a `viewBox`
in diagram units and `width: 100%; height: auto`, so it scales to its box and prints as it
shows. Colours are the page's tokens with plain fallbacks: `--chart-1` / `--chart-2` /
`--chart-3` (else `--accent`) fill nodes by depth (org) or kind (flowchart: decisions and
start/end pills take the second), `--chart-on-fill` is the text on them, `--ink` /
`--muted` / `--line` / `--card` / `--bg` the rest, so one asset draws in any deck's look,
light or dark. A node's own `colour` wins. A model with errors draws the problems as text
(`.problem`). `diagram-drawn` fires with `{ layout, warnings }`; `currentLayout` is the
last layout (the editor reads it to find what was clicked). The helpers are also on
`window.juel.diagram` (`parseDiagram`, `diagramText`, `starterDiagram`, `layoutDiagram`)
for pages on the CDN build. Not yet drawn: a node's `icon`.

Tests: `tests/Diagram/diagramModel.test.ts` and `tests/Diagram/diagramLayout.test.ts`
(jest): every node placed, no boxes overlapping, sizes growing with text, routes by side;
`tests/e2e/diagram.spec.ts` (Playwright) on `examples/Visualization/Diagram/diagram.html`:
each type draws inside its box with nothing overlapping, a broken model shows its problems,
the drawing scales, a dark look recolours it.
