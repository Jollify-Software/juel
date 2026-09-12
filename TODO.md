# Juel — TODO

## Done: `juel-mdi` — GoldenLayout parity (`src/Layout/Mdi/`)

`juel-mdi` needed to grow toward the docking-layout feature set the app it
serves (Jollify.UI's rewrite) used to get from `golden-layout` v2, before
that app dropped it. Full history/rationale in the Jollify workspace
conversation; the old integration lived in `C:\Jollify_old\App` (not this
repo). All 7 phased steps below are done, including the two follow-up
correctness passes (tab selection by identity, real popout click-through)
and the drag-to-new-window addition (2026-09-12). The one deliberately
out-of-scope piece is full recursive pane nesting (see step 3's "why scoped
down") — revisit only if real usage in the Jollify rewrite demands it.

0. Panel data model — an addressable, stably-identified list of panels
   derived from light-DOM children (not just re-reading `this.children` at
   render time), so runtime mutation and future serialization have
   something to act on. **Done.**
1. Panel chrome — close button (tab strip + pane header), `data-closable`
   opt-out, `default-closable` element-level default, maximize/restore on
   row/column panes, and auto-collapsing a row/column down to a bare pane
   when left with one child. **Done.** (Maximize wasn't added for `stack`
   mode — a stack already shows exactly one panel at a time, so there's
   nothing for it to do there. Auto-collapse is likewise row/column-only
   for the same reason.)
2. Runtime API — `addPanel(element, options)` / `removePanel(id)` /
   `getPanel(id)` / `replacePanel(id, element, options)` /
   `focusPanel(id)` on the `<juel-mdi>` element itself (matches the
   `open()`/`close()`-on-the-element convention `Dialog/Modal` already
   uses), backed by a `MutationObserver` so declarative and imperative
   mutation both flow through the same sync path. **Done.**
3. Drag-to-dock. **Done, scoped down from full GoldenLayout parity —
   deliberately, see below.** `juel-tabs` gained `reorderable` (drag one
   tab onto another to reorder — interactjs draggable+dropzone per tab,
   same pattern as `Layout/DockContainer/DockContainerService.ts`), wired
   in both stack mode (reorders light-DOM order, the source of truth there)
   and per-slot in row/column mode (reorders slot-local state). `juel-mdi`
   row/column mode gained a **flat multi-slot model** (`MdiSlot` — a pane
   is 1+ panels; >1 renders as a tab stack) instead of arbitrary recursive
   row-in-column-in-row nesting: dragging a singleton pane's title bar onto
   another pane's edge (outer quarter along the layout's axis) splits off a
   new adjacent slot; dropping on the center (middle half) merges it into
   that slot's stack. One splitter level, no nested splitters.
   - **Why scoped down**: full recursive nesting (a column split inside one
     cell of a row split, arbitrarily deep) needs a real tree and
     drop-zone hit-testing against nested rectangles — real complexity that
     was being added and verified by build-only (no browser available this
     session), not by eye. The flat model covers the realistic editor
     cases (split off a panel, group two into tabs) at much lower risk.
     Escalate to full recursive nesting only if real usage in the Jollify
     rewrite actually demands it.
   - **Formerly a known gap, now fixed (2026-09-12)**: a single tab could
     not be pulled back out of a stack into its own split — the
     draggable/dropzone pairing deliberately stayed within one shadow root
     (a pane's own `.pane-title` dragged, other panes were the dropzones),
     avoiding a `.tab` (in a *nested* `<juel-tabs>`'s shadow DOM) ever being
     dropped on a `.pane` in the parent `<juel-mdi>`'s shadow DOM. Turns out
     this doesn't need juel-mdi to own a second draggable binding on the
     tab at all: interactjs's dropzone system reacts to *any* active drag
     regardless of which Interactable started it, so `juel-mdi`'s existing
     pane dropzones just needed `.tab` added to their `accept` selector
     (`_wireDocking`'s `ondrop`, alongside a new `_resolveDraggedPanel`
     helper that walks `tab.getRootNode().host` to find the origin
     `<juel-tabs>`/slot). A tab dropped near its own pane's edge now splits
     it out into a new adjacent pane; dropped in the middle of its own
     stack, it's left to juel-tabs' own reorder handling (a same-slot
     'merge' is skipped in `ondrop` to avoid double-handling). Whether a
     whole multi-panel stack can be dragged as one unit is still open —
     nobody's asked for it yet.
   - **Also fixed (2026-09-12), reported by real use**: dragging a pane or
     tab selected the underlying text instead of just moving it (missing
     `user-select: none` on the drag handles — `.pane-title` in `mdi.less`,
     `.tab` in `Tabs.ts`); and a stack pane (juel-tabs nested in a
     `juel-mdi` row/column pane) didn't fill its pane — `juel-tabs`/
     `juel-tab`'s own `:host`/`.tabs-container`/`.tab-content` never had a
     height, so they sized to content instead of stretching (fixed in
     `Tabs.ts`, harmless for `juel-tabs` used standalone since a percentage
     height against a non-definite ancestor just falls back to auto).
     "Dock at the side" (an edge of the *whole* layout, not just between
     two existing panes) turned out to already work via the existing
     before/after threshold — it only looked broken because the affected
     pane didn't fill its own bounds, leaving nowhere to drop.
   - **Now visually verified** (2026-09-12), via a rebuilt
     `examples/Layout/Mdi/mdi.html` (an IDE-style Explorer/Editor/Console
     workspace, replacing the old placeholder-text demo). Click-through via
     local Playwright + `npx serve` (no browser extension available this
     session either) surfaced three real bugs, all fixed:
     - `juel-splitter` renders to the light DOM and injects its own
       stylesheet into `document.head` (see `Splitter.ts`) — that never
       reaches an instance nested inside another component's *shadow* root,
       so every `juel-mdi` row/column layout was silently collapsing to an
       unstyled vertical stack of full-height panes. Fixed by also copying
       the stylesheet into the containing shadow root when there is one.
     - `--icon-maximize`/`--icon-restore` were referenced by `mdi.less` but
       never defined anywhere — the buttons rendered as solid filled
       circles. Added `icons/maximize.svg`/`icons/restore.svg` and
       registered them in `_CommonStyles/Icons.less`'s `@miscIcons`.
     - `setLayout()`'s pane-size restore patched `flexBasis` onto the DOM
       via `updateComplete.then(...)` after the fact — a race against
       `juel-splitter`'s own first-mount equal-share pass, which usually
       ran second and clobbered it. Fixed by threading `size` through
       `MdiSlot` and applying it as part of the render template instead
       (`_renderPane`/`_renderStack`), with `Splitter.ts`'s firstLoad now
       only defaulting panes that don't already carry a flex-basis.
   - **Drag-to-new-window added (2026-09-12)**: dragging a pane's title bar
     or a tab well clear of the whole `<juel-mdi>` layout now pops that
     panel into its own window, same as calling `popPanel()` directly —
     GoldenLayout's drag-to-new-window, previously only reachable
     programmatically. Implemented as a coarse "released outside my own
     `getBoundingClientRect()`" check, independent of the existing
     dock/reorder dropzone logic (a release still inside the layout either
     hit a valid dock/reorder target, handled separately, or landed in a gap
     like a splitter gutter, and just snaps back — no double-handling
     either way). Needed a new `TabsEvents.TabDragEnd` event from `Tabs.ts`
     (fired on every reorderable tab's drag end regardless of outcome,
     carrying the final pointer position) since `.tab` drag handles are
     owned by `juel-tabs`, not `juel-mdi` itself; singleton pane title bars
     are already `juel-mdi`'s own drag handles, so that path needed no new
     event. Verified via a Playwright click-through covering all three drag
     handle types (a singleton row/column pane, a top-level stack tab, and a
     tab inside a row/column multi-panel slot) plus a regression check that
     an ordinary in-bounds reorder drag doesn't spuriously pop a window.
4. Layout serialization. **Done.** `getLayout()`/`setLayout()` round-trip
   `{order, panes: [{panelIds, selectedIndex, size}]}` — identifies panels
   by id (not content), reads/writes pane flex-basis percentages off the
   live `.pane[data-slot-id]` elements. Reflects the stored `order`/`_slots`
   model, not the transient mobile-tabs-fallback rendering.
5. Cross-panel event bus. **Done.** `BroadcastChannel` scoped per
   `juel-mdi` instance (channel name = the element's `id`, auto-assigned if
   absent) rather than an in-page emitter, so it works identically whether
   a panel is docked or popped into its own window (step 6) — no manual
   relay needed either way. `mdi.broadcast(type, detail)` sends (and
   self-delivers, since BroadcastChannel doesn't loop back to its own
   sender); listen with `mdi.addEventListener('mdi:' + type, e => ...)`.
   Replaces the old `layout.eventHub.emit('userBroadcast', 'designerInvoke'
   |'editorInvoke'|'insertInvoke', ...)` RPC pattern.
6. Popout windows. **Done, and now verified (2026-09-12) via a real
   Playwright click-through** (this was flagged as the least-verified piece
   of all seven steps, since `window.open`/cross-document-adoption behavior
   is inherently browser/environment-dependent in ways `npx parcel build
   juel.ts` compiling clean cannot check). `popPanel(id)` opens a
   same-origin `window.open()`, copies the main document's stylesheets/
   scripts into its `<head>`, and moves the panel's element into it (adopted,
   not re-parsed — a genuinely live object, so its internal state isn't
   lost). `redockPanel(id)` closes the popout and brings the panel back
   (also happens automatically if the user closes the popout window
   themselves, via `pagehide`).
   - **Real bug found and fixed**: script tags were copied into the popout
     via `document.importNode()`, which — per spec — carries a script
     element's "already started" flag along with it, so the clone never
     actually executes in the new document. `window.juel` and every
     `customElements.define()` call were silently missing in every popout;
     it went unnoticed because none of the example's own panels happen to
     contain a real `<juel-*>` element. Fixed by creating fresh
     `<script src>` elements directly in the popout document instead of
     cloning — those do load and execute normally.
   - **Verified**: pop/redock round-trip (both user-closes-the-window and
     programmatic `redockPanel()` paths), popup document title, live-object
     identity (pre-existing content survives the move), `popPanel` being
     idempotent when already popped, cross-window `BroadcastChannel`
     delivery to a popped-out panel while docked panels change state, and —
     after the script-copy fix — a real `<juel-button>` actually upgrading
     (shadow DOM renders) and staying interactive (click handler fires)
     inside the popout.

### Known limitation from step 1/2 — fixed (2026-09-12)
`juel-tabs`'s `selectedIndex` used to be purely positional: closing a tab
clamped it back in range (`Tabs.ts` `_handleSlotChange`) so it couldn't go
out of bounds, but closing an earlier tab while a later one was selected
didn't preserve *which* panel stayed visible — the selection followed the
index, not the panel's identity.

Fixed by tracking the selected `<juel-tab>` element itself (`_selectedTab`),
not just its index: `_handleSlotChange` now recomputes the index from that
element's new position when the tab list changes, only falling back to
positional clamping when the previously-selected tab was the one removed;
`updated()` re-syncs `_selectedTab` whenever `selectedIndex` changes from
outside (e.g. a controlling parent like `juel-mdi` binding `.selectedIndex=`);
`selectTab`/`selectSubTab` set it directly on click.

That alone wasn't sufficient for `juel-mdi`'s row/column multi-panel slots
(`_renderStack`) and its top-level stack render, though: both built each
`<juel-tab>` wrapper via a plain `.map()`, so Lit's default (non-keyed) array
diffing reused DOM nodes positionally across renders — after a removal, the
*same* `<juel-tab>` node object could end up representing a *different*
panel, defeating identity tracking at the root. Fixed by switching both to
`repeat(..., panel => panel.id, ...)`. `_syncSlots` had the identical
positional-clamping bug one level up, for `MdiSlot.selectedIndex` itself —
fixed the same way, preserving the previously-selected panel's id across the
filter rather than just clamping the index.

Verified via a Playwright script against the rebuilt `mdi.html` example:
selected "Details" in the tabs-demo stack then closed "Overview" (an earlier
tab) — "Details" stayed selected; selected "Output" in the flagship demo's
Console/Problems/Output slot then closed "Console" — "Output" stayed
selected. Confirmed both cases actually exercised the bug by reverting the
fix and re-running (both failed as expected) before restoring it.

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

## Added: `juel-qr` — QR code renderer (from the Jetty remote-control work)

`src/Utilities/Qr/` — `<juel-qr value="…">` encodes a string (byte mode, UTF-8,
smallest fitting version) and renders it as crisp, scalable SVG. Attributes
`ecl` (L/M/Q/H), `scale`, `margin`, `foreground`/`background`, `label`; events
`qr-render` / `qr-error`. Pure encoding lives in `QrMatrix.ts`
(`toQrMatrix(text, { ecl, margin }) → { size, version, margin, modules }`) and
is unit-tested in `tests/util/qrTests.ts`. Encoding is delegated to
`qrcode-generator` (Kazuhiko Arase, MIT), added to `dependencies`; its default
Latin-1 `stringToBytes` is swapped for a UTF-8 one in `QrMatrix.ts`. Wired into
`Utilities/Import.ts`, `examples/Utilities/Qr/qr.html`, and the examples gallery.

Consumed by Jetty's remote control: the display screen shows a `<juel-qr>` of
the phone-controller URL so you scan instead of typing it.

**Also now a Juel consumer:** Jetty's presenter view (`jetty/src/presenter/`) uses
`<juel-qr>` + `<juel-toolbar>` as-is (no changes needed). It rolls its own
count-up timer for now — if a second consumer wants one, promote it to a
`juel-stopwatch` (count-up sibling of `juel-countdown`: start/pause/reset/lap,
`src/Utilities/Stopwatch/` + `tests/util/` + example, same pattern as `juel-qr`).

**Follow-ups:**
- **Reader side already exists** as `juel-scanner` (`src/Utilities/Scanner/` —
  camera + `@zxing/browser`, fires `barcode-scanned`). Cross-link the two, or
  rename toward a pair: `juel-qr` (generate) / `juel-qr-scanner` (read).
- `<juel-qr>` is generate-only and static SVG. Usual next asks: a
  `render-as="canvas"` option for `toDataURL`/download, and a centre `logo`
  slot (needs `ecl="H"`).

## Known issues (pre-existing, not caused by the above)
- ~~`npx jest` (full) has 12 failing tests in `tests/MessageBox/*`~~ — **fixed
  (2026-09-12)**. Root cause: `MessageBoxButtonStrategies.test.ts` and
  `MessageBoxInputStrategies.test.ts` hand-build a mock `msgBox` DOM that
  predated the Bootbox-style redesign (commit history, ~2026-08-24) adding a
  `#dialog-content`/`#dialog-footer` structure — the real strategies append
  into those ids, the stale mocks didn't have them at all, so every
  `querySelector(...).append(...)` threw on a null result. Updated both
  mocks to match the real markup and fixed the handful of assertions that
  were also still querying the old `#dialog-body juel-button`/`juel-text`
  shape directly. All 130 tests pass now.
- `MarkdownEditor` throws a CodeMirror `tags is not iterable` highlight crash on mount —
  a Parcel bundling issue (CM facet registry not shared between `basicSetup` and `markdown()`).
  Editing still works; only syntax highlighting is dead. Needs a package.json `alias` pass.
