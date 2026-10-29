# Jollify Unified/Unique Element Library (Juel)

This is a Web Component library written in TypeScript and built with [Lit](https://lit.dev/).  
I think that [Bootstap](https://getbootstrap.com/) is too verbose, my component encapsulate all the markup and styles needed in one JavaScript file download.

## CDN

The Juel library can be used via CDN, just add the following script tag to your `HTML`:

```html
<script src="https://cdn.jsdelivr.net/gh/Jollify-Software/juel/dist/juel.js"></script>
```

# Global JavaScript API

Loading `juel.js` exposes a global `window.juel` object, in addition to the custom elements. This is a public API surface — external code calls into it directly (e.g. the Blazor bindings project talks to Juel through this via JS interop), so its shape should be treated as a compatibility contract, not internal detail.

`juel.js` also sets `window.$` / `window.jQuery` (jQuery is bundled and still required internally by several components).

## `juel.messageBox`

Themed replacements for `alert` / `confirm` / `prompt`. Each call returns a `Promise` that resolves with `{ status, value }` (`status` is a `MessageBoxResultStatus`: `OK`, `Cancel`, `Yes`, `No`).

```js
juel.messageBox.error(text, title?);
juel.messageBox.success(text, title?);
juel.messageBox.warning(text, title?);
juel.messageBox.question(text, title?);  // Yes/No buttons
juel.messageBox.show(args);              // full control: title, text, icon, buttons, prompt, close, labels
```

## `juel.toast`

```js
juel.toast.show(options);
juel.toast.into(message);     // info toast
juel.toast.success(message);
juel.toast.warning(message);
juel.toast.error(message);
```

## `juel.icon`

```js
juel.icon.exists(name);
juel.icon.get(name, svg?);
juel.icon.use(name);
juel.icon.iconify();
```

## `juel.guide`

```js
juel.guide.start(steps?, options?);  // guided tour / walkthrough overlay; returns the guide
juel.guide.end();                    // ends it, as skipped
juel.guide.seen(key); juel.guide.resetSeen(key);
```

A step is `{ target, title, html, placement, wait }`: `target` is a selector (` >>> ` crosses
into an open shadow root: `"my-panel >>> .save"`), an element, or a function returning one;
`html` is the body; `placement` is `auto` (default), `above`, `below`, `left` or `right`; a step
whose target isn't there is skipped, after waiting up to `wait` ms. The older
`{ selector, title, description }` steps still work (`description` is plain text). Options:
`onStart`, `onEnd`, `onNext`, `onPrev`, `host` (where the events go; default the document) and
`storageKey` (remember the guide as seen). The card shows "2 of 7", Back / Next / Done and Skip;
arrow keys move, Escape skips, Tab stays in the card; it follows Juel's light/dark look tokens,
and with reduced motion there's no pulse or sliding. Events: `guide-step`
(`{ index, step, target }`) and `guide-end` (`{ finished }`, true only for Done on the last step).

The same as markup (`examples/_Modules/guide-element.html`):

```html
<juel-guide id="tour" storage-key="home-tour">
  <juel-guide-step target="#new" title="New">Starts a <b>new</b> document.</juel-guide-step>
  <juel-guide-step target="my-panel >>> .save" title="Save" placement="left" wait="500">…</juel-guide-step>
</juel-guide>
<script>
  const tour = document.getElementById("tour");
  if (!tour.seen) tour.start();   // also tour.end(), tour.resetSeen()
</script>
```

## `juel.tips`

Every element with a `title` (or `data-tip`), in the page or inside an open shadow root, gets a
Juel tooltip instead of the browser's: after a short hover, at once on keyboard focus, on a long
press on touch; Escape hides it. One tooltip element for the page, kept on screen, in the look's
light/dark tokens. `data-shortcut="Ctrl+Z"`, or a trailing `(Ctrl+Z)` in the text, shows key caps.
While it shows, the native `title` is taken off (and put back after); its text goes to
`aria-description` for screen readers. Elements whose component declares a `title` property
(`juel-tab`, …) are skipped: there it's a label. A hover or focus that moves between two nodes of
one shadow tree never reaches the document, so juel.tips also listens on each shadow root an event
has passed through. `juel-tooltip` is unchanged. Example:
`examples/_Modules/tips.html`.

```js
juel.tips.disable();          // native titles again; juel.tips.enable() turns it back on
juel.tips.show(el); juel.tips.hide();
```

## `juel.device`

```js
juel.device.getDeviceSize();
juel.device.getOrientation();
juel.device.addResizeListener(listener);
juel.device.removeResizeListener(listener);
juel.device.addOrientationListener(listener);
juel.device.removeOrientationListener(listener);
```

## `juel.audio`

```js
juel.audio.play(src);  // returns false if that src is already playing
```

## `juel.theme`

```js
juel.theme.set(name);        // data-theme="name" on <html>, remembered, fires theme-changed
juel.theme.get(); juel.theme.getStored(); juel.theme.init(defaultTheme?);
juel.theme.clear();          // forget the choice: follow the system again
juel.theme.useLook(on?);     // turn Juel's opt-in look on (or off)
juel.theme.usesLook();
```

**Juel's look is opt-in.** Without it Juel looks exactly as it always has. `useLook()` (or
`<html data-juel-look>` in the page) adds a stylesheet of `--juel-…` tokens, light and dark:
`--juel-surface`, `-raised`, `-sunken`, `-border`, `-text`, `-muted`, `-hover`, `-pressed`,
`-accent` + `-accent-contrast`, `-selection` + `-selection-hover`, `-danger`, `-focus`; `--juel-radius-sm/md/lg`
(4/8/12px); `--juel-space-1…8` (4-pt); `--juel-text-xs…xl`; `--juel-font`, `--juel-font-mono`;
`--juel-shadow-1/2`. Dark follows `prefers-color-scheme` unless `data-theme` is `light` or
`dark` (with the look on and no stored choice, Juel drops `init()`'s one-off guess so the system decides live; `clear()` returns to that). Override any token on `:root[data-juel-look]` (e.g. your brand's `--juel-accent`).
With the look on, focus rings (buttons, menu items, tabs, `juel-text`) use `--juel-focus`, ahead of a page's `--primary`.
With the look on, `juel-file-manager` takes its colours from the tokens too (its own `--file-manager-…` properties still win); text on its accent, the chooser's primary button included, is `--juel-accent-contrast` (white without the look).
With the look on, `juel-gradient-editor` and `juel-shadow-editor` take their box and border from `--juel-surface` / `--juel-border`.

## `juel.params`

A `Proxy` over the current page's `URLSearchParams` — e.g. `juel.params.foo` reads the `?foo=` query parameter.

# Components

* [Bootstrap](https://getbootstrap.com/).
* [Bulma](https://bulma.io/).
* [Foundation](https://get.foundation/).
* [MudBlazor](https://www.mudblazor.com/).
* [Blazorise](https://blazorise.com/docs).
* [DevExpress](https://demos.devexpress.com/blazor/).
* [Telerik](https://www.telerik.com/blazor-ui).

## Buttons

### Button

`glyph="name"` shows the icon `--icon-name` (a CSS mask, in the button's text colour). The
[Lucide](https://lucide.dev) line icons are `glyph="lucide-<name>"` (e.g. `lucide-bold`): only the
names listed in `src/_Modules/Icons/Lucide.ts` are bundled, as data URLs in the script rather
than on `:root`, so pages don't carry them (ISC licence, `icons/lucide/LICENSE`); add a name
there to use another. `type="plain"` is a borderless tool button with a hover fill;
`pressed` gives it a pressed state (`aria-pressed`), and `toggle` makes it an on/off button that
always reports `aria-pressed`. `caret` adds a small down chevron after the content, for a
button that opens a menu (`--button-caret-size`, default 12px). `glyph-end` puts the glyph after the
label (`glyph="lucide-chevron-right" label="Next" glyph-end`). Example: `examples/Buttons/Button/tool-buttons.html`.

## Display

### Card

`juel-card` has `header`, `image` and `footer` slots around its content. Its box and sections are
parts, `part="card"`, `header`, `image`, `body` and `footer`, so a page can restyle them with
`::part()` (stretch the box to a grid cell, hide a section it doesn't use); nothing changes without
it. Example: `examples/Display/Card/card.html`.

## Editors

### Markdown Editor

`writer` gives `juel-markdown-editor` a calmer look for prose: headings bold and a little larger
but not underlined, syntax marks (`#`, `*`, `` ` ``, `>`) dimmed (`--juel-muted`), link text in the accent mixed 60/40 with `--juel-text` (so a light accent
still reads at 4.5:1, light and dark), and a leading
`---` … `---` front-matter block read as front matter (without it, the YAML's last line parses
as a setext heading). Long lines soft-wrap at the editor's edge (Home/End and the arrow keys
then move by visual line, as in a word processor). `prose` sets the text in a proportional font (`--juel-font-prose`, then
`--juel-font`); code, front matter and the gutter stay monospace. Both are off by default, and
the editor then looks as it always has. Example: `examples/Editors/MarkdownEditor/writer.html`.

`setDividers([{ offset, label }])` draws a rule above the line at each offset, with its label (a slide
number, say) in a gutter beside it; they follow the text as it's edited until the next call, and
`setDividers([])` clears them. The gutter only appears once it is first called (same example).

`front-matter-chip="Deck settings"` folds a leading `---` … `---` front-matter block into a chip with
that name. Clicking the name fires `front-matter-open` (open your own settings dialog); the chevron
shows the YAML for editing and hides it again, and moving the cursor into the block shows it too. An
unclosed block (still being typed) gets no chip. Off by default (same example).

Suggestions while typing (on `@codemirror/autocomplete`): set `.suggestions` to a list of
`{ after, label, detail?, insert?, info?, consume? }`. After its trigger (`after`: `:::` at the start of a line,
`![`, `[`, `](`, `{`, `in=`, or a front-matter key such as `theme:`, which also matches with spaces
after its colon) a list drops down, filtered by what's typed after it; ↑ ↓ move, Enter or Tab takes one, Escape closes. `insert` is a snippet: its first `${…}` field is
selected, Tab moves to the next. `consume` is text the insert also replaces when it comes straight
after the cursor: `consume: ']'` on a picture after `![` swallows the auto-closed `]`. `info` (HTML) shows beside the list with a "More in the guide" link
that fires `suggestion-help` `{ label }`. `.suggest` is a callback `({ after, typed }) => Suggestion[]`
(or a promise) for lists that change (files, pages), asked at every trigger and merged after the fixed
ones. `suggestions-live="false"` stops the list opening while typing; Ctrl+Space still opens it. The
list follows `--juel-raised`, `--juel-text`, `--juel-border` and `--juel-accent`, so light and dark.
With no suggestions and no `suggest`, nothing changes. Example:
`examples/Editors/MarkdownEditor/suggestions.html`.

### Colour

`juel-colour` is a click-to-open picker (colour input, hex field, swatches), firing `value-changed`.
`.palette` replaces the built-in eight swatches (colours, or `{ value, label }` to name one: theme
colours, an accent); `.recent` adds a "Recent" row (the page keeps the list). Parts `palette`,
`recent`, `swatch`. The popup opens rightwards from the swatch, or leftwards when that would run past
the window or a scrolling ancestor (a narrow side panel). With `value=""` (no colour) and the opt-in
look on, the swatch shows a "no colour" slash (`--juel-swatch-none`); without the look it is unchanged.
Example: `examples/Editors/Colour/colour.html`.

### Number

`juel-number` is a labelled number input (`value`, `min`, `max`, `step`). With `units="px,em,rem,%"`
it is a quantity: a text box that takes `48px` or `3`, steps with ArrowUp/ArrowDown (Shift for ten),
and has a unit menu beside it (`part="quantity"`, `input`, `unit`). It can be empty (`value` null,
`placeholder` shows). `value-changed` and `value-committed` (Enter, leaving the box, a step or a unit)
carry `{ value, unit, text }`; set it with `text` (`'48px'`) or `value` + `unit`. Without `units` it
is unchanged. Example: `examples/Editors/Number/number.html`.

### Select

`juel-select style-field="style"` styles each option with that field of its item (a font list
showing each font: `{ text, value, style: 'font-family: Georgia' }`). Without it options are
unstyled, as before. Example: `examples/Editors/Select/select-styled.html`.

### Plan Editor

`juel-plan-editor` edits an SVG plan, a floor plan most often (the Jollify app's virtual
layouts use Parterre's annotated SVG). Set `svg` (the text; read it back, or listen for
`plan-changed` `{ svg, reason }`). Its items are the root's shapes and groups and those in storey
groups (`<g data-fixture="level" data-level="n">`); each gets an `id` if it has none. `level` shows
one storey with the others faint and unpickable; `grid` (plan units, every tenth line darker) and
`snap` set the grid the selection moves on. Click selects (Shift adds), a box on empty space selects
what it touches, a drag moves the selection, the arrow keys nudge it (Shift: ten steps), Delete
removes it, Escape clears it; the wheel zooms, the middle button or Space+drag pans, `0` fits.
Its own history: `undo()` / `redo()` (Ctrl+Z, Ctrl+Y), `canUndo` / `canRedo`. API: `selection`,
`select(ids)`, `setAttributes(ids, { name: value | null })` (one undo step), `setLevelAttributes(level, { … })`
(a storey group's name or height, the group made if need be), `deleteSelection()`,
`itemAttributes(id)`, `fit()`, `zoom(factor)`. `selection-changed` `{ ids, attributes }`.
Drawing (`tool`): `rect` and `circle` by dragging, `polygon` and `polyline` by clicking points
(Enter, a double-click or the first point again to finish; Backspace takes a point back, Escape
drops the shape), `point` by a click. New shapes get `newAttributes` (an app's `data-fixture`,
`fill`…; `{id}` in a value is the shape's own id, e.g. `data-id: '{id}'`), go in the storey's group, are selected and fire `shape-created` `{ id, kind }`. Points
snap to corners nearby, else the grid; Shift keeps a line to 45°, Alt is free. One selected shape
shows handles: a rect's corners, a polygon's, polyline's or line's points (double-click an edge to
add one, Alt+click a point to remove it), a circle's radius. `marks` is SVG markup in plan units
drawn over the plan (an app's own arrows or labels): not in `svg`, not pickable, no history.
`ghosts` (`{ id, cx, cy, r, level?, label?, attributes? }[]`, plan units) are dashed placeholders for
shapes the app would place itself (the Jollify app's auto-placed VR platforms): pressing one with the
select tool draws it into the plan as a `<circle>` with its `attributes` and drags it on, as one undo
step (`plan-changed` `{ reason: 'draw' }`, then `ghost-drawn` `{ ghost, id }`). Example:
`examples/Editors/PlanEditor/plan-editor.html`.

## Layout

### Mdi

`chrome="minimal"` gives `juel-mdi` a quieter title bar for an app's fixed, docked layout:
small muted titles, no minimise button, and maximise/close shown only on hover or keyboard
focus. `collapsible` (row layouts) gives the first and last panes a collapse button that folds
them to a 32px strip at that side; a click anywhere on the strip (its icon, title or empty
space) expands them again, and from the keyboard the strip's expand button does the same
(Enter/Space). The strip is styled through `::part(collapsed-strip)`. `collapsePanel(id)`,
`expandPanel(id)` and `isCollapsed(id)` do the same from script, with `panel-collapsed` /
`panel-expanded` events, and `getLayout()` / `setLayout()` keep the collapsed panes
(`collapsed`). Without either attribute the panes look and behave as before. Example:
`examples/Layout/Mdi/chrome.html`.

Dragging a panel's tab out of the workspace pops it into its own window, which gets copies of
the document's stylesheets only. A panel with `data-poppable="false"` (one styled from a
shadow root, say) snaps back instead, and `popPanel(id)` returns `null` for it. Example: the
"No popout" section of `chrome.html`.

## Menus

### Menu

`juel-menu` opens under its `slot="trigger"` element. As a context menu, `openAt(x, y)` opens it at a
point in the viewport instead (a `contextmenu` event's `clientX` / `clientY`), with no trigger needed;
`openAt(x, y, { focusFirst: true })` moves focus to the first item, for a menu opened from the
keyboard. Escape, or an item chosen from the keyboard, returns focus to where it was. Use
`trigger="click"` so a click outside closes it. Example: `examples/Menus/Menu/context-menu.html`.

### Segmented

`juel-segmented` is one of a few choices as joined buttons (text alignment, a weight): set `.options`
(`{ value, label?, glyph?, title? }`) and `value`; a click, or the arrow keys, Home and End, fire
`value-changed` `{ value }`. With `clearable`, choosing the chosen one again clears it (`null`). Each
button is `part="option"` (`selected` on the chosen one). `stretch` fills the width, the buttons
sharing it equally. Each button is at least 24×24 (WCAG 2.5.8); `--segmented-min` changes that (e.g. `0` lets a stretched row too narrow for it shrink rather than clip its last option). Example: `examples/Buttons/Segmented/segmented.html`.

`juel-button` takes `--button-min-width` / `--button-min-height` for a smallest size (unset by default).

### Picker

`juel-picker` is one of several choices as tiles (a theme by its cover, a layout by its preview): each
child with a `value` attribute is a tile, showing whatever it holds. Set `value`; a click, Enter or Space
on a tile, or the arrow keys, Home and End, fire `value-changed` `{ value }`. The tiles get
`role="radio"`, `aria-checked`, a roving `tabindex` and `selected` on the chosen one.
`--picker-tile-width` (140px) and `--picker-gap` (10px) set the grid. Example:
`examples/Buttons/Picker/picker.html`.

## Navigation

### Accordion

### Tabs

`juel-tabs` exposes `part="tabs"` (the tab strip), `part="tab"` (each top-level tab, plus `selected`
on the chosen one) and `part="content"` (the panel), so a page can restyle them with `::part()`;
nothing changes without it.

### Toolbar

`juel-toolbar overflow` keeps the toolbar to one row: items that don't fit are hidden from the end
(they get `data-overflowed`) and offered in a "…" menu at its end (`part="more"`). Choosing a hidden
button there clicks it; a hidden `juel-menu` has its items listed, and choosing one fires that menu's
`menu-select` as if it had been chosen there. `.spacer` and `.gap` children are never listed. Without
the attribute the toolbar wraps as before. Example: `examples/Navigation/Toolbar/overflow.html`.

## Purpose

These Web Components have been created for the [Jollify app](https://jollify.app) and website.  
I have decided to make this project open source in the hope that others might find these useful.

### Pro & Blazor binding

In the future I think that these components could be extended into a Pro version which could be licensed.  
My app is also using the [Blazor framework](https://dotnet.microsoft.com/en-us/apps/aspnet/web-apps/blazor) so I have created a bindings project that is used for JS interop between Blazor and my components.
