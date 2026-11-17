# Demos: `juel.demo`

A demo shows a person how to do something **in the real page**: a ghost hand
(`<juel-ghost>`, a pointing fingertip in the accent colour) moves to each
control, opens menus, drags, types and presses keys, while a caption says what
it's doing and why. The page's own code runs, because the hand sends the same
events a person's pointer and keyboard do. **Coach mode** is the same script the
other way round: the target is ringed and each step waits for the person to do
it. Built for Jollify's "Show me" (`jollify/SHOW-ME-PLAN.md` SM0); nothing here
is Jollify-specific.

Example: `examples/_Modules/demo.html`. Specs: `tests/e2e/demo.spec.ts` (the
browser), `tests/Demo/demoScriptTests.ts` (the script's pure half).

```js
const run = juel.demo.play({
    title: 'Split a heading into letters',
    steps: [
        { say: 'This splits a heading into letters, so you can move each one on its own.' },
        { choose: '#split', item: 'Letters', say: 'Open Split into and choose Letters.' },
        { wait: '#slide >>> .char-3' },
        { drag: '#slide >>> .char-3', to: { dx: 0, dy: -40 }, say: 'Drag one letter up.' },
        { choose: '#split', item: 'Reveal ▸ Fade in' },
        { type: 'Hello', into: '#note' },
        { key: 'Ctrl+Z' },
        { click: '#done', say: 'And press Done.' },
    ],
}, { speed: 1, host: myView });
const { result } = await run.finished;   // 'finished' | 'stopped' | 'failed'
```

## Steps

One action key per step (two is a mistake, caught before it plays). Every step
may also have `say` (the caption; it stays until another step says something),
`at` (where on the target, as fractions of its box: `{ x: .5, y: .5 }` is the
middle), `timeout` (ms to wait for the target) and, for coach mode, `check`.

| Step | Does |
|---|---|
| `{ say }` | A caption only, held long enough to read (1.4–6 s at 1×) |
| `{ point: target }` | Glides to the target |
| `{ click: target }`, `{ dblclick: target }` | Glides there and presses |
| `{ choose: menu, item }` | Opens a `juel-menu` (or its trigger, or anything with `menuitem` / `option` items) and clicks through: `'Reveal ▸ Fade in'` or `['Reveal', 'Fade in']`. Items match by label or value, ignoring case, a leading ✓ and a trailing ▸ or …. Into a submenu the hand goes along the item and straight across, so the submenu stays open |
| `{ drag: target, to, toAt?, moves? }` | Presses, moves in `moves` steps (24), lets go. `to` is a target or `{ dx, dy }` in page pixels |
| `{ type: text, into? }` | Clicks into `into` unless it has the focus, then types at a typing pace |
| `{ key: 'Ctrl+Z' }` | Presses a key, with key caps shown. `Enter`, `Esc`, `Space`, `Up`, `Shift+ArrowDown`, `?` … |
| `{ wait: ms \| target \| fn }` | Real time (not scaled by speed), a target to appear, or a condition (true, or a promise) |
| `{ event: name, on? }` | The next `name` event on `on` (default the document); listened for from the step before, so a quick one isn't missed |
| `{ call: fn }` | Set-up nobody needs to watch; awaited |

**Targets** are selectors where ` >>> ` crosses into an open shadow root **or a
same-origin iframe** (`'juel-frame >>> iframe >>> h1 .char-3'`), an element, or
a function. The same targets work in `juel.guide` (`../Guide/GuideTarget.ts`).

## Sandboxed frames (the agent)

A frame with an opaque origin (`sandbox="allow-scripts"`, as `juel-frame` makes by default for a
deck preview) can't be reached by the page's script. Inside such a frame, call
**`juel.demo.agent()`** (or `installDemoAgent()` from `DemoAgent.ts`, as Jetty's embed does): the
demo then finds things and acts in the frame by `postMessage`, and the agent listens only to its
parent window. Target it as `{ frame: iframeElement, selector: '…' }`, or with a selector string
that runs into the frame (`'#preview >>> .slide-2 h1'`). Click, double-click, point, drag, type,
keys and waiting all work; `choose` doesn't (click a menu's items in turn instead). While the hand
plays, the agent keeps the person's own input out of the frame too and tells the page when they
press, so the demo pauses. Coach mode rings the target and the agent says when the person clicks it.
The messages are listed at the top of `DemoAgent.ts`.

At the end of a played demo the focus goes back to what had it before.

## Options

`play(script, options)` / `coach(script, options)`: `speed` (1; the bar goes ½×
1× 2×), `host` (where events fire; default the document), `root` (where
selectors are looked up), `timeout` (5000 ms), `title`, `bar` (false: no bar),
`holdAtEnd` (keep the bar with **Watch again** and **Close**), `beforeReplay`
(awaited before Start again / Watch again: put the page back), `paused` (start
paused).

The run: `pause()`, `resume()`, `step()` (one step, then pause), `setSpeed(n)`,
`replay()`, `stop()`, `index`, `paused`, `ended`, `finished` (a promise).
Also `juel.demo.stop()`, `juel.demo.active()`, and `juel.demo.check(script)`
(throws on a mistake without playing).

**Events** (on `host`): `demo-step` `{ index, step }`, `demo-replay`, and
`demo-end` `{ result, index, error? }`. A failed demo (a target that never came)
says which step in `error` and on the console. **A demo doesn't undo what it
did**: a page that wants that (Jollify does) snapshots before `play` and puts
the snapshot back on `demo-end` and in `beforeReplay`.

## How the hand's input works (`DemoInput.ts`)

- **Where events go**: the deepest element at the point, through open shadow
  roots and same-origin iframes, in that element's own window and coordinates
  (a scaled iframe, as `juel-frame` makes, is mapped through its scale:
  `DemoGeometry.ts`). Elements with `pointer-events: none` are passed over.
- **Hover** like a browser's: `pointerover`/`pointerout` on the element,
  `pointerenter`/`pointerleave` (not composed) on each element it moves into or
  out of, and the `mouse*` twins. `juel-menu-item` opens its submenu on
  `pointerenter` for this.
- **Press**: `pointerdown`, `mousedown` (unless the pointerdown was cancelled),
  focus (unless the mousedown was cancelled), `pointerup`, `mouseup`, and `click`
  on the nearest element both were in; `dblclick` after the second click.
- **Pointer capture**: while a demo plays, `setPointerCapture` with the demo's
  pointer id (`DemoPointerId`) is kept by the demo instead of the browser (which
  would throw), and moves and the release go to the capturing element, then
  `lostpointercapture`. The prototypes are put back at the end.
- **HTML drag-and-drop**: a press on a `draggable="true"` element that moves 4 px
  becomes `dragstart` (with a real `DataTransfer`), `dragenter`/`dragover`/
  `dragleave`, `drop` (when a `dragover` was cancelled) and `dragend`.
- **Typing**: fields get `beforeinput`, `setRangeText` and `input`;
  contenteditable (CodeMirror too) gets `execCommand('insertText')`, which fires
  the browser's own input events. A key gets `keydown`/`keyup` and, in a field or
  editable text, Backspace, Delete, Enter or a character do their default.
- Every event the hand sends has `isTrusted: false`. **While it plays, the
  person's own pointer and keys are kept from the page**: a press pauses it,
  Space pauses or plays, → steps, Escape stops; only the bar takes them. CSS
  `:hover` still follows the real mouse (a page can't stop that).

## Look

- `<juel-ghost>` (`Ghost.ts`): the hand, the tap ripple, the pressed-in finger
  while dragging, key caps, the caption bubble (it flips near the right and
  bottom edges; on screens 600 px wide or less the caption is in the bar
  instead), coach mode's ring, and an `aria-live` copy of the caption for screen
  readers. Top layer (a manual popover), `pointer-events: none`. With reduced
  motion the hand jumps instead of gliding (drags still move) and nothing pulses.
- `<juel-demo-bar>` (`DemoBar.ts`): title, "3 of 9", Pause / Play, Next step,
  speed, Start again and Stop; in coach mode Show me, Skip (Next on a step to
  read) and Stop; at the end (with `holdAtEnd`) Watch again and Close. Juel's
  look tokens, light and dark.
