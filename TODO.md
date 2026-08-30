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

## Requested: `juel-speech` — text-to-speech wrapper (from the Jetty extraction)

**Jetty** is the HTML presentation framework being split out of `pesmech`
(`C:\Jollify\pesmech` → `C:\Jollify\jetty`; see `pesmech/Plan.md`). It has a
small, self-contained text-to-speech element that should live in Juel rather
than be duplicated per consumer. Please build it here as **`juel-speech`**.

**Port from:** `C:\Jollify\pesmech\src\Components\Speech.ts` (~30 lines,
currently `<jollify-speech>`). It wraps the browser `SpeechSynthesisUtterance`
API:
- element text content = the phrase to speak
- attributes: `language`, `pitch` (number), `rate` (number), `voice` (name)
- `play()` — speaks `this.textContent.trim()` with the chosen voice, falling
  back to `voices[0]` when the named voice isn't found
- guards on `window.speechSynthesis` existing

**Fix / improve while porting** (the original is rough):
- it reads `language` / `pitch` / `rate` but only ever applies `voice` — wire
  them to `utterance.lang` / `.pitch` / `.rate`
- handle the async voice list: `getVoices()` is usually empty on the first
  synchronous call — also populate on `speechSynthesis.onvoiceschanged`
- add `pause()` / `cancel()` (→ `speechSynthesis.pause()` / `.cancel()`) to
  match the `juel-animate` `play`/`pause`/`stop` shape
- fire `speech-start` / `speech-end` CustomEvents (utterance `onstart` /
  `onend`) so `juel-trigger` can chain off them — Jetty triggers narration
  today with `<juel-trigger><juel-trigger-action action="play">` on
  `fragment-enter`
- register through the normal `Import.ts` barrel; extend `CommandComponent`
  if it should be trigger-addressable

**Not wanted here:** the `SpeechProcessor` (per-slide auto-narration from a
`Speak[]` data array) and `SpeechRecognitionInitialiser` (voice-command
navigation, already commented-out dead code) from `pesmech/src/Speech/` —
those are deck concerns, not Juel's.

Once `juel-speech` exists, Jetty imports it like the other `juel/src/...`
elements and drops any local copy. Jetty MVP ships without speech, so this
is not blocking Jetty — do it whenever it fits.

## Known issues (pre-existing, not caused by the above)
- `npx jest` (full) has **12 failing tests in `tests/MessageBox/*`** — present before this
  work; worth a dedicated look.
- `MarkdownEditor` throws a CodeMirror `tags is not iterable` highlight crash on mount —
  a Parcel bundling issue (CM facet registry not shared between `basicSetup` and `markdown()`).
  Editing still works; only syntax highlighting is dead. Needs a package.json `alias` pass.
