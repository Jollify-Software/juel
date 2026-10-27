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
| C5 | `<juel-diagram-editor>`: the outline (process, org, timeline) and the canvas (flowchart), undo/redo | Done |

## The model

```json
{ "type": "process", "title": "Onboarding",
  "nodes": [
    { "id": "offer", "text": "Offer", "detail": "Contract signed" },
    { "id": "day1",  "text": "First day", "detail": "Laptop, badge, buddy", "colour": "#2a7", "icon": "lucide-plus" }
  ],
  "links": [ { "from": "offer", "to": "day1", "label": "signed" } ],
  "options": { "direction": "across", "wrap": 5 } }
```

- `nodes[]`: `id` (text; a number is read as text; missing ids are numbered), `text`, and
  optionally `detail` (a second, smaller line), `colour` (any CSS colour; `color` is read
  too), `icon` (a bundled Lucide glyph name, `lucide-plus`). Per type: `parent` (org), `date` (timeline; any label),
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
<juel-diagram data-model='{ "type": "process", "nodes": [ … ] }'></juel-diagram>
<script>document.querySelector('juel-diagram').data = juel.diagram.starterDiagram('org');</script>
```

The model comes from the `data` property (an object or JSON text), a `data-model` attribute
(its JSON text: how Slipway writes a deck's or report's diagram inline, so the page is
self-contained; an attribute, not a script child, because Paged.js drops `<script>` children
when it lays a report's content into pages), a `<script type="application/json">` child, or a
`src` URL. It draws the layout as one `<svg>` with a `viewBox`
in diagram units and `width: 100%; height: auto`, so it scales to its box and prints as it
shows. Colours are the page's tokens with plain fallbacks: `--chart-1` / `--chart-2` /
`--chart-3` (else `--accent`) fill nodes by depth (org) or kind (flowchart: decisions and
start/end pills take the second), `--chart-on-fill` is the text on them, `--ink` /
`--muted` / `--line` / `--card` / `--bg` the rest, so one asset draws in any deck's look,
light or dark. A node's own `colour` wins. A model with errors draws the problems as text
(`.problem`). `diagram-drawn` fires with `{ layout, warnings }`; `currentLayout` is the
last layout (the editor reads it to find what was clicked). The helpers are also on
`window.juel.diagram` (`parseDiagram`, `diagramText`, `starterDiagram`, `layoutDiagram`)
for pages on the CDN build. A node's `icon` is a bundled Lucide glyph name (the set is
`src/_Modules/Icons/Lucide.ts`), drawn inline before the text in the text's colour; any other
name draws nothing (an mdi name can't be bundled for offline use).

Tests: `tests/Diagram/diagramModel.test.ts` and `tests/Diagram/diagramLayout.test.ts`
(jest): every node placed, no boxes overlapping, sizes growing with text, routes by side;
`tests/e2e/diagram.spec.ts` (Playwright) on `examples/Visualization/Diagram/diagram.html`:
each type draws inside its box with nothing overlapping, a broken model shows its problems,
the drawing scales, a dark look recolours it.

## `<juel-diagram-editor>`

```html
<juel-diagram-editor></juel-diagram-editor>
<script>
  const editor = document.querySelector('juel-diagram-editor');
  editor.value = juel.diagram.starterDiagram('org');          // the model in (copied)
  editor.addEventListener('diagram-changed', e => save(e.detail.diagram)); // { diagram, reason }
</script>
```

Edits a model visually, with a live `<juel-diagram>` beside it; **no syntax anywhere**. The
way of working follows the diagram's type:

- **process, org, timeline: an outline.** A row per node (an org chart's indented by depth):
  the text, a detail (an org chart's role), a date (timeline), a colour, Remove. **Enter**
  adds the next one after it (an org chart: a sibling, or the first report of someone who
  has reports), **Tab** / **Shift+Tab** put a person under the one above or lift them a level
  (org; the top can't go under anyone, and someone must stay at the top), **Alt+↑/↓** move
  it among its siblings, **Backspace** on an empty text removes it. The bar has the same as
  buttons. Clicking a node in the drawing picks its row.
- **flowchart: a canvas.** The drawing with a transparent overlay on it, sharing its
  `viewBox`: drag a box to move it (snapped to a 10-unit grid; the transform is taken at the
  start of the drag, since moving a box can grow the drawing), drag from a picked box's
  **port** (the four circles) onto another box to link them, double-click a box to edit its
  text in place, pick a link to give it a label, **Delete** removes what's picked (a box takes
  its links with it), Escape clears the pick. The bar adds a box, rounded box, decision or
  start/end pill (named after its shape, in edit at once); the strip below changes a picked
  box's shape and colour.

Undo/redo is `HistoryController` (`src/_Core/History/README.md`): one entry per gesture (a
typed field is previewed live and recorded when it loses focus or before a structural
change; a drag is previewed and recorded on release). Ctrl+Z / Ctrl+Y work outside a text
field. A new `value` reseeds the history (`HistoryController.reseed`, added for this), so
there is nothing to undo past the model given. `diagram-changed` carries the model and a
`reason` (`text`, `add`, `remove`, `indent`, `move`, `link`, `label`, `shape`, `colour`,
`history`); `diagram` is the model as it stands. Each outline row has an Icon field (a Lucide
name). Not yet: dragging
rows in the outline, resizing a flowchart box.

Tests: `tests/e2e/diagram-editor.spec.ts` (Playwright, 5) on
`examples/Visualization/Diagram/diagram-editor.html`: typing, Enter, Backspace, Alt+↓ and
undo in the outline; Tab / Shift+Tab and the drawing's click in an org chart; dates on a
timeline; add, drag on the grid, link from a port, edit in place, Delete and undo on a flowchart.
