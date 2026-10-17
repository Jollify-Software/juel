# Files

A file manager for Juel: a OneDrive-like view of a tree of files and folders,
over any storage. Built in phases (the plan is
`jollify/ASSET-MANAGER-PLAN.md` §12 in the Jollify workspace):

| Phase | What | State |
|---|---|---|
| F1 | `IFileStorage`, `MemoryFileStorage`, `BrowserFileStorage`, zip in/out | Done |
| F2 | `<juel-file-manager>`: breadcrumb, details list, selection, command bar, ⋯ menu, rename, move/copy, upload, download, delete, keyboard | Done |
| F3 | Drag and drop: from the desktop, move within, paste, drag out | Done |
| F4 | Tiles view, details pane, `<juel-file-viewer>`, search | Done |
| F5 | `<juel-file-picker>`, zip import, quota line | Done |

## `<juel-file-manager>`

```html
<juel-file-manager root-label="My files"></juel-file-manager>
<script>
  const manager = document.querySelector('juel-file-manager');
  manager.storage = await juel.files.BrowserFileStorage.open({ folder: 'files', database: 'my-files' });
</script>
```

Looks and works like OneDrive's file list (screenshots in the Jollify
workspace, `Asset Manager/`): a command bar that follows the selection
(New folder and Upload with nothing selected; Open, Download, Rename, Move
to, Copy to, Delete, and a "✕ N selected" chip with a selection), a
breadcrumb, and a details list (Name, Modified, File size; click a header to
sort) with round checkboxes and a ⋯ menu per row (also on right-click,
Shift+F10 and the ContextMenu key). Rename is in place; New folder makes
`New folder` and starts renaming it. Move to / Copy to open a folder chooser
(a folder isn't offered inside itself; a name that's taken keeps both).
Download gives one file as itself, a folder or several items as a .zip.
In Chrome and Edge, Save to disk writes the folder on show (in the bar with
nothing selected) or the selection (in the ⋯ menu) into a folder on disk the
user picks (`showDirectoryPicker`, through `saveToDirectory`); not with
`browse`.
Deleting asks first (Juel's message box). Changes made to the storage
elsewhere show at once.

The bar stays on one line: when its commands don't fit with their labels
they show as icons (with tooltips), and if that's still too wide the rest go
under a ⋯ at its end. Search (on the breadcrumb line) looks for names in the
folder on show and every folder below; results say which folder each is in,
and Escape or the folder's crumb ends it. View switches between the details
list and tiles (thumbnails, from the storage's `thumbnail()` or the picture
itself up to 4 MB). Details opens a pane beside the list: the item's preview,
type, size, dimensions, duration and dates, a selection's total, or the
folder's count, then the page's `details` slot.

Opening a file (double-click, Enter, Open) shows it in `<juel-file-viewer>`
unless the page cancels `file-open`. Upload offers files, a folder, or a zip
to unpack; a .zip already in the storage has Extract in its ⋯ menu. A zip
holding one folder comes out as that folder; anything else goes into a new
folder named after the zip (as Windows' Extract All does). A storage that
knows its quota (`capabilities.quota`) gets a "1.2 MB of 10 GB used" line
with a meter.

Drag and drop:

- **From the desktop** onto the list: the whole view gets a dashed outline
  and the files go into the folder on show, folders and all (empty ones
  too). Onto a **folder row** or a **crumb**: that gets the outline and a
  "+ Copy" badge, and the files go there. A name that's taken keeps both; a
  dropped folder whose name exists merges into it.
- **Rows within the view** onto a folder row or a crumb: a move (a "Move"
  badge, the dragged name or "N items" as the drag image), through
  `file-before-move`. A selected row takes the whole selection with it. The
  folder they're in, and the dragged folders themselves, aren't targets.
- **Rows out of the view** carry `application/x-juel-file` (a JSON array of
  paths) and `text/plain` (the paths, one per line), `effectAllowed`
  `copyMove`: a text box or an editor takes the paths.
- **Paste** (Ctrl+V) of files, or a screenshot (`image.png`), uploads into
  the folder on show. Pasted text is left alone.
- Touch keeps long-press to select; it never starts a row drag.

Keyboard (the list is one tab stop): arrows, Home/End, PageUp/PageDown
(Shift extends, Ctrl moves without selecting), Space toggles, Enter opens,
Backspace or Alt+↑ goes up, F2 renames, Delete deletes, Ctrl+A selects all,
Escape clears. Touch: long-press selects; with something selected, a tap
adds or removes.

| Attribute / property | |
|---|---|
| `storage` (property) | the `IFileStorage` |
| `path` | the folder on show (`''` is the top) |
| `root-label` | the top's name, default `My files` |
| `selection-mode` | `multiple` (default), `single`, `none` |
| `accept` | only files of these types: `image/*,.csv` |
| `sort`, `descending` | `name`, `modified`, `size`, `type` |
| `readonly` | browse, open and download only (also when the storage can't write) |
| `browse` | browse, open, download, upload and New folder, but no Rename, Move to, Copy to, Duplicate, Extract or Delete (bar, ⋯ menu, F2, Delete key, viewer, or dragging rows onto a folder) |
| `no-confirm` | don't ask before deleting |
| `page-size` | items per `list` call (default 500; "Show more" for the rest) |
| `view` | `list` (default) or `grid` (tiles) |
| `details` | shows the details pane |
| `commands` (property) | the page's own `FileCommand`s: `{ id, label, icon?, when?(records), run(records) }` |
| `confirm` (property) | replaces the delete confirmation: `(title, text, action) => Promise<boolean>` |
| `theme="dark"` | dark without a dark page (a page with `<html data-theme="dark">` gets it anyway) |

Methods: `navigate(path)`, `select(paths)`, `reload()`, `startRename(path)`,
`upload(files, folder?)`, `unpack(zip, name, folder?)`, `search(text)`,
`open(record)`, `announce(message, error?)` (the page's own message in the
status line, e.g. after an action from a `header` slot); `selectedRecords`, `records`, `loaded` (a promise for the
folder on show).

Events (bubbling, composed): `path-changed`, `selection-changed`,
`file-open` (cancelable; the default shows the file in the viewer),
`file-added`, `file-moved` ({ moves, copy, rename }: every item that moved,
folders and the files in them), `file-deleted`, `file-error`. Before a
change, `file-before-delete` and `file-before-move` let the page take part:
push to `detail.notes` (shown in the confirmation: "Used by 3 decks"),
`detail.waitUntil(promise)` (resolve `false` to stop it), or
`preventDefault()`. Types: `FileManagerEvents.ts`.

Slots: `header` (above the list: the app's "This deck" strip) and
`details` (in the details pane: "Also used by").

Styling: CSS custom properties (`--file-manager-background`, `-accent`,
`-selected`, `-tile-width`, `-details-width`, … listed in
`FileManagerStyles.ts`) and parts (`bar`, `crumbs`, `search`, `list`,
`details`, `status`, `quota`, `menu`, `empty`, `drop-badge`).

Example: `examples/Files/file-manager.html` (memory or browser storage,
dark, read-only, tiles, details, a type filter, a page command, a delete
note, a box to drag rows out into, an event log).

## `<juel-file-viewer>`

The full-window, dark view of one file, as OneDrive's: the name at the top,
"3 of 8", Download, Delete (with `can-delete`) and ✕; ‹ › (or the arrow
keys, Home/End, a swipe) through the folder's other files. Pictures, video,
sound, PDFs and text (the first 256 KB) show, a CSV or a JSON array of
objects as a table (the header and first 20 rows); anything else gets its icon
and a Download button. The manager opens one for `file-open` and puts it on
`<body>`, so a panel's transform or overflow can't clip it and Juel's
message box (z-index 101) shows over it (it's at
`--file-viewer-z-index`, 100). Alone: `viewer.show(storage, files, index)`.
Events: `viewer-change`, `viewer-close`, `viewer-download` (cancelable),
`viewer-delete` (the page deletes; `viewer.forget(record)` then takes it
out).

(Not built on `juel-lightbox`: that one gathers images from the page by
selector, needs jQuery, and has no name bar, download or delete.)

## `<juel-file-picker>`

The file manager in a dialog, to choose files: `accept`ed types only,
`multiple` or one, Open / Cancel. Upload puts new files in the folder on
show and selects them; a double-click (or Enter) on a file chooses it; Open
with one folder selected goes into it. It only browses: it sets the
manager's `browse`, so there is no Rename, Move to, Copy to or Delete. While it's open the rest of the page
is blocked: it's a modal `<dialog>` (so it opens over a modal dialog the page
already has open, such as an app's "Insert image" dialog), and the rest of
the page is `inert` too. Being browse-only it never needs Juel's message box
over it. Focus goes back afterwards.

```ts
const [picture] = await juel.files.pick({ storage, accept: 'image/*', heading: 'Choose a picture' });
// or an element on the page:
const records = await picker.pick();   // [] on Cancel
```

Attributes: `accept`, `multiple`, `path` (follows the user), `root-label`,
`heading`, `open-label`; the `selected` property (paths in `path`) starts
with those files selected, such as the one already chosen. Events: `file-picked`, `pick-cancel`. Example:
`examples/Files/file-picker.html`.

## Storage

Everything goes through `IFileStorage` (`Storage/IFileStorage.ts`). It is
shaped for a server as much as for the browser, so an API whose records live
in a document database can implement it unchanged:

- everything is `async`;
- every `FileRecord` has a stable `id` as well as its `path` (a move or rename
  changes the path, never the id), plus `kind`, `size`, `type`, `created`,
  `modified`, `hash`, `items` (folders) and an open `meta`;
- `list(folder, { search, deep, sort, descending, accept, limit, cursor })`
  returns `{ items, next }`, a page at a time; folders come first;
- `write` takes `onConflict`: `replace` (default), `keep-both`
  (`name (2).ext`) or `fail`; the same bytes again write nothing (`same`);
- `move` and `copy` never overwrite;
- errors are `FileStorageError`s with a `code`: `not-found`, `exists`,
  `invalid-path`, `quota`, `offline`, `forbidden`, `conflict`, `unsupported`;
- `capabilities` says what a storage can do (`copy`, `thumbnails`, `quota`,
  `watch`), so the UI hides the rest;
- `subscribe` reports changes (`added`, `changed`, `removed`, `moved`), one
  per operation, with `folder` set for folders.

Two storages ship:

```ts
// Memory: examples, tests, a fallback. Optional starting files and folders.
const files = new MemoryFileStorage({ files: { 'notes/a.txt': 'hello' }, folders: ['images'] });

// The browser: bytes in OPFS, records in IndexedDB, thumbnails and
// dimensions from the browser's decoders. Falls back to memory without OPFS.
const files = await BrowserFileStorage.open({ folder: 'files', database: 'juel-files' });
await files.keep(); // ask for lasting storage, on the user's first upload
```

Both are `LocalFileStorage`s: the whole tree is held in memory once open, so
they also have sync helpers (`get`, `all`, `findByHash`, `findByName`).
Records written by the Jollify app before ids existed (no `id`, no `kind`)
open fine: they're given ids on first open.

From the CDN build, the same things are on `window.juel.files`
(`MemoryFileStorage`, `BrowserFileStorage`, `FileStorageError`,
`describeMedia`, `paths`, `zipFolder`, `unzipInto`, `readZip`, `writeZip`,
`canSaveToDisk`, `saveToDirectory`, `pick`). Pass `describe: describeMedia()`
to a `MemoryFileStorage` for dimensions and thumbnails.

## Zip and disk

`Zip/Zip.ts` writes stored (uncompressed) zips streamed from Blobs and reads
stored and deflated ones; no Zip64 (4 GB / 65 535 entries). `Zip/Transfer.ts`
does it for a storage: `zipFolder(storage, folder)`, `unzipInto(storage, zip,
folder, onConflict)`, and `saveToDirectory(storage, folder, handle)` for
Chrome and Edge's `showDirectoryPicker`.

## Tests

- `npm test` (Jest): `tests/Files/storageTests.ts` runs the shared contract
  (`tests/shared/storageContract.ts`) against `MemoryFileStorage`, plus
  paths, hashing, zip and transfer.
- `npm run test:browser` (Playwright, installed Chrome): the same contract
  against `BrowserFileStorage` in a real page
  (`tests/browser/files-contract.html`), plus reopening, older Jollify
  records, and thumbnails; `<juel-file-manager>` and the viewer driven on
  their example page (`tests/e2e/file-manager.spec.ts`: drops are synthetic
  `DataTransfer`s, row drags real mouse drags where Chrome allows), and the
  picker on its own (`tests/e2e/file-picker.spec.ts`). The example loads `dist/juel.js`,
  so build that first (`npx parcel build juel.ts`).
- The selection rules and formatting are unit-tested in Jest
  (`tests/Files/fileManagerTests.ts`).

A new storage (an HTTP one, say) should pass `storageContract` too.
