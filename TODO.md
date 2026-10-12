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

## Planned: `juel-router` — client-side routing (`src/Navigation/Router/`)

No implementation exists yet — checked `README.md`, this file, memory, and
`C:\Jollify_old\App` (the old Jollify.UI) for a prior routing approach;
found nothing to port from. This plan exists because Jollify.UI's rewrite
will need one: it's an app (dashboards, `juel-mdi`-hosted tool panels), not
a content site, so its "pages" belong as ordinary Juel components rather
than the plain-HTML-fragment model `juel-embed`/Jellyfish use for content.

**Core decision**: a route's content is a **custom element tag name**, not
markup or a template string. The router instantiates it and mounts it into
an outlet; that element's own class is where its event handlers and HTTP
calls live (`connectedCallback`/a route-enter hook triggers a `fetch()`,
`@click=` bindings handle interaction) — exactly like every other Juel
component, and exactly like a `juel-mdi` panel being an arbitrary element.
No separate "code-behind" convention needed.

**Progress (2026-09-13)**: steps 0 and 1 done — `src/Navigation/Router/`
(`RouteMatcher.ts`, `Router.ts`, `RouterEvents.ts`), 36 matcher tests in
`tests/util/routeMatcherTests.ts`, example at
`examples/Navigation/Router/router.html` (+ gallery entry), click-through
verified in real Chrome via Playwright. Decisions made along the way:
- **First match in table order wins** (Express-style), not
  most-specific-wins — so a `/*` catch-all goes last.
- **A new path always mounts a fresh element**, even for the same route
  (`/users/1` → `/users/2`), so a view that loads in `connectedCallback`
  reloads without watching its own params. Re-setting an *equivalent*
  path (`/users/1/`, `/users/1?x`) is a no-op.
- Mounted element gets `params` and `rest` (the wildcard remainder) as
  properties, set before it's appended.
- `routes` JS property *and* `<juel-route>` children are both supported;
  the property wins when set. Children are watched with a
  `MutationObserver`, so adding/removing/editing routes re-resolves.
- Outlet = the router's own light DOM (appended after the `<juel-route>`
  children). If Jollify.UI wants the outlet somewhere other than "inside
  the router element", that's a small follow-up (e.g. an `outlet`
  selector), not yet built. ~~Related: links are only intercepted *inside*
  the router's subtree~~ — changed to page-wide for URL-bound routers, see
  the Blazor-style follow-up below.

**Progress (2026-09-13, later)**: steps 2–4 done. Hosting question answered
(Luke): **Jollify.UI's host can rewrite unknown paths to `index.html`**, so
history mode is the default. URL↔path conversion is pure logic in
`RouterLocation.ts` with 28 tests in `tests/util/routerLocationTests.ts`.
Verified with 55 scripted Chrome checks: history mode on a scratch page
behind a rewriting server, hash + memory mode on the example page.
Decisions:
- **`mode="history" | "hash" | "memory"`.** Hash exists anyway because the
  examples server can't rewrite (so the live example page uses hash), and
  memory (URL-free, `path` property only) is what lets several routers sit
  on one page, or a router run inside a panel without owning the URL.
  `base` = history-mode URL prefix.
- In hash mode only `#/…` hashes are routes; a plain `#section` anchor is
  ignored rather than emptying the outlet.
- In URL modes `path` = base-relative pathname **+ search** (history) /
  everything after `#` (hash). Matching and the remount key ignore the
  query, so **a query-only change doesn't remount or fire `route-changed`**
  — views read `location.search` themselves for now. Revisit if Jollify.UI
  wants query changes to be reactive.
- Setting `path` in a URL mode = `navigate(path)` (pushes an entry).
  `navigate(to, { replace })`; navigating to the current URL is a no-op.
  Multiple URL-bound routers stay in sync via an internal window event
  (pushState doesn't fire `popstate`).
- Link interception uses `composedPath()`, so links inside a mounted
  view's **shadow DOM** work too. Left to the browser: modifier/non-left
  clicks, `download`, non-`_self` `target`, `rel="external"`, cross-origin,
  outside `base`, in-page `#anchors`, and **same-origin links that match
  no route** (they may be real server pages — with the rewrite they reload
  into the app's not-found view).
- `not-found="tag"` gets `rest` = the whole unmatched path;
  `route-changed` detail has `notFound: true` whether or not a not-found
  element is set.
- ~~Still not built: `document.title` / focus management / `aria-current`
  on active links after navigation; scroll restoration~~ — done, see the
  steps 5–6 progress note's follow-up below. Still not built: passing
  `history.state` objects into views (the "param can be a real object"
  idea in step 1).

**Progress (2026-09-13, steps 5–6)**: guards/redirects and lazy loading
done. Verified by 49 more scripted Chrome checks (history-mode scratch page
+ example page); earlier suites re-run green. Decisions:
- **Navigation is one async pipeline**: match → `redirect` / `beforeEnter`
  → lazy load → commit. The current view stays mounted meanwhile, with a
  reflected `navigating` attribute for CSS. The newest navigation wins:
  a slower guard/load that finishes later is dropped, not committed.
  `navigate()` now returns `Promise<boolean>` (shown / not shown).
- **Guards run before the URL is written** for `navigate()`, link clicks
  and `path` set in a URL mode — so a blocked navigation leaves no dead
  history entry. Back/forward or a typed URL can't be cancelled, so a
  block overwrites the arrived-at entry with the still-shown URL
  (`replaceState`). A redirect after a push pushes the target; after
  back/forward/deep link it replaces.
- `beforeEnter(ctx)` gets `{ path, params, rest, from }` and returns
  true/undefined (go), false (stay, `route-blocked` event) or a path
  (redirect). Sync or async. A throwing guard, a failed load or a redirect
  loop (>10) stays put and fires `route-error`. Per-route only; no
  router-wide `beforeEach` — share one guard function across routes, or
  add `beforeEach` if Jollify.UI ends up gating most routes.
- `redirect="/users/:id"` may reuse the route's own `:params` / `*`
  (`buildPath` in `RouteMatcher.ts`, tested); a redirect using a param the
  route doesn't capture is rejected when the table is read.
- Declarative `<juel-route>` guards/loaders are JS properties on the
  element (`routeEl.beforeEnter = fn`, `.load = fn`).
- **Lazy loading, two forms**: `load: () => import('./View')` (bundled
  apps — Jollify.UI) or `module="url"` (plain HTML). `module` is loaded via
  a `<script type="module">` element, **not `import(url)`**: Parcel
  rewrites a runtime `import()` inside juel.js into its own `require()`,
  and `new Function` would need CSP `unsafe-eval`. A module script's
  `load` fires *before* its top-level `await` settles, so after loading the
  router waits for `customElements.whenDefined(tag)` (3s cap, then logs
  and mounts anyway — the element upgrades if defined later). A failed
  module is forgotten so a later navigation retries.
- Known limitation: with several URL-bound routers on one page, a block
  in one reverts the shared URL for all of them.

**Progress (2026-09-13, a11y/UX follow-up)**: active links, focus, title,
scroll. 34 more scripted Chrome checks (a second history-mode scratch
fixture + example page); all earlier suites re-run green. Decisions:
- **`aria-current`** on the router's light-DOM links to known routes:
  `"page"` for the shown path, `"true"` for a section containing it (a
  `/users` link on `/users/2`; `/` is never a section). Only links the
  router would itself navigate — not `target="_blank"`, `download`,
  `rel="external"`, unknown routes. It only removes `aria-current` it set.
  Re-evaluated when links are added or their `href`/`target`/… change, so
  links a view renders late are covered. Links in a view's *shadow* DOM
  aren't reachable — the view marks its own.
- **Focus** moves to the new view after a navigation
  (`focus-on-navigate="view"`, the default; `"none"` opts out) — adds
  `tabindex="-1"` if the view has no tabindex, `preventScroll`. Not on the
  first view, and not on a route-table edit. The router's styles hide the
  focus ring on such a view (`::slotted([tabindex="-1"]:focus)`), since a
  ring round a whole non-interactive container is noise; page CSS can
  restore it.
- **`title`**: `<juel-route title="User :id">` (`:param` placeholders) or
  `title: ctx => …` in JS routes. Routes without one leave
  `document.title` alone. A throwing title function is logged, not fatal.
- **`scroll-on-navigate="top"`** (opt-in, default `"none"` — a router
  that isn't the whole page mustn't scroll it): navigations go to the top
  or the history-mode `#hash` target; back/forward restore the saved
  position (per-entry key in `history.state`, positions in memory only —
  lost on reload). Takes `history.scrollRestoration = "manual"` while
  active and gives it back on detach / turning off. Restores a frame
  after mounting; a view that renders its height after an async fetch
  can still be clamped short.
- Internally transitions now carry a *cause* (navigate / popstate / path
  / refresh), which is what gates focus and scroll.

**Progress (2026-09-13, Blazor-style links + `<base href>`)**: Luke asked
for Blazor's model. 21 more scripted Chrome checks (a `/app3` scratch
fixture using `<base href>` and an app-shell nav outside the router); all
earlier suites re-run green (one step-2 check deliberately flipped: a link
outside any router is now intercepted). Decisions:
- **URL-bound routers (history/hash) own links page-wide** — a document
  click listener, like Blazor's runtime (Angular only intercepts
  `routerLink`). Same exclusions as before (modifier clicks, `target`,
  `download`, `rel="external"`, other origin, outside base, unknown
  routes). **Memory routers stay subtree-only** — they don't own the URL.
- **Innermost router first**: a click inside a router goes to that router;
  only if it doesn't match there does it reach a page-level router
  (event order + `defaultPrevented`; the document handler skips clicks in
  its own subtree). `aria-current` marking follows the same rule — a
  URL-bound router doesn't mark links a nested router would take.
- `aria-current` marking is page-wide for URL-bound routers too (a
  document `MutationObserver`, only reacting to added `<a>`s / anchor
  attribute changes), and a router clears its marks on detach or on
  switching to memory mode. Marks are tracked in a pruned `Set` now
  (a `WeakSet` couldn't be iterated to clear them).
- **`base` defaults from `<base href>`** when the attribute/property is
  unset (`null`); `base=""` explicitly means none. The base is the base
  href's *directory* (`"/app/"` and `"/app/index.html"` → `/app`; `"/app"`
  without a slash → site root, matching how relative links resolve) — same
  trailing-slash convention Blazor requires. Cross-origin `<base>` ignored.
  `resolveBase` in `RouterLocation.ts`, unit-tested.
- Known limitations: two *sibling* URL-bound routers with different route
  tables/bases could disagree about a shared link's `aria-current` (last
  update wins). Hash mode with a `<base href>` on another directory breaks
  `href="#/…"` links (they resolve against the base, not the document) —
  the usual `<base>` + fragment gotcha; history mode is the intended pairing.

Phased, cheapest/highest-value first:

0. ~~**Path matching**~~ ✅ — pure logic, unit-testable in isolation (`tests/util/`
   per the testing convention). Static segments, `:param` segments, and a
   trailing `*` wildcard; returns matched params + leftover path. No DOM,
   no History API — this is the `HistoryStack`-style "extract the hard part
   into pure, tested logic" piece.
1. ~~**`<juel-router>` + outlet, static route table**~~ ✅ — `<juel-router>` takes
   a route table (`[{ path, element }]`, `element` a tag name) either as a
   JS property (simplest MVP) or declarative `<juel-route path="..." element="...">`
   children (matches the light-DOM-children-as-config idiom `juel-tabs`/
   `juel-mdi` already use — do this instead of the JS-property-only form
   once step 0 is solid, not as a separate later step). On a route match,
   instantiate the target element (`document.createElement(tag)`) and mount
   it into an outlet (light DOM `<slot>`, matching how `juel-mdi` panels
   work) — swapping out whatever was mounted before. Params get set as
   properties on the mounted element (`el.params = matchedParams`) rather
   than serialized attributes, so a param can be a real object/array when
   the route was reached programmatically with one.
2. ~~**Programmatic navigation**~~ ✅ — `router.navigate(path)`, plus reacting to
   `popstate` for back/forward. History-mode (`pushState`) by default,
   matching how a real app is normally hosted; **decide before starting
   whether Jollify.UI's host can rewrite unknown paths to `index.html`** —
   if not (e.g. a dumb static host with no server-side rewrite), a
   hash-mode fallback (`#/path`) needs to exist from this step, not bolted
   on later, since the two modes shape how links/route tables are written.
3. ~~**Link interception**~~ ✅ — a plain `<a href="/foo">` inside a
   `<juel-router>`'s subtree gets its click intercepted (preventDefault +
   `navigate()`) when the href is same-origin and matches a known route;
   falls through to a real navigation otherwise (external links, downloads,
   `target="_blank"`, modifier-clicked opens-in-new-tab). This is what lets
   page authors write ordinary links instead of calling `router.navigate()`
   by hand everywhere.
4. ~~**Not-found handling**~~ ✅ — an explicit `not-found` route/element, distinct
   from silently rendering nothing.
5. ~~**Guards / redirects**~~ ✅ — a `beforeEnter(params) => boolean | string`
   hook per route (return `false` to block, a path string to redirect).
   Needed for anything auth-gated; comes after the basics work rather than
   being designed in from step 0, since guard semantics are easier to get
   right once real navigation exists to test them against.
6. ~~**Lazy loading**~~ ✅ — route table entries can point at a dynamic
   `import()` instead of an already-registered tag name, so Jollify.UI
   doesn't ship as one Parcel bundle. Straightforward once step 1's mount
   path exists (await the import, then `customElements.whenDefined`,
   *then* mount) — sequenced last because it's a pure optimization, not a
   capability gap.
7. **(Deliberately not planned yet) Nested/child routes and any direct
   `juel-mdi` integration** — e.g. a route restoring a specific
   `juel-mdi.setLayout()` arrangement, or routing *within* a panel rather
   than swapping a whole page. This is the "genuinely hard, maybe not
   needed" piece, same shape as `juel-mdi`'s deliberately-deferred
   recursive nesting (see the `juel-mdi` section above) — don't design it
   speculatively; revisit only once Jollify.UI's actual screens show a real
   need for routing below the whole-page level. **Update (2026-09-17):** the
   dashboard example tried flat `/customers/:id/*` routes for a tabbed detail
   screen and they work; what they cost is a remount + re-fetch on every tab
   switch. See the dashboard section below for the measurement — that's the
   concrete case for step 7 when it's needed, and it isn't yet.

**Testing**: step 0 (the matcher) is pure logic and should get real unit
tests, per the repo's own testing convention (`CLAUDE.md` "Testing"
section) — that's the one part of this whole feature that isn't just
"verify by eye in a browser." Steps 1+ need the same real click-through
verification (`npx serve` + Playwright, or the Chrome extension when
available) every other interactive component in this repo has needed —
see the `juel-mdi` section above for why "compiles clean" alone hasn't been
a reliable signal for DOM/browser-API-dependent code in this codebase.

## Router mock app — "Northwind Admin" dashboard ✅ (built 2026-09-17)

**Why.** `router.html` is a feature tour: a router halfway down a page of
other demos, views that are a few lines of `innerHTML`. It can't show the
features that only make sense when the router *is* the app — page-wide link
interception from a sidebar outside the router, `scroll-on-navigate`, focus
moving to each view, `document.title` per route — and it never puts real Juel
components inside a mounted view. A mock admin dashboard does both, and is the
closest thing to Jollify.UI's actual shape.

**Built.** `examples/Navigation/Router/dashboard.html` (hash mode, its own
full-page app CSS rather than `_Shared/examples.css`), views in
`examples/_TS/Navigation/Router/Dashboard/` (a `DashView` base, `data.ts` with
seeded deterministic data — 40 customers, 150 orders — and `auth.ts` with the
shared `requireSignIn` guard), plus the lazily-loaded
`examples/Navigation/Router/dashboard-reports.js`. Linked from a callout at the
top of `router.html` and from the gallery. Routes: `/` → redirect to
`/overview`; `/overview` (stat tiles + line/doughnut `juel-chart` + recent
orders); `/customers` (`juel-table` + text filter, row click navigates);
`/customers/:id/*` (`juel-tabs`, tab in the URL); `/orders` (`?status=`
filter); `/orders/:id`; `/reports` (`module=`); `/settings`; `/login`;
`dash-not-found`.

**Verified** with scripted Chrome (playwright-core + system Chrome + a plain
Node static server at the repo root) and screenshots at 1280px and 400px: the
sign-in redirect returns to the original target; deep link + reload on
`#/customers/7/orders`; back/forward across sections; sidebar `aria-current`
(`page` vs `true` on detail pages); per-route `document.title`; focus lands on
the new view; three fast sidebar clicks commit only the last; ten mount/unmount
cycles of the chart and table views leave the DOM node count and the chart's
`<body>` tooltip count unchanged (no leaks); the lazy Reports module loads once,
with the previous view still mounted and `navigating` driving the progress bar.

### Answers to the questions it was built to settle

1. **Query strings — the gap is worse than "the view reads `location.search`
   itself".** A query-only change doesn't remount or fire `route-changed`, as
   documented. But a view *cannot* fall back to watching the location either:
   the router navigates with `history.pushState`, which fires neither
   `hashchange` nor `popstate`, so the `hashchange` listener the plan imagined
   never fires at all for a router-driven navigation. (There *is* a window
   event — `juel-router-location-changed` — but it's a module-private const,
   not exported and not in `RouterEvents`, so not public API.) What
   `DashOrderList` does instead: `preventDefault()` on its own chip links, call
   `navigate()` for the URL, and refilter itself; plus a `popstate` listener for
   back/forward, and reading the query at render time for a reload or a pasted
   URL. That covers everything except *another* part of the app navigating to
   `/orders?status=…`, which this view would not notice. **Decision needed
   (Luke):** make query changes reactive — cheapest version is a `query`
   property set on the mounted element alongside `params`, plus a
   `route-query-changed` event — or at minimum promote the location-changed
   event into `RouterEvents`. Not changed unprompted.

2. **Nested routes (step 7) — flat routes work, at a real cost.** The customer
   tabs are `/customers/:id/*` with the view picking its tab from `rest`, and
   that is genuinely clean to write: one route, one view, deep-linkable
   (`#/customers/7/notes` reloads onto the Notes tab), and the sidebar still
   shows `aria-current="true"` on Customers. The cost is exactly the one the
   plan predicted: **every tab switch is a new path, so the view remounts and
   re-fetches the customer** — measured, the element identity changes and the
   "Loading customer…" state flashes back (~1.1s round trip here). For three
   cheap tabs that's tolerable; for a detail screen whose header is an
   expensive fetch it wouldn't be. So step 7 still isn't needed for *this*
   shape, but the concrete case for it is "keep a parent view mounted while a
   child segment changes" — build it if Jollify.UI hits that, not before.

3. **Leave guards — feature skipped, the plan's option (a).** The router only
   has `beforeEnter`, on the route being *entered*, so "unsaved changes on
   Settings" has nothing to hang off. `dash-settings` says so in a note on the
   page rather than hacking around it. **Decision needed (Luke):** whether to
   add `beforeLeave(ctx)` on the route being left. It would have to run before
   the URL is written, same as `beforeEnter`, and couldn't be honoured for
   back/forward any more than a block can.

4. **Links inside shadow DOM — clicks fine, marking not needed.** Row
   navigation goes through `juel-table`'s `cell-clicked` event and
   `router.navigate()`, so there are no links in shadow cells at all; the
   cross-links that *are* in views (order → customer) are light DOM and get
   marked normally. Nothing new beyond the known limitation.

5. **Component bugs found and fixed** (in the components, not the example):
   - `juel-breadcrumb`'s separator never rendered. `Breadcrumb.less` had
     `::slotted(breadcrumb-item:not(:last-child))::after`, but the item element
     is `<juel-breadcrumb-item>` (`BreadcrumbItem.ts`). Nothing has ever been
     called `breadcrumb-item`, so the rule matched nothing. Fixed.
     (`juel-breadcrumb` still has no example page of its own.)
   - `juel-table`'s host was `display: inline`, so its block `<table>`
     overflowed the host instead of being laid out by it — the table couldn't
     be sized, scrolled or margined from the page. Now
     `:host { display: block; overflow-x: auto; }`, which also makes it scroll
     rather than overflow at phone width. Existing `table.html` re-checked,
     unchanged.
   - **`juel-table` rows were unreachable by keyboard** — **fixed
     2026-09-17**, and the worst thing this example turned up. With
     `selection="single"` rows respond to clicks and the dashboard navigates
     on one, but every cell reported `tabIndex: -1`, rows carried no role or
     `aria-selected`, and there was no Enter/Space handling: a keyboard or
     screen-reader user could not open a customer at all. Rows in a table
     with a selection mode are now a roving tab stop (one tab stop, Arrow
     Up/Down/Home/End between rows), Enter/Space activates, and rows carry
     `aria-selected`. New `row-activated` event (`{ row, index }`) fires for
     both a click and a keypress — `cell-clicked` is mouse-only by nature, so
     a consumer navigating on a row should listen to `row-activated`;
     `DashCustomerList` now does. Events moved onto a `TableEvents` enum.
     Also: `tr:hover { cursor: pointer }` used to apply to *every* table,
     promising an interaction a `selection="none"` table doesn't have — the
     hover highlight, pointer and focus ring are now limited to interactive
     rows.
   - No leaks: `juel-chart` cleans up its `<body>` tooltip div and resize
     observer correctly across repeated mounts (the earlier Chart fix holds),
     and `juel-tabs` is fine being rebuilt on every navigation.
   - Nothing needed the recurring light-DOM-children race workaround.

### Also found
- **`scroll-on-navigate="top"` needed a retry for async views** — **fixed
  2026-09-17**. Going back to a list, the restore ran a frame after mounting,
  when the view was still its loading state (measured: document 800px tall
  against a saved offset of 1400), so the browser clamped the scroll to 0 and
  nothing put it right when the rows arrived a few hundred ms later. It now
  keeps re-applying the saved position for up to a second, stopping as soon as
  it lands, the user scrolls (wheel/touch/key), or another navigation starts.
  A/B on a fixture with a synchronous and an asynchronous view: single-shot
  leaves an async view at 0, the retry lands it at 1500.
  *Correction to an earlier note here:* the first version of this finding said
  scroll restore was broken outright, including for views that render
  synchronously. That was wrong, and wrong for an avoidable reason —
  `page.click()` in Playwright scrolls the target into view before clicking,
  so every "scroll down then navigate away" step in the check was silently
  saving a scroll offset of 0. Synchronous views always restored correctly.
  Drive navigations with an in-page `element.click()` when scroll position is
  part of what's under test.
- **`not-found` took no title** — **fixed 2026-09-17**: `not-found="tag"` is
  only a tag name, so there was no route element to put `title="…"` on and the
  tab kept the title of wherever you came from. Added a `not-found-title`
  attribute; the dashboard's shell workaround is gone.
- **Navigations weren't announced to assistive tech** — **added
  2026-09-17**. The router already moved focus to the new view, which is only
  half the pattern: a screen-reader user landed in new content with nothing
  saying the page had changed, and nothing said the still-mounted old view was
  stale during a slow guard or lazy load. The router now sets `aria-busy` while
  `navigating`, and puts the route's resolved title into a visually-hidden
  `role="status" aria-live="polite"` region in its shadow root after each
  navigation (`announce-navigation="title" | "none"`, default `"title"`; routes
  without a `title` announce nothing). Verified that the region is present in
  Chrome's accessibility tree with the right role and that its text updates per
  navigation — **not** verified against a real screen reader, which this setup
  can't do.
- **One shared guard across ~8 routes is fine.** `dashboard.html` assigns
  `requireSignIn` in a loop over its `<juel-route>` children. Nothing here makes
  a case for a router-wide `beforeEach`.
- **`juel-nav` can't be a sidebar.** Tried first, per the plan. Its shadow root
  hard-codes a horizontal top bar (row `display:flex`, a fixed `--nav-height`,
  an absolutely-positioned drop-down menu) and its own 768px breakpoint, with
  no `direction` property and no exposed parts — a vertical full-height rail
  would need shadow-DOM surgery. The dashboard uses plain markup plus a
  hamburger button instead. Follow-up if wanted: give `juel-nav` a
  `direction="vertical"`, the way `juel-tabs` and `juel-toolbar` already have.
- **Two self-inflicted CSS traps worth remembering for any future example
  page.** (a) `.rows` is a *global* Juel grid utility
  (`src/_CommonStyles/Grid.less`: `display:flex; flex-flow: column wrap;
  justify-content:center`), so a page class of that name silently centred and
  shrink-wrapped every list row — renamed to `.list-rows`. A page-level class
  name can collide with the Juel global sheet; generic words (`rows`,
  `columns`, …) are the risk. (b) `.chip:hover` (0,2,0) beats `.chip-on`
  (0,1,0), so the just-clicked filter chip repainted its label in `--primary`
  on a `--primary` background — invisible. Both were found only by screenshot,
  not by any scripted assertion.
- **`juel-chart`'s legend overlaps the x-axis tick labels** on line and bar
  charts (the "Revenue"/"Orders" swatch sits over Apr/May). Pre-existing,
  visible on the existing `chart.html` examples too — not touched here.
- **`examples/index.html` (the gallery) is stale and broken**, and has been for
  a while — pre-existing, not caused by this work. It uses
  `<juel-tabs vertical="true">` with `<div data-title="…">` children, but the
  current `juel-tabs` takes `<juel-tab title="…">` and `direction="vertical"`.
  Nothing tabs; all ~70 embedded pages render stacked down one enormous page.
  The new entry follows the file's existing (broken) convention rather than
  rewriting 70 entries unasked. Worth a dedicated pass.


## Planned: components for the Jollify app rewrite

Full plan: `C:\Jollify\jollify\APP-REWRITE-PLAN.md` ("Juel components the rewrite
needs"). The Juel side, in short:
- ~~`juel-markdown-editor`~~ **done 2026-10-11**: `content-changed`
  (`ContentChanged` kept one release), `cursor-changed`, `setCursor` /
  `revealOffset` / `insertAtCursor` / `setWarnings`, `readonly`, no fixed id.
  Also fixed: styles when slotted (juel-mdi), surviving moves/popouts, and
  the duplicate `@lezer/common` that broke highlighting.
- ~~New `juel-frame`~~ **done 2026-10-11** (`src/Display/Frame`): sandboxed
  `srcdoc`/`src`, `aspect` scale-to-fit, `buffered` swap on load or a
  `ready-type` message, `send()` / `frame-message` with `reply`. The slide is
  kept across reloads by Jetty's `data-start-slide` rather than the frame.
- ~~`juel-router`~~ **done 2026-10-11**: `beforeLeave` (Q2) and Q1(a).
- ~~`juel-mdi` click-through~~ **done**: verified 2026-09-12, and again
  2026-10-11 with an editor + frame workspace (split, resize, pop out, redock).
- ~~`juel-nav` vertical (Q8), `juel-table` empty state and sorting (Q7)~~
  **done 2026-10-11.**

## Done: components the Jollify app needed (2026-10-12)

The Jollify app's toolbars, Insert/View menus and dialogs were native
elements; porting them to juel-* turned up these gaps, fixed here rather
than worked around in the app. Verified by a Playwright click-through of
the examples (menu, modal, select) and the app's own e2e suite.

- **`juel-modal` rewritten** on the native `<dialog>` (top layer, focus
  trap, inert page) — it used jQuery and had no way to report a result.
  `open()`/`close(value)`, `modal-closed` {returnValue}, cancelable
  `modal-cancel`; Escape, the close button and a backdrop click dismiss
  (unless `dismissible` is false); `label` or `slot="title"`, a
  `slot="buttons"` footer; focus goes to the slotted `[autofocus]`
  (custom elements included — the browser's own dialog focusing can't see
  slotted content). No jQuery left in it.
- **`juel-menu` works as a menu**: `CollapsibleBase` gained an `opened`
  state and `show()/hide()/toggle()`. The floating toggle never closed
  (it tested `max-height`, which floating mode never sets). With
  `trigger="click"`, an outside click or Escape closes it. Items
  (`juel-menu-item`, or `role="menuitem"`) fire `menu-select` {item, value}
  and close the menu; keyboard: the trigger opens it on the first item,
  arrows/Home/End move, Escape returns focus to the trigger. Content floats
  `position: fixed` (offset/flip/shift) so a clipping ancestor such as a
  juel-mdi pane can't cut it off. Gotcha found: no `visibility` transition
  on the content — mid-transition from hidden it can't take focus.
  `juel-menu-item`: focusable, `value`, `disabled`, Enter/Space activate.
- **`juel-button`**: `disabled` (reflected; no pointer events at all) and
  `button-label` (accessible name for an icon/symbol-only button).
- **`juel-text`**: `placeholder`, `type`, `name`, `inputmode`, `required`,
  `disabled`, `focus()`/`select()`; Enter submits the closest form (the
  inner input is in shadow DOM, so implicit submission can't see a
  light-DOM form); styles inherit the page font; `part`s.
- **`juel-select`**: Clear button is opt-in (`clearable`); choosing the
  placeholder option threw (`JSON.parse('')`), now null; the value is set
  after the options render (an option's `selected` attribute stops counting
  once the user has picked); `value="tea"` as an attribute works (Lit's
  Object converter turned non-JSON into null); `focus()`, `name`.
- **`juel-upload`**: `accept` was never applied to the input; `clear()`;
  the browse content no longer disappears after a pick unless a
  `slot="confirm"` element is there to replace it.
- **The bundle is ASCII-only** (`.terserrc` `format.ascii_only`): pages
  without `<meta charset>` (30+ examples, e.g. the old menu example)
  decoded `juel.js` as windows-1252 from disk and hit a syntax error. 20
  characters inside template literals can't be escaped by the minifier;
  they only mis-render, they don't break parsing.
- `juel-mdi`: the minimised-bar flex column is on an inner `.mdi` element,
  not `:host`, since a page's own `juel-mdi { display: block }` beats
  `:host` and collapsed the layout.

## Done: `juel-mdi` minimise and maximise on every panel (2026-10-12)

- **Minimise** on every row/column pane (title bar button; a tab stack's
  button minimises the whole group). A minimised panel keeps its place in its
  slot and is just left out of the render, so it comes back where it was;
  its tab sits on a **minimised bar** above the layout (`part="minimized-bar"`
  / `minimized-tab`), and clicking the tab restores it. A stack with one
  visible panel left renders as a plain pane.
- **Maximise** on every row/column pane (already there) plus double-click on
  a title bar. Stack mode (`order="stack"`, and the mobile tabs fallback)
  offers neither: every panel already fills the view there.
- Public API: `minimizePanel(id)`, `maximizePanel(id)`, `restorePanel(id)`,
  `isMinimized(id)`, `isMaximized(id)`; `focusPanel()` restores a minimised
  panel. Events `panel-minimized`/`-maximized`/`-restored`, and
  **`layout-changed`** on any change to the arrangement (dock, reorder, tab
  selection, minimise/maximise, splitter resize end) so an app can save
  `getLayout()` without polling.
- `MdiLayout` gained `minimized?: string[]` (panel ids, bar order) and
  `maximized?: number` (pane index); `setLayout()` applies both. Pane sizes
  are now captured into slot state before a pane unmounts, so `getLayout()`
  while something is maximised/minimised no longer drops the hidden panes'
  sizes (it used to, for maximise).
- **Fixed in `juel-splitter`**: gutters were only built in `firstLoad()`, so
  a pane added or removed later (docking, minimise, restore) left stale
  gutters wired to the wrong panes. It now rebuilds them on any child-list
  change (`syncGutters()`), and fires `resized` at the end of a drag.
- Within-slot tab reorder kept the selected *index* rather than the selected
  panel — fixed while mapping visible-tab indexes back to slot indexes.
- Example: `examples/Layout/Mdi/mdi.html` flagship demo (live layout JSON).
  Verified with a Playwright click-through (22 checks: bar, gutters, sizes
  restored, setLayout round trip, stack minimise, gutter drag after re-render).

## Open questions for Luke — router, `juel-table`, dashboard example

Everything here came out of building the dashboard example (2026-09-17). None
of it has been changed unprompted; each one is a decision, not a bug.

### Router

**Q1. Should a query-string change be reactive?**
Today a query-only change (`/orders` → `/orders?status=open`) doesn't remount
the view or fire `route-changed` — matching and the remount key both ignore
`?…`. That part is deliberate. What makes it awkward is that a view can't
observe the change *itself* either: the router navigates with
`history.pushState`, which fires neither `hashchange` nor `popstate`. There is
an internal `juel-router-location-changed` window event, but it's a
module-private const — not exported, not in `RouterEvents`.
So today a view has to drive its own query changes (intercept the click, call
`navigate()`, refilter by hand, plus a `popstate` listener for back/forward).
`DashOrderList` does exactly that and it works, but it leaves one hole: if
anything *else* in the app navigates to `/orders?status=…`, the view won't
notice.
Options, cheapest first:
  a. **Done 2026-10-11:** `RouterEvents.LocationChanged` (on `window`). Export the location-changed event in `RouterEvents` and document it. Small,
     unblocks consumers, doesn't change any semantics.
  b. Set a `query` property (a `URLSearchParams`) on the mounted element
     alongside `params`, and fire `route-query-changed` when only the query
     moved. Views stay declarative; no remount.
  c. Leave it: query state is the view's business.
Recommendation: (a) regardless, and (b) if Jollify.UI has filter/sort/paging
state in the URL — which a dashboard normally does.

**Q2. Add `beforeLeave`?** **Answered yes; done 2026-10-11.** A route's `beforeLeave` and the mounted view's own `beforeLeave(context)` method run before the view is replaced (false stays); `route-blocked` carries `phase: 'leave'`. The dashboard's Settings form uses it. Original question:
There's only `beforeEnter`, on the route being *entered*, so "you have unsaved
changes — leave anyway?" has nothing to hang off. The Settings view in the
example says so on the page rather than faking it.
A `beforeLeave(ctx)` would have to run before the URL is written (same as
`beforeEnter`), and couldn't be honoured for back/forward any more than a
blocking `beforeEnter` can — a browser back can't be cancelled, only undone
after the fact. Worth it only if Jollify.UI has forms people can lose work in.

**Q3. Nested routes (step 7) — not yet, but here's the trigger.**
Flat `/customers/:id/*` routes work well for a tabbed detail screen: one route,
one view, deep-linkable. The cost, measured: every tab switch is a new path, so
the view remounts and re-fetches its customer (~1.1s round trip, with the
loading state flashing back). Fine for three cheap tabs; not fine for a detail
screen with an expensive header fetch. The real requirement, when it comes, is
"keep a parent view mounted while a child segment changes" — don't design it
before something needs it.

**Q4. Should `announce-navigation` default to on?**
It currently defaults to `"title"`, i.e. on, matching `focus-on-navigate`
defaulting to `"view"` — accessible by default. It only announces when the
route has a `title`, so a route table with no titles is silent. Say if you'd
rather it defaulted to `"none"`.

### `juel-table`

**Q5. How should a table say "my rows are interactive"?**
Keyboard support (roving tabindex, Enter/Space, `aria-selected`, pointer
cursor, focus ring) is currently tied to `selection !== "none"`. That covers
the dashboard and any selectable table. It leaves one gap: a `selection="none"`
table that uses `cell-clicked` for navigation is still mouse-only. Options: add
an explicit `interactive` boolean, treat "has a `row-activated`/`cell-clicked`
listener" as interactive (not really detectable), or leave it as is and
document that interactive rows need a selection mode.
Recommendation: leave it unless a real consumer hits the gap.

**Q6. `cell-clicked` vs `row-activated`.**
`cell-clicked` still fires on click, unchanged, for back-compat. `row-activated`
is the new one that also fires for the keyboard. Worth deprecating
`cell-clicked` for navigation use in the README, or leave both?

**Q7. Other `juel-table` gaps found but not touched** **Sorting and the empty state done 2026-10-11** (`sortable`, `sort-changed`, `external-sort`, `empty-text` / `empty` slot); paging is still open. — no empty state (an
empty `data` renders a bare header row), no column sorting, no paging.
`juel-data-grid` has paging but it's `DataSource`/URL-driven, so it isn't a
drop-in for an in-memory array. Is an in-memory paged/sortable table wanted, or
is that what `juel-data-grid` should grow into?

### Other components

**Q8. `juel-nav` `direction="vertical"`?** **Done 2026-10-11:** `direction="vertical"` is a sidebar (stacked, fills its height, never sticky, folds to the menu-button bar below 768px), `aria-current="page"` links are highlighted, and `nav`/`title`/`toggle`/`menu` parts are exposed. Original question:
It can't currently be a sidebar: its shadow root hard-codes a horizontal top
bar (row flex, fixed `--nav-height`, absolutely-positioned drop-down) and its
own 768px breakpoint, with no exposed parts. The dashboard uses plain markup
plus a hamburger button instead. `juel-tabs` and `juel-toolbar` both already
have a `direction` — should `juel-nav` match?

**Q9. `juel-chart`'s legend overlaps the x-axis tick labels** on line and bar
charts. Pre-existing, visible on the existing `chart.html` examples too. Fix in
the legend layout, or leave?

**Q10. `breadcrumb-item` / `tree-*` naming.** `juel-breadcrumb`'s separator
selector named a `breadcrumb-item` tag that has never existed (fixed to
`juel-breadcrumb-item`). The same unprefixed-tag pattern was flagged earlier for
`tree-*`. Worth a naming-consistency pass across the library?

### The gallery (not a question so much as a decision)

**Q11. `examples/index.html` is stale and broken** and has been for a while. It
uses `<juel-tabs vertical="true">` with `<div data-title="…">` children, but the
current `juel-tabs` takes `<juel-tab title="…">` and `direction="vertical"`.
Nothing tabs — all ~70 embedded example pages render stacked down one enormous
page. New entries have been following the broken convention. Worth a dedicated
pass to rebuild it; it's mechanical but touches every entry.

### Example polish, deliberately left

Not questions, just the queue if you want it done: debounce the customer filter
(re-renders 40 rows per keystroke), page the 150-row orders list, add a
skip-to-content link, make one route actually *blocked* so `route-blocked` is
demonstrated (the sign-in guard only ever redirects), and either use the
Settings currency in `money()` or drop the field.

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
