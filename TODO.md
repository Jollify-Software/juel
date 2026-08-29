# Juel — TODO

## In progress: Style editors (`src/Editors/Style/`)

Visual editors for a CSS property of a target DOM element — live preview + multi-step
undo. All extend `StylePropertyEditorBase` (target/`context` resolution, `HistoryController`
wiring, `applyLive` with baseline-removal). Integration notes: `src/_Core/History/README.md`.

### Done & committed
- `_Core/History/HistoryStack.ts` + `_Base/HistoryController.ts` (reusable undo/redo)
- `StylePropertyEditorBase.ts`
- `juel-position-editor` — `transform-origin`, `object-position`, … (commit `c168036`)
- `juel-gradient-editor` — layered linear/radial/conic (commit `0542ff7`)

### Done, NOT yet committed (in the working tree — needs a commit)
- `juel-shadow-editor` — `box-shadow`; layered, drag-the-preview offset, inset, blur,
  spread, colour + opacity. Built + browser-verified + 25 unit tests.
  Files: `src/Editors/Style/ShadowEditor/*`, `examples/Editors/Style/ShadowEditor/`,
  `tests/util/shadowValueTests.ts`, plus `Editors/Style/Import.ts`, `examples/index.html`
  (gallery), `CLAUDE.md`, `src/_Core/History/README.md`.
  `npx jest tests/util` = 84/84.

### Next candidates (pick up here)
- `juel-transform-editor` — `transform` function list (translate/scale/rotate/skew/perspective).
  Ordered list of functions, per-function controls, live preview. Biggest of the remaining ones.
- `juel-filter-editor` — `filter` / `backdrop-filter` (blur, brightness, contrast, drop-shadow,
  hue-rotate, …). Similar shape to the gradient/shadow layer-list pattern.
- `juel-clip-path-editor` — `clip-path` (inset/circle/ellipse/polygon). Polygon = draggable
  points on an overlay, reuse the PositionEditor overlay approach.
- When a 4th lands, revisit whether the shadow/gradient layer-list UI (chips + ▲▼ + ✕ + ＋)
  should be factored into a shared `LayerListBase` or a small render helper.

## Known issues (pre-existing, not caused by the above)
- `npx jest` (full) has **12 failing tests in `tests/MessageBox/*`** — present before this
  work; worth a dedicated look.
- `MarkdownEditor` throws a CodeMirror `tags is not iterable` highlight crash on mount —
  a Parcel bundling issue (CM facet registry not shared between `basicSetup` and `markdown()`).
  Editing still works; only syntax highlighting is dead. Needs a package.json `alias` pass.
