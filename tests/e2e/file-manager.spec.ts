// <juel-file-manager> in Chrome, on its example page
// (examples/Files/file-manager.html, a MemoryFileStorage with sample files).
import { Download, expect, Page, test } from '@playwright/test';

const names = (page: Page) => page.locator('juel-file-manager .item .label').allTextContents();
const row = (page: Page, path: string) => page.locator(`juel-file-manager .item[data-path="${path}"]`);
const command = (page: Page, id: string) => page.locator(`juel-file-manager .bar [data-command="${id}"]`);
const menuItem = (page: Page, id: string) => page.locator(`juel-file-manager .menu [data-item="${id}"]`);
const selected = (page: Page) => page.locator('juel-file-manager .item[aria-selected="true"]').evaluateAll(rows => rows.map(r => r.getAttribute('data-path')));
const status = (page: Page) => page.locator('juel-file-manager .status');
const list = (page: Page) => page.locator('juel-file-manager .list');
const crumbs = (page: Page) => page.locator('juel-file-manager .crumb').allTextContents();

/** Juel's message box: its confirm (or cancel) button. */
async function answer(page: Page, ok: boolean) {
    const button = page.locator(`#dialog-footer juel-button#${ok ? 'ok' : 'cancel'}`);
    await button.waitFor();
    await button.click();
}

/** A download's bytes. */
async function read(download: Download): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
}

let errors: string[];

test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('examples/Files/file-manager.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await expect(page.locator('juel-file-manager')).toHaveAttribute('data-storage', 'memory');
    await expect(row(page, 'notes.md')).toBeVisible();
});

test.afterEach(() => {
    expect(errors).toEqual([]);
});

test('lists a folder, folders first, and sorts by a column', async ({ page }) => {
    expect(await names(page)).toEqual(['Data', 'Empty folder', 'Pictures', 'Styles', 'Video', 'logo.png', 'notes.md']);
    await expect(row(page, 'Data').locator('.size')).toHaveText('3 items');
    await expect(row(page, 'notes.md').locator('.size')).toHaveText('23 bytes');
    await page.locator('juel-file-manager .head [data-sort="name"]').click();
    expect(await names(page)).toEqual(['Video', 'Styles', 'Pictures', 'Empty folder', 'Data', 'notes.md', 'logo.png']);
    await page.locator('juel-file-manager .head [data-sort="size"]').click();
    expect((await names(page)).slice(-2)).toEqual(['notes.md', 'logo.png']);
    await command(page, 'sort').click();
    await menuItem(page, 'sort-name').click();
    expect(await names(page)).toEqual(['Data', 'Empty folder', 'Pictures', 'Styles', 'Video', 'logo.png', 'notes.md']);
});

test('opens folders, and the breadcrumb goes back', async ({ page }) => {
    await row(page, 'Pictures').dblclick();
    expect(await crumbs(page)).toEqual(['My files', 'Pictures']);
    expect(await names(page)).toEqual(['2026', 'harbour.png', 'sunset.png']);
    await row(page, 'Pictures/2026').dblclick();
    expect(await crumbs(page)).toEqual(['My files', 'Pictures', '2026']);
    await page.locator('juel-file-manager .crumb[data-path="Pictures"]').click();
    expect(await names(page)).toEqual(['2026', 'harbour.png', 'sunset.png']);
    await page.locator('juel-file-manager .crumb[data-path=""]').click();
    await expect(row(page, 'notes.md')).toBeVisible();
    await row(page, 'Empty folder').dblclick();
    await expect(page.locator('juel-file-manager .empty')).toContainText('This folder is empty');
});

test('selects by click, Ctrl, Shift, checkbox and select-all; the bar follows', async ({ page }) => {
    await expect(command(page, 'new-folder')).toBeVisible();
    await row(page, 'Data').click();
    expect(await selected(page)).toEqual(['Data']);
    await expect(command(page, 'open')).toBeVisible();
    await expect(command(page, 'rename')).toBeVisible();
    await expect(command(page, 'new-folder')).toHaveCount(0);
    await row(page, 'Styles').click({ modifiers: ['Shift'] });
    expect(await selected(page)).toEqual(['Data', 'Empty folder', 'Pictures', 'Styles']);
    await row(page, 'Empty folder').click({ modifiers: ['Control'] });
    expect(await selected(page)).toEqual(['Data', 'Pictures', 'Styles']);
    await expect(command(page, 'rename')).toHaveCount(0); // only for one item
    await expect(page.locator('juel-file-manager .chip')).toHaveText('3 selected');
    await row(page, 'notes.md').locator('.check').click();
    expect(await selected(page)).toEqual(['Data', 'Pictures', 'Styles', 'notes.md']);
    await page.locator('juel-file-manager .head .check').click();
    expect((await selected(page)).length).toBe(7);
    await page.locator('juel-file-manager .head .check').click();
    expect(await selected(page)).toEqual([]);
    await row(page, 'logo.png').click();
    await page.locator('juel-file-manager .chip').click();
    expect(await selected(page)).toEqual([]);
});

test('the keyboard: arrows, Shift, Enter, Backspace, Escape, Ctrl+A', async ({ page }) => {
    await list(page).focus();
    await page.keyboard.press('ArrowDown');
    expect(await selected(page)).toEqual(['Data']);
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    expect(await selected(page)).toEqual(['Data', 'Empty folder', 'Pictures']);
    await page.keyboard.press('ArrowDown');
    expect(await selected(page)).toEqual(['Styles']);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    expect(await crumbs(page)).toEqual(['My files', 'Pictures']);
    await page.keyboard.press('Backspace');
    expect(await crumbs(page)).toEqual(['My files']);
    expect(await selected(page)).toEqual(['Pictures']); // back where we were
    await page.keyboard.press('Control+a');
    expect((await selected(page)).length).toBe(7);
    await page.keyboard.press('Escape');
    expect(await selected(page)).toEqual([]);
    await page.keyboard.press('End');
    expect(await selected(page)).toEqual(['notes.md']);
});

test('renames in place: F2 or the ⋯ menu; Enter keeps, Escape doesn\'t', async ({ page }) => {
    await row(page, 'notes.md').click();
    await page.keyboard.press('F2');
    const input = page.locator('juel-file-manager input.rename');
    await expect(input).toBeFocused();
    expect(await input.evaluate((i: HTMLInputElement) => [i.selectionStart, i.selectionEnd])).toEqual([0, 5]); // the name, not the extension
    await page.keyboard.type('todo');
    await page.keyboard.press('Escape');
    await expect(row(page, 'notes.md')).toBeVisible();
    await row(page, 'notes.md').locator('.more-actions').click();
    await menuItem(page, 'rename').click();
    await input.fill('todo.md');
    await page.keyboard.press('Enter');
    await expect(row(page, 'todo.md')).toBeVisible();
    await expect(row(page, 'notes.md')).toHaveCount(0);
    expect(await selected(page)).toEqual(['todo.md']);
    await expect(status(page)).toHaveText('Renamed "notes.md" to "todo.md"');
    // A name that's taken: says so, nothing changes.
    await page.keyboard.press('F2');
    await input.fill('logo.png');
    await page.keyboard.press('Enter');
    await expect(status(page)).toContainText('already exists');
    await expect(row(page, 'todo.md')).toBeVisible();
});

test('new folder starts renamed; upload goes into the folder on show', async ({ page }) => {
    await command(page, 'new-folder').click();
    const input = page.locator('juel-file-manager input.rename');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('New folder');
    await page.keyboard.type('Drafts');
    await page.keyboard.press('Enter');
    await expect(row(page, 'Drafts')).toBeVisible();
    await row(page, 'Drafts').dblclick();
    const chooser = page.waitForEvent('filechooser');
    await command(page, 'upload').click();
    await menuItem(page, 'upload-files').click();
    await (await chooser).setFiles([
        { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('aaa') },
        { name: 'b.csv', mimeType: 'text/csv', buffer: Buffer.from('x,y\n1,2\n') },
    ]);
    await expect(row(page, 'Drafts/a.txt')).toBeVisible();
    await expect(row(page, 'Drafts/b.csv')).toBeVisible();
    await expect(status(page)).toHaveText('Uploaded 2 files');
    // The same name again keeps both.
    const again = page.waitForEvent('filechooser');
    await command(page, 'upload').click();
    await menuItem(page, 'upload-files').click();
    await (await again).setFiles([{ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('different') }]);
    await expect(row(page, 'Drafts/a (2).txt')).toBeVisible();
    await expect(status(page)).toContainText('kept both');
});

test('moves and copies with the folder chooser; duplicates', async ({ page }) => {
    await row(page, 'logo.png').click();
    await row(page, 'notes.md').click({ modifiers: ['Control'] });
    await command(page, 'move').click();
    const dialog = page.locator('juel-file-manager dialog[open]');
    await expect(dialog.locator('h2')).toHaveText('Move 2 items to…');
    // Each choice is a small icon then its name on one line, with no sideways scroll
    // (the icon's own `folder` class once picked up the row's width and padding).
    const layout = await dialog.locator('.folders').evaluate(list => {
        const choice = list.querySelector('button.folder[data-path="Styles"]')!;
        const icon = choice.querySelector('svg')!.getBoundingClientRect();
        const name = choice.querySelector('span')!.getBoundingClientRect();
        return { iconWidth: icon.width, gap: name.left - icon.right, nameHeight: name.height, choiceHeight: choice.getBoundingClientRect().height, overflow: list.scrollWidth - list.clientWidth };
    });
    expect(layout.iconWidth).toBeLessThan(32);
    expect(layout.gap).toBeLessThan(16);
    expect(layout.nameHeight).toBeLessThanOrEqual(layout.choiceHeight);
    expect(layout.overflow).toBeLessThanOrEqual(0);
    await dialog.locator('button.folder[data-path="Styles"]').click();
    await dialog.locator('[data-command="choose"]').click();
    await expect(dialog).toHaveCount(0);
    await expect(row(page, 'logo.png')).toHaveCount(0);
    await expect(status(page)).toHaveText('Moved 2 items to "Styles"');
    await expect(row(page, 'Styles').locator('.size')).toHaveText('3 items');

    // A folder can't be moved into itself: it isn't offered.
    await row(page, 'Pictures').click();
    await command(page, 'move').click();
    await expect(dialog.locator('.folder[data-path="Pictures/2026"]')).toHaveCount(0);
    await dialog.locator('footer button:not(.primary)').click();

    await command(page, 'copy').click();
    await dialog.locator('.folder[data-path="Data"]').click();
    await dialog.locator('[data-command="choose"]').click();
    await row(page, 'Data').dblclick();
    await expect(row(page, 'Data/Pictures')).toBeVisible();
    await expect(row(page, 'Data/Pictures').locator('.size')).toHaveText('3 items');

    await row(page, 'Data/sales.csv').click();
    await row(page, 'Data/sales.csv').locator('.more-actions').click();
    await menuItem(page, 'duplicate').click();
    await expect(row(page, 'Data/sales (2).csv')).toBeVisible();
    expect(await selected(page)).toEqual(['Data/sales (2).csv']);
});

test('deletes after asking, with the page\'s notes; Cancel keeps it', async ({ page }) => {
    await row(page, 'logo.png').click();
    await page.keyboard.press('Delete');
    await expect(page.locator('#dialog-content')).toContainText('Delete "logo.png"?');
    await expect(page.locator('#dialog-content')).toContainText('logo.png is used by 3 decks.');
    await answer(page, false);
    await expect(row(page, 'logo.png')).toBeVisible();
    await row(page, 'Data').click();
    await command(page, 'delete').click();
    await expect(page.locator('#dialog-content')).toContainText('Everything in it goes too.');
    await answer(page, true);
    await expect(row(page, 'Data')).toHaveCount(0);
    await expect(status(page)).toHaveText('Deleted "Data"');
    await expect(page.locator('#log')).toContainText('file-deleted');
});

test('downloads a file as itself, a folder as a .zip', async ({ page }) => {
    await row(page, 'notes.md').click();
    const one = page.waitForEvent('download');
    await command(page, 'download').click();
    const file = await one;
    expect(file.suggestedFilename()).toBe('notes.md');
    expect((await read(file)).toString()).toBe('# Notes\n\nThings to do.\n');

    await row(page, 'Data').click();
    const zip = page.waitForEvent('download');
    await command(page, 'download').click();
    const download = await zip;
    expect(download.suggestedFilename()).toBe('Data.zip');
    const bytes = await read(download);
    expect(bytes.subarray(0, 4).toString('hex')).toBe('504b0304'); // PK..
    expect(bytes.includes(Buffer.from('archive/report 12.txt'))).toBe(true);
});

test('saves the folder on show, or the selection, to a folder on disk', async ({ page }) => {
    // A stand-in for showDirectoryPicker: a folder handle that records the paths written.
    await page.evaluate(() => {
        const w = window as any;
        w.written = [];
        const folder = (path: string, name: string): any => ({
            name,
            getDirectoryHandle: async (n: string) => folder(path + n + '/', n),
            getFileHandle: async (n: string) => ({
                createWritable: async () => ({ write: async () => { w.written.push(path + n); }, close: async () => {} }),
            }),
        });
        w.showDirectoryPicker = async () => folder('', 'Backup');
    });
    const written = () => page.evaluate(() => [...(window as any).written].sort());

    await row(page, 'Pictures').dblclick();
    await expect(row(page, 'Pictures/sunset.png')).toBeVisible();
    await command(page, 'save-to-disk').click();
    await expect(status(page)).toHaveText('Saved 3 files to "Backup"');
    expect(await written()).toEqual(['2026/conference.png', 'harbour.png', 'sunset.png']); // the folder's contents, not the folder

    await page.locator('juel-file-manager .crumb[data-path=""]').click();
    await page.evaluate(() => { (window as any).written = []; });
    await row(page, 'notes.md').click();
    await row(page, 'Styles').click({ modifiers: ['Control'] });
    await row(page, 'notes.md').locator('.more-actions').click();
    await menuItem(page, 'save-to-disk').click();
    await expect(status(page)).toHaveText('Saved 2 files to "Backup"');
    expect(await written()).toEqual(['Styles/talk.css', 'notes.md']);

    // Cancelling the folder picker is not an error.
    await page.evaluate(() => { (window as any).showDirectoryPicker = async () => { throw new DOMException('Cancelled', 'AbortError'); }; });
    await page.locator('juel-file-manager .chip').click();
    await command(page, 'save-to-disk').click();
    await expect(status(page)).not.toHaveClass(/error/);

    // The picker only browses: no Save to disk there.
    await page.locator('juel-file-manager').evaluate(m => { (m as any).browse = true; });
    await expect(command(page, 'new-folder')).toBeVisible();
    await expect(command(page, 'save-to-disk')).toHaveCount(0);
});

test('the page\'s commands, read-only, and a type filter', async ({ page }) => {
    await row(page, 'logo.png').click();
    await command(page, 'insert').click();
    await expect(page.locator('#log')).toContainText('Insert logo.png');
    await row(page, 'Data').click();
    await expect(command(page, 'insert')).toHaveCount(0); // only for one file

    await page.locator('#readonly').check();
    await expect(command(page, 'delete')).toHaveCount(0);
    await expect(command(page, 'download')).toBeVisible();
    await page.locator('juel-file-manager .chip').click();
    await expect(command(page, 'new-folder')).toHaveCount(0);
    await page.locator('#readonly').uncheck();

    await page.locator('#accept').selectOption('image/*');
    expect(await names(page)).toEqual(['Data', 'Empty folder', 'Pictures', 'Styles', 'Video', 'logo.png']);
});

test('announce() puts the page\'s message in the status line', async ({ page }) => {
    await expect(status(page)).not.toHaveClass(/error/);
    await page.locator('juel-file-manager').evaluate((m: any) => m.announce('Uploaded a.png as pics/a.png'));
    await expect(status(page)).toHaveText('Uploaded a.png as pics/a.png');
    await expect(status(page)).not.toHaveClass(/error/);
    await page.locator('juel-file-manager').evaluate((m: any) => m.announce('That didn\'t work', true));
    await expect(status(page)).toHaveText('That didn\'t work');
    await expect(status(page)).toHaveClass(/error/);
});

test('changes made elsewhere show at once', async ({ page }) => {
    await page.evaluate(async () => {
        const manager = document.getElementById('files') as any;
        await manager.storage.write('from elsewhere.txt', new Blob(['hi']));
    });
    await expect(row(page, 'from elsewhere.txt')).toBeVisible();
});

test('works on the browser storage, and keeps it after a reload', async ({ page }) => {
    await page.locator('#browser').check();
    await expect(page.locator('juel-file-manager')).toHaveAttribute('data-storage', 'browser');
    await expect(row(page, 'notes.md')).toBeVisible();
    await page.evaluate(async () => {
        const manager = document.getElementById('files') as any;
        await manager.storage.remove('Kept').catch(() => {});
        await manager.storage.makeFolder('Kept');
    });
    await expect(row(page, 'Kept')).toBeVisible();
    await page.reload();
    await page.waitForFunction(() => (window as any).exampleReady);
    if (!await page.locator('#browser').isChecked()) await page.locator('#browser').check(); // a reload may keep the tick
    await expect(page.locator('juel-file-manager')).toHaveAttribute('data-storage', 'browser');
    await expect(row(page, 'Kept')).toBeVisible();
    await page.evaluate(async () => {
        const manager = document.getElementById('files') as any;
        for (const item of (await manager.storage.list('')).items) await manager.storage.remove(item.path);
    });
});

/** A DataTransfer holding files, as a drag from the desktop would. */
const desktopFiles = (page: Page, files: { name: string; text: string }[]) => page.evaluateHandle(files => {
    const data = new DataTransfer();
    for (const f of files) data.items.add(new File([f.text], f.name, { type: 'text/plain' }));
    return data;
}, files);

test('files dropped from the desktop: the view gets an outline, they go into the folder on show', async ({ page }) => {
    await row(page, 'Data').dblclick();
    await expect(page.locator('juel-file-manager .crumb[aria-current="page"]')).toHaveText('Data');
    const dataTransfer = await desktopFiles(page, [{ name: 'dropped.txt', text: 'hello' }, { name: 'second.txt', text: 'two' }]);
    // A file row: a folder row would take the drop itself.
    const first = row(page, 'Data/sales.csv');
    await list(page).dispatchEvent('dragenter', { dataTransfer });
    await expect(list(page)).toHaveClass(/dropping/);
    // Over a row and back: the rows' own enter/leave don't flicker it off.
    await first.dispatchEvent('dragenter', { dataTransfer });
    await list(page).dispatchEvent('dragleave', { dataTransfer });
    await expect(list(page)).toHaveClass(/dropping/);
    await first.dispatchEvent('dragover', { dataTransfer });
    await first.dispatchEvent('drop', { dataTransfer });
    await expect(list(page)).not.toHaveClass(/dropping/);
    await expect(row(page, 'Data/dropped.txt')).toBeVisible();
    await expect(row(page, 'Data/second.txt')).toBeVisible();
    await expect(status(page)).toHaveText('Uploaded 2 files');
    // Leaving without a drop takes the outline away.
    await list(page).dispatchEvent('dragenter', { dataTransfer });
    await expect(list(page)).toHaveClass(/dropping/);
    await list(page).dispatchEvent('dragleave', { dataTransfer });
    await expect(list(page)).not.toHaveClass(/dropping/);
});

test('files dropped on a folder row or a crumb go into that folder, which gets the outline and a badge', async ({ page }) => {
    await row(page, 'Data').dblclick();
    await expect(page.locator('juel-file-manager .crumb[aria-current="page"]')).toHaveText('Data');
    const dataTransfer = await desktopFiles(page, [{ name: 'into-archive.txt', text: 'a' }]);
    const archive = row(page, 'Data/archive');
    await list(page).dispatchEvent('dragenter', { dataTransfer });
    await archive.dispatchEvent('dragenter', { dataTransfer });
    await archive.dispatchEvent('dragover', { dataTransfer });
    await expect(archive).toHaveClass(/drop-target/);
    await expect(archive.locator('.drop-badge')).toHaveText('+ Copy');
    await expect(list(page)).not.toHaveClass(/dropping/);
    // Off the folder, onto a file: back to the view.
    await row(page, 'Data/sales.csv').dispatchEvent('dragover', { dataTransfer });
    await expect(archive).not.toHaveClass(/drop-target/);
    await expect(list(page)).toHaveClass(/dropping/);
    await archive.dispatchEvent('dragover', { dataTransfer });
    await archive.dispatchEvent('drop', { dataTransfer });
    await expect(archive).not.toHaveClass(/drop-target/);
    await expect(page.locator('juel-file-manager .drop-badge')).toHaveCount(0);
    await expect(status(page)).toHaveText('Uploaded "into-archive.txt"');
    await expect(row(page, 'Data/into-archive.txt')).toHaveCount(0);
    expect(await page.evaluate(async () => !!(await (document.getElementById('files') as any).storage.stat('Data/archive/into-archive.txt')))).toBe(true);

    // The root crumb.
    const root = page.locator('juel-file-manager .crumb[data-path=""]');
    const onRoot = await desktopFiles(page, [{ name: 'at-root.txt', text: 'r' }]);
    await root.dispatchEvent('dragenter', { dataTransfer: onRoot });
    await root.dispatchEvent('dragover', { dataTransfer: onRoot });
    await expect(root).toHaveClass(/drop-target/);
    await expect(root.locator('.drop-badge')).toHaveText('+ Copy');
    await root.dispatchEvent('drop', { dataTransfer: onRoot });
    await expect(status(page)).toHaveText('Uploaded "at-root.txt"');
    await expect(root).not.toHaveClass(/drop-target/);
    expect(await page.evaluate(async () => !!(await (document.getElementById('files') as any).storage.stat('at-root.txt')))).toBe(true);
    // Between the crumbs there's nowhere to drop.
    const between = await desktopFiles(page, [{ name: 'lost.txt', text: 'l' }]);
    const nav = page.locator('juel-file-manager .crumbs');
    await nav.dispatchEvent('dragenter', { dataTransfer: between });
    await expect(page.locator('juel-file-manager .drop-target')).toHaveCount(0);
    await expect(list(page)).not.toHaveClass(/dropping/);
    await nav.dispatchEvent('drop', { dataTransfer: between });
    await page.waitForTimeout(200);
    expect(await page.evaluate(async () => !!(await (document.getElementById('files') as any).storage.stat('lost.txt')))).toBe(false);
});

const exists = (page: Page, path: string) => page.evaluate(async path => !!(await (document.getElementById('files') as any).storage.stat(path)), path);

test('a row dragged onto a folder row moves there, through file-before-move', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).moves = [];
        document.getElementById('files')!.addEventListener('file-before-move', e => (window as any).moves.push((e as CustomEvent).detail.moves));
    });
    // A real mouse drag.
    await row(page, 'notes.md').dragTo(row(page, 'Pictures'));
    await expect(status(page)).toHaveText('Moved "notes.md" to "Pictures"');
    await expect(row(page, 'notes.md')).toHaveCount(0);
    expect(await exists(page, 'Pictures/notes.md')).toBe(true);
    expect(await page.evaluate(() => (window as any).moves)).toEqual([[{ from: 'notes.md', to: 'Pictures/notes.md' }]]);
    await expect(page.locator('juel-file-manager .drop-target')).toHaveCount(0);
});

test('dragging a selected row moves the whole selection; not onto itself, nor where it is', async ({ page }) => {
    await row(page, 'Empty folder').click();
    await row(page, 'logo.png').click({ modifiers: ['Control'] });
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await row(page, 'logo.png').dispatchEvent('dragstart', { dataTransfer });
    expect(await dataTransfer.evaluate(d => JSON.parse(d.getData('application/x-juel-file')))).toEqual(['Empty folder', 'logo.png']);
    await list(page).dispatchEvent('dragenter', { dataTransfer });
    // The folder they're in already, and one of the dragged folders: nowhere to drop.
    await row(page, 'logo.png').dispatchEvent('dragover', { dataTransfer });
    await expect(list(page)).not.toHaveClass(/dropping/);
    await row(page, 'Empty folder').dispatchEvent('dragover', { dataTransfer });
    await expect(row(page, 'Empty folder')).not.toHaveClass(/drop-target/);
    await expect(page.locator('juel-file-manager .crumb[data-path=""]')).not.toHaveClass(/drop-target/);
    // A folder: the outline, and "Move".
    const data = row(page, 'Data');
    await data.dispatchEvent('dragover', { dataTransfer });
    await expect(data).toHaveClass(/drop-target/);
    await expect(data.locator('.drop-badge')).toHaveText('Move');
    // The drop clears the drag itself: the dragged rows are gone before their dragend.
    await data.dispatchEvent('drop', { dataTransfer });
    await expect(status(page)).toHaveText('Moved 2 items to "Data"');
    await expect(row(page, 'logo.png')).toHaveCount(0);
    await expect(row(page, 'Empty folder')).toHaveCount(0);
    expect(await exists(page, 'Data/logo.png')).toBe(true);
    expect(await exists(page, 'Data/Empty folder')).toBe(true);
    await expect(page.locator('juel-file-manager .drop-target')).toHaveCount(0);
});

test('a row dragged onto a crumb moves up; the folder on show is no target', async ({ page }) => {
    await row(page, 'Data').dblclick();
    await expect(page.locator('juel-file-manager .crumb[aria-current="page"]')).toHaveText('Data');
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await row(page, 'Data/sales.csv').dispatchEvent('dragstart', { dataTransfer });
    const here = page.locator('juel-file-manager .crumb[data-path="Data"]');
    await here.dispatchEvent('dragenter', { dataTransfer });
    await here.dispatchEvent('dragover', { dataTransfer });
    await expect(here).not.toHaveClass(/drop-target/);
    const root = page.locator('juel-file-manager .crumb[data-path=""]');
    await root.dispatchEvent('dragover', { dataTransfer });
    await expect(root).toHaveClass(/drop-target/);
    await expect(root.locator('.drop-badge')).toHaveText('Move');
    await root.dispatchEvent('drop', { dataTransfer });
    await expect(status(page)).toHaveText('Moved "sales.csv" to My files');
    await expect(row(page, 'Data/sales.csv')).toHaveCount(0);
    expect(await exists(page, 'sales.csv')).toBe(true);
});

test('a read-only view takes no drops', async ({ page }) => {
    await page.locator('#readonly').check();
    const dataTransfer = await desktopFiles(page, [{ name: 'nope.txt', text: 'x' }]);
    await list(page).dispatchEvent('dragenter', { dataTransfer });
    await expect(list(page)).not.toHaveClass(/dropping/);
    await list(page).dispatchEvent('drop', { dataTransfer });
    await page.waitForTimeout(200);
    await expect(row(page, 'nope.txt')).toHaveCount(0);
});

/** Pastes into the list, as Ctrl+V would: files, or text. */
const paste = (page: Page, files: { name: string; type: string; text: string }[], text?: string) => page.evaluate(({ files, text }) => {
    const data = new DataTransfer();
    for (const f of files) data.items.add(new File([f.text], f.name, { type: f.type }));
    if (text) data.setData('text/plain', text);
    const list = (document.getElementById('files') as any).shadowRoot.querySelector('.list') as HTMLElement;
    list.focus();
    const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, composed: true, cancelable: true });
    list.dispatchEvent(event);
    return event.defaultPrevented;
}, { files, text });

test('pasting files puts them in the folder on show; a repeat keeps both; text is left alone', async ({ page }) => {
    await row(page, 'Pictures').dblclick();
    await expect(page.locator('juel-file-manager .crumb[aria-current="page"]')).toHaveText('Pictures');
    expect(await paste(page, [{ name: 'image.png', type: 'image/png', text: 'png-1' }])).toBe(true);
    await expect(row(page, 'Pictures/image.png')).toBeVisible();
    await expect(status(page)).toHaveText('Uploaded "image.png"');
    // A second screenshot has the same name.
    expect(await paste(page, [{ name: 'image.png', type: 'image/png', text: 'png-2' }])).toBe(true);
    await expect(row(page, 'Pictures/image (2).png')).toBeVisible();
    await expect(status(page)).toContainText('kept both where names clashed');
    // Text isn't a file: the page's own paste goes ahead.
    expect(await paste(page, [], 'just words')).toBe(false);
    // Nor while renaming, or read-only.
    await page.locator('#readonly').check();
    expect(await paste(page, [{ name: 'nope.txt', type: 'text/plain', text: 'x' }])).toBe(false);
    await page.waitForTimeout(200);
    expect(await exists(page, 'Pictures/nope.txt')).toBe(false);
});

test('rows dragged out carry their paths, as the juel type and as text', async ({ page }) => {
    await row(page, 'notes.md').click();
    await row(page, 'logo.png').click({ modifiers: ['Control'] });
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await row(page, 'notes.md').dispatchEvent('dragstart', { dataTransfer });
    expect(await dataTransfer.evaluate(d => ({
        json: JSON.parse(d.getData('application/x-juel-file')),
        text: d.getData('text/plain'),
    }))).toEqual({ json: ['logo.png', 'notes.md'], text: 'logo.png\nnotes.md' });
    await row(page, 'notes.md').dispatchEvent('dragend', { dataTransfer });
    // A real drag into the example's text box: it takes the text. (A synthetic DataTransfer always says effectAllowed "none".)
    await page.evaluate(() => window.addEventListener('dragstart', e => { (window as any).effect = e.dataTransfer!.effectAllowed; }));
    await row(page, 'Styles').click();
    await row(page, 'Styles').dragTo(page.locator('#out'));
    await expect(page.locator('#out')).toHaveValue('Styles');
    expect(await page.evaluate(() => (window as any).effect)).toBe('copyMove');
    // Nothing moved.
    await expect(row(page, 'Styles')).toBeVisible();
});

// --- F4: tiles, details, the viewer, search --------------------------------

const viewer = (page: Page) => page.locator('juel-file-viewer .viewer');

test('tiles: thumbnails, the same selection, keyboard and drag as the list', async ({ page }) => {
    await page.locator('juel-file-manager .bar [data-command="view"]').click();
    await menuItem(page, 'view-grid').click();
    await expect(page.locator('juel-file-manager')).toHaveAttribute('view', 'grid');
    await expect(page.locator('juel-file-manager .tile')).toHaveCount(7);
    await expect(page.locator('juel-file-manager .head')).toHaveCount(0);
    // A picture gets its thumbnail; a folder its icon.
    await expect(row(page, 'logo.png').locator('.thumb img')).toHaveAttribute('src', /^blob:/);
    await expect(row(page, 'Data').locator('.thumb .kind.folder')).toBeVisible();
    // Selection as in the list.
    await row(page, 'Data').click();
    await row(page, 'Styles').click({ modifiers: ['Shift'] });
    expect(await selected(page)).toEqual(['Data', 'Empty folder', 'Pictures', 'Styles']);
    // Arrows: left and right a tile, down a row of tiles.
    await row(page, 'Data').click();
    const across = await list(page).evaluate(l => getComputedStyle(l).gridTemplateColumns.split(' ').length);
    expect(across).toBeGreaterThan(1);
    await page.keyboard.press('ArrowRight');
    expect(await selected(page)).toEqual(['Empty folder']);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    const order = await page.locator('juel-file-manager .tile').evaluateAll(t => t.map(x => x.getAttribute('data-path')));
    expect(await selected(page)).toEqual([order[Math.min(across, order.length - 1)]]);
    // Drag a tile onto a folder tile: a move.
    await row(page, 'notes.md').dragTo(row(page, 'Styles'));
    await expect(status(page)).toHaveText('Moved "notes.md" to "Styles"');
    await expect(row(page, 'notes.md')).toHaveCount(0);
    // Back to the list.
    await page.locator('juel-file-manager .bar [data-command="view"]').click();
    await menuItem(page, 'view-list').click();
    await expect(page.locator('juel-file-manager .row.item')).toHaveCount(6);
});

test('the details pane: one item\'s facts, a selection\'s total, the folder; the page\'s slot', async ({ page }) => {
    const details = page.locator('juel-file-manager .details');
    await expect(details).toHaveCount(0);
    await page.locator('juel-file-manager .bar [data-command="details"]').click();
    await expect(page.locator('juel-file-manager')).toHaveAttribute('details', '');
    await expect(page.locator('juel-file-manager .bar [data-command="details"]')).toHaveAttribute('aria-pressed', 'true');
    // Nothing selected: the folder.
    await expect(details.locator('h3')).toHaveText('My files');
    await expect(details.locator('[data-fact="contains"]')).toHaveText('7 items');
    // A picture: its preview and dimensions. (Rows are narrower beside the pane: click their names, not the ⋯ at their middle.)
    await row(page, 'logo.png').locator('.label').click();
    await expect(details.locator('h3')).toHaveText('logo.png');
    await expect(details.locator('[data-fact="dimensions"]')).toHaveText('256 × 256');
    await expect(details.locator('[data-fact="type"]')).toHaveText('Picture (image/png)');
    await expect(details.locator('.preview img')).toHaveAttribute('src', /^blob:/);
    // Several: a total.
    await row(page, 'notes.md').locator('.label').click({ modifiers: ['Control'] });
    await row(page, 'Data').locator('.label').click({ modifiers: ['Control'] });
    await expect(details.locator('h3')).toHaveText('3 items selected');
    await expect(details.locator('[data-fact="files"]')).toHaveText('2');
    await expect(details.locator('[data-fact="folders"]')).toHaveText('1');
    // The page adds its own part through the details slot.
    await page.evaluate(() => {
        const extra = document.createElement('p');
        extra.slot = 'details';
        extra.id = 'used-by';
        extra.textContent = 'Used by 2 decks';
        document.getElementById('files')!.append(extra);
    });
    await expect(page.locator('#used-by')).toBeVisible();
});

test('the viewer: double-click opens it, the arrows and keys step through, Escape closes on that file', async ({ page }) => {
    await row(page, 'Pictures').dblclick();
    await row(page, 'Pictures/harbour.png').dblclick();
    await expect(viewer(page)).toBeVisible();
    await expect(viewer(page).locator('.name')).toHaveText('harbour.png');
    await expect(viewer(page).locator('.count')).toHaveText('1 of 2');
    await expect(viewer(page).locator('img')).toHaveAttribute('src', /^blob:/);
    await expect(viewer(page).locator('.previous')).toBeDisabled();
    await viewer(page).locator('.next').click();
    await expect(viewer(page).locator('.name')).toHaveText('sunset.png');
    await expect(viewer(page).locator('.next')).toBeDisabled();
    await page.keyboard.press('ArrowLeft');
    await expect(viewer(page).locator('.name')).toHaveText('harbour.png');
    await page.keyboard.press('End');
    await expect(viewer(page).locator('.name')).toHaveText('sunset.png');
    // The list follows.
    expect(await selected(page)).toEqual(['Pictures/sunset.png']);
    const download = page.waitForEvent('download');
    await viewer(page).locator('[data-command="download"]').click();
    expect((await download).suggestedFilename()).toBe('sunset.png');
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
    await expect(page.locator('juel-file-viewer')).toHaveCount(0);
    expect(await selected(page)).toEqual(['Pictures/sunset.png']);
});

test('the viewer shows a CSV as a table', async ({ page }) => {
    await row(page, 'Data').dblclick();
    await row(page, 'Data/sales.csv').dblclick();
    const table = viewer(page).locator('.table-preview table');
    await expect(table.locator('th')).toHaveText(['region', 'q1', 'q2']);
    await expect(table.locator('tbody tr')).toHaveCount(2);
    await expect(table.locator('tbody tr').first().locator('td')).toHaveText(['North', '120', '140']);
    await expect(viewer(page).locator('.text-preview')).toHaveCount(0);
});

test('the viewer shows text, and deletes after asking; a page that handles file-open gets no viewer', async ({ page }) => {
    await row(page, 'notes.md').dblclick();
    await expect(viewer(page).locator('.text-preview')).toContainText('Things to do.');
    // Folders aren't in it: logo.png and notes.md.
    await expect(viewer(page).locator('.count')).toHaveText('2 of 2');
    await viewer(page).locator('[data-command="delete"]').click();
    await answer(page, false);
    await expect(viewer(page).locator('.name')).toHaveText('notes.md');
    await viewer(page).locator('[data-command="delete"]').click();
    await answer(page, true);
    // It goes, and the viewer moves to what's left.
    await expect(viewer(page).locator('.name')).toHaveText('logo.png');
    await expect(viewer(page).locator('.count')).toHaveText('1 of 1');
    expect(await exists(page, 'notes.md')).toBe(false);
    await viewer(page).locator('[data-command="close"]').click();
    await expect(viewer(page)).toHaveCount(0);
    await expect(row(page, 'notes.md')).toHaveCount(0);
    await page.evaluate(() => document.getElementById('files')!.addEventListener('file-open', e => e.preventDefault()));
    await row(page, 'logo.png').dblclick();
    await page.waitForTimeout(200);
    await expect(viewer(page)).toHaveCount(0);
});

test('read-only: the viewer has no Delete; a file it can\'t show offers Download', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('files') as any).storage.write('slides.bin', new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' })));
    await page.locator('#readonly').check();
    await row(page, 'slides.bin').dblclick();
    await expect(viewer(page).locator('.none')).toContainText('No preview for this file');
    await expect(viewer(page).locator('[data-command="delete"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
});

const search = (page: Page) => page.locator('juel-file-manager .search input');

test('search finds names below the folder on show, says where; Escape or the crumb ends it', async ({ page }) => {
    await search(page).fill('report 1');
    await expect(page.locator('juel-file-manager .crumbs .results')).toHaveText('Results for "report 1"');
    // report 1, 10, 11, 12 in Data/archive.
    await expect(page.locator('juel-file-manager .item')).toHaveCount(4);
    await expect(row(page, 'Data/archive/report 1.txt').locator('.where')).toHaveText('archive');
    // Results select and act like any rows.
    await row(page, 'Data/archive/report 12.txt').click();
    await expect(command(page, 'rename')).toBeVisible();
    await search(page).press('Escape');
    await expect(page.locator('juel-file-manager .crumbs .results')).toHaveCount(0);
    await expect(row(page, 'notes.md')).toBeVisible();
    // In a folder: that folder and below only.
    await row(page, 'Pictures').dblclick();
    await search(page).fill('png');
    await expect(page.locator('juel-file-manager .item')).toHaveCount(3);
    await search(page).fill('sales');
    await expect(page.locator('juel-file-manager .empty')).toContainText('Nothing called "sales" here');
    // The folder's crumb leads back out.
    await page.locator('juel-file-manager .crumb[data-path="Pictures"]').click();
    await expect(page.locator('juel-file-manager .crumbs .results')).toHaveCount(0);
    await expect(row(page, 'Pictures/sunset.png')).toBeVisible();
    await expect(search(page)).toHaveValue('');
});

test('a narrow view keeps the bar on one line: icons, then a menu for the rest', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await row(page, 'logo.png').click();
    const bar = page.locator('juel-file-manager .bar');
    expect((await bar.boundingBox())!.height).toBeLessThan(60);
    await expect(command(page, 'more')).toBeVisible();
    await command(page, 'more').click();
    await expect(menuItem(page, 'delete')).toBeVisible();
    await page.keyboard.press('Escape');
    // Wide again: every command, with its label.
    await page.setViewportSize({ width: 1400, height: 800 });
    await expect(command(page, 'more')).toHaveCount(0);
    await expect(command(page, 'delete').locator('.text')).toBeVisible();
});

// --- F5: zip import, the quota line (the picker has its own page: file-picker.spec.ts) --------

/** A zip made in the page with Juel's writeZip, as bytes. */
const zipOf = (page: Page, files: Record<string, string>) => page.evaluate(async files => {
    const { writeZip } = (window as any).juel.files;
    const entries = Object.entries(files).map(([path, text]) => ({ path, data: new Blob([text]) }));
    return [...new Uint8Array(await (await writeZip(entries)).arrayBuffer())];
}, files).then(bytes => Buffer.from(bytes));

test('Upload > Zip, unpacked: loose files go into a folder named after the zip; one folder comes out as itself', async ({ page }) => {
    await command(page, 'upload').click();
    await expect(menuItem(page, 'upload-zip')).toBeVisible();
    await page.keyboard.press('Escape');
    const input = page.locator('juel-file-manager input.zip');
    await input.setInputFiles({ name: 'photos.zip', mimeType: 'application/zip', buffer: await zipOf(page, { 'a.txt': 'A', 'sub/b.txt': 'B' }) });
    await expect(status(page)).toHaveText('Unpacked 2 files from "photos.zip"');
    await expect(row(page, 'photos')).toBeVisible();
    expect(await selected(page)).toEqual(['photos']);
    expect(await exists(page, 'photos/a.txt')).toBe(true);
    expect(await exists(page, 'photos/sub/b.txt')).toBe(true);
    // Again: a new folder beside it.
    await input.setInputFiles({ name: 'photos.zip', mimeType: 'application/zip', buffer: await zipOf(page, { 'a.txt': 'A2' }) });
    await expect(row(page, 'photos (2)')).toBeVisible();
    // A zip holding one folder: that folder, merged with what's there; a clash keeps both.
    await input.setInputFiles({ name: 'whatever.zip', mimeType: 'application/zip', buffer: await zipOf(page, { 'Styles/talk.css': 'h2 {}', 'Styles/new.css': 'p {}' }) });
    await expect(status(page)).toContainText('kept both where names clashed: talk (2).css');
    expect(await exists(page, 'Styles/new.css')).toBe(true);
    expect(await exists(page, 'Styles/talk (2).css')).toBe(true);
    await expect(row(page, 'whatever')).toHaveCount(0);
});

test('a .zip in the storage has Extract in its menu; a broken one says so', async ({ page }) => {
    const bytes = await zipOf(page, { 'one.txt': '1' });
    await page.evaluate(async bytes => {
        const storage = (document.getElementById('files') as any).storage;
        await storage.write('Data/bundle.zip', new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
        await storage.write('Data/broken.zip', new Blob(['not a zip'], { type: 'application/zip' }));
    }, [...bytes]);
    await row(page, 'Data').dblclick();
    await row(page, 'Data/bundle.zip').click({ button: 'right' });
    await menuItem(page, 'extract').click();
    await expect(status(page)).toHaveText('Unpacked 1 file from "bundle.zip"');
    expect(await exists(page, 'Data/bundle/one.txt')).toBe(true);
    await row(page, 'Data/broken.zip').click({ button: 'right' });
    await menuItem(page, 'extract').click();
    await expect(status(page)).toHaveClass(/error/);
    // Not offered for other files.
    await row(page, 'Data/sales.csv').click({ button: 'right' });
    await expect(menuItem(page, 'extract')).toHaveCount(0);
});

test('the quota line shows for a storage that knows its quota, not for memory', async ({ page }) => {
    await expect(page.locator('juel-file-manager .quota')).toHaveCount(0);
    await page.locator('#browser').check();
    await expect(page.locator('juel-file-manager')).toHaveAttribute('data-storage', 'browser');
    const quota = page.locator('juel-file-manager .quota');
    await expect(quota.locator('.text')).toHaveText(/^[\d.]+ (bytes|KB|MB|GB) of [\d.]+ (KB|MB|GB|TB) used$/);
    await expect(quota.locator('[role="meter"]')).toHaveAttribute('aria-valuemax', /^\d+$/);
});

// --- Touch and dark on the F3–F5 parts --------------------------------------

/** A touch press on an element, held for `ms`. */
async function press(page: Page, locator: ReturnType<Page['locator']>, ms: number) {
    const box = (await locator.boundingBox())!;
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerType: 'touch', isPrimary: true, bubbles: true, composed: true };
    await locator.dispatchEvent('pointerdown', at);
    await page.waitForTimeout(ms);
    await locator.dispatchEvent('pointerup', at);
    // A tap's click is a PointerEvent with pointerType "touch" (dispatchEvent('click') would make a MouseEvent).
    await locator.evaluate((el, at) => el.dispatchEvent(new PointerEvent('click', { ...at, detail: 1 } as PointerEventInit)), at);
}

test('touch on tiles: long-press selects, then taps add; a touch never starts a row drag', async ({ page }) => {
    await page.locator('#view').selectOption('grid');
    await expect(page.locator('juel-file-manager .tile')).toHaveCount(7);
    await press(page, row(page, 'logo.png'), 650);
    expect(await selected(page)).toEqual(['logo.png']);
    await press(page, row(page, 'notes.md'), 50);
    expect(await selected(page)).toEqual(['logo.png', 'notes.md']);
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await row(page, 'notes.md').dispatchEvent('dragstart', { dataTransfer });
    expect(await dataTransfer.evaluate(d => d.types.length)).toBe(0);
});

test('the viewer: a swipe steps through', async ({ page }) => {
    await row(page, 'Pictures').dblclick();
    await row(page, 'Pictures/harbour.png').dblclick();
    const stage = page.locator('juel-file-viewer .stage');
    const swipe = async (dx: number) => {
        await stage.dispatchEvent('pointerdown', { clientX: 400, clientY: 300, pointerType: 'touch', bubbles: true });
        await stage.dispatchEvent('pointerup', { clientX: 400 + dx, clientY: 300, pointerType: 'touch', bubbles: true });
    };
    await swipe(-120);
    await expect(page.locator('juel-file-viewer .name')).toHaveText('sunset.png');
    await swipe(30);
    await expect(page.locator('juel-file-viewer .name')).toHaveText('sunset.png');
    await swipe(120);
    await expect(page.locator('juel-file-viewer .name')).toHaveText('harbour.png');
    await page.keyboard.press('Escape');
});

test('dark: tiles, the details pane and search take the dark tokens', async ({ page }) => {
    await page.locator('#dark').check();
    await page.locator('#view').selectOption('grid');
    await page.locator('#details').check();
    const background = (selector: string) => page.locator(`juel-file-manager ${selector}`).first().evaluate(el => getComputedStyle(el).backgroundColor);
    expect(await page.locator('juel-file-manager').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(31, 31, 31)');
    expect(await background('.tile .thumb')).toBe('rgb(42, 42, 42)');
    expect(await background('.details .preview')).toBe('rgb(42, 42, 42)');
    expect(await page.locator('juel-file-manager .search input').evaluate(el => getComputedStyle(el).color)).toBe('rgb(240, 240, 240)');
});
