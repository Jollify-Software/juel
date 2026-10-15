// Files: a file manager over any IFileStorage (README.md). The storages and
// zip helpers are also on `window.juel.files` for pages that use the CDN build.
export * from './Storage/IFileStorage';
export * from './Storage/Paths';
export { hashOf } from './Storage/Hash';
export { LocalFileStorage, sortRecords } from './Storage/LocalFileStorage';
export type { Backend, Index, Describe, StoredRecord, LocalStorageOptions } from './Storage/LocalFileStorage';
export { MemoryFileStorage, MemoryBackend, MemoryIndex } from './Storage/MemoryFileStorage';
export { BrowserFileStorage, OpfsBackend, IdbIndex, describeMedia } from './Storage/BrowserFileStorage';
export { readZip, writeZip, crc32, ZipError } from './Zip/Zip';
export type { ZipEntry } from './Zip/Zip';
export { entriesUnder, zipFolder, unzipInto, canSaveToDisk, saveToDirectory } from './Zip/Transfer';
export { JuelFileManager } from './FileManager/FileManager';
export type { FileCommand, FileManagerEventMap, BeforeDeleteDetail, BeforeMoveDetail } from './FileManager/FileManagerEvents';
export { formatSize, formatDate, formatItemSize } from './FileManager/Format';

import { FileStorageError } from './Storage/IFileStorage';
import { accepts, checkPath, folderOf, join, kindOf, nameOf, normalise, parentsOf, typeOf, uniquePath, within } from './Storage/Paths';
import { MemoryFileStorage } from './Storage/MemoryFileStorage';
import { BrowserFileStorage } from './Storage/BrowserFileStorage';
import { readZip, writeZip } from './Zip/Zip';
import { canSaveToDisk, saveToDirectory, unzipInto, zipFolder } from './Zip/Transfer';

const g = globalThis as unknown as { juel?: Record<string, unknown> };
g.juel ??= {};
g.juel.files = {
    MemoryFileStorage, BrowserFileStorage, FileStorageError,
    // Not `import * as`: Parcel's scope hoisting loses a namespace import of a module this file also re-exports.
    paths: { accepts, checkPath, folderOf, join, kindOf, nameOf, normalise, parentsOf, typeOf, uniquePath, within },
    readZip, writeZip, zipFolder, unzipInto, canSaveToDisk, saveToDirectory,
};
