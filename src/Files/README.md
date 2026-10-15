# Files

A file manager for Juel: a OneDrive-like view of a tree of files and folders,
over any storage. Built in phases (the plan is
`jollify/ASSET-MANAGER-PLAN.md` §12 in the Jollify workspace):

| Phase | What | State |
|---|---|---|
| F1 | `IFileStorage`, `MemoryFileStorage`, `BrowserFileStorage`, zip in/out | Done |
| F2 | `<juel-file-manager>`: breadcrumb, details list, selection, command bar, ⋯ menu, rename, move/copy, upload, download, delete, keyboard | Done |
| F3 | Drag and drop: from the desktop, move within, paste, drag out | Next |
| F4 | Grid view, details pane, `<juel-file-viewer>`, search | |
| F5 | `<juel-file-picker>`, zip download/import, quota line | |

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
Deleting asks first (Juel's message box). Changes made to the storage
elsewhere show at once.

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
| `no-confirm` | don't ask before deleting |
| `page-size` | items per `list` call (default 500; "Show more" for the rest) |
| `commands` (property) | the page's own `FileCommand`s: `{ id, label, icon?, when?(records), run(records) }` |
| `confirm` (property) | replaces the delete confirmation: `(title, text, action) => Promise<boolean>` |
| `theme="dark"` | dark without a dark page (a page with `<html data-theme="dark">` gets it anyway) |

Methods: `navigate(path)`, `select(paths)`, `reload()`, `startRename(path)`,
`upload(files, folder?)`; `selectedRecords`, `records`, `loaded` (a promise
for the folder on show).

Events (bubbling, composed): `path-changed`, `selection-changed`,
`file-open` (cancelable; the default downloads the file until F4's viewer),
`file-added`, `file-moved` ({ moves, copy, rename }: every item that moved,
folders and the files in them), `file-deleted`, `file-error`. Before a
change, `file-before-delete` and `file-before-move` let the page take part:
push to `detail.notes` (shown in the confirmation: "Used by 3 decks"),
`detail.waitUntil(promise)` (resolve `false` to stop it), or
`preventDefault()`. Types: `FileManagerEvents.ts`.

Styling: CSS custom properties (`--file-manager-background`, `-accent`,
`-selected`, … listed in `FileManagerStyles.ts`) and parts (`bar`, `crumbs`,
`list`, `status`, `menu`, `empty`).

Example: `examples/Files/file-manager.html` (memory or browser storage,
dark, read-only, a type filter, a page command, a delete note, an event
log).

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
(`MemoryFileStorage`, `BrowserFileStorage`, `FileStorageError`, `paths`,
`zipFolder`, `unzipInto`, `readZip`, `writeZip`, `canSaveToDisk`,
`saveToDirectory`).

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
  records, and thumbnails; and `<juel-file-manager>` driven on its example
  page (`tests/e2e/file-manager.spec.ts`). The example loads `dist/juel.js`,
  so build that first (`npx parcel build juel.ts`).
- The selection rules and formatting are unit-tested in Jest
  (`tests/Files/fileManagerTests.ts`).

A new storage (an HTTP one, say) should pass `storageContract` too.
