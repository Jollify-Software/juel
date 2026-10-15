# Files

A file manager for Juel: a OneDrive-like view of a tree of files and folders,
over any storage. Built in phases (the plan is
`jollify/ASSET-MANAGER-PLAN.md` §12 in the Jollify workspace):

| Phase | What | State |
|---|---|---|
| F1 | `IFileStorage`, `MemoryFileStorage`, `BrowserFileStorage`, zip in/out | Done |
| F2 | `<juel-file-manager>`: breadcrumb, details list, selection, command bar, ⋯ menu, rename, delete, keyboard | Next |
| F3 | Drag and drop: from the desktop, move within, paste, drag out | |
| F4 | Grid view, details pane, `<juel-file-viewer>`, search | |
| F5 | `<juel-file-picker>`, zip download/import, quota line | |

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
  records, and thumbnails.

A new storage (an HTTP one, say) should pass `storageContract` too.
