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
    await dialog.locator('.folder[data-path="Styles"]').click();
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
