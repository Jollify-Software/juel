// <juel-file-picker> in Chrome, on its example page (examples/Files/file-picker.html).
import { expect, Page, test } from '@playwright/test';

const picker = (page: Page) => page.locator('juel-file-picker .panel');
const row = (page: Page, path: string) => page.locator(`juel-file-picker juel-file-manager .item[data-path="${path}"]`);
const labels = (page: Page) => page.locator('juel-file-picker juel-file-manager .item .label');
const pickButton = (page: Page) => page.locator('juel-file-picker footer [data-command="pick"]');
const log = (page: Page) => page.locator('#log');

let errors: string[];

test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('examples/Files/file-picker.html');
    await page.waitForFunction(() => (window as any).exampleReady);
});

test.afterEach(() => {
    expect(errors).toEqual([]);
});

test('juel.files.pick: only the types asked for; a folder opens; Open chooses', async ({ page }) => {
    await page.click('#one-picture');
    await expect(picker(page)).toBeVisible();
    await expect(picker(page).locator('h2')).toHaveText('Choose a picture');
    // Pictures only (folders always show).
    await expect(labels(page)).toHaveText(['Data', 'Pictures', 'logo.png']);
    await expect(pickButton(page)).toBeDisabled();
    // A folder chosen: Open goes in.
    await row(page, 'Pictures').click();
    await expect(pickButton(page)).toBeEnabled();
    await pickButton(page).click();
    await expect(labels(page)).toHaveText(['harbour.png', 'sunset.png']);
    await row(page, 'Pictures/sunset.png').click();
    await expect(page.locator('juel-file-picker footer .summary')).toHaveText('"sunset.png"');
    await pickButton(page).click();
    await expect(picker(page)).toHaveCount(0);
    await expect(log(page)).toHaveText('Chose Pictures/sunset.png');
    // juel.files.pick removes its picker afterwards.
    await expect(page.locator('juel-file-picker')).toHaveCount(1);
});

test('a double-click chooses; Cancel, ✕, Escape and the backdrop choose nothing', async ({ page }) => {
    await page.click('#one-picture');
    await row(page, 'logo.png').dblclick();
    await expect(log(page)).toHaveText('Chose logo.png');
    for (const how of ['cancel', 'x', 'escape', 'backdrop']) {
        await page.click('#one-picture');
        await expect(picker(page)).toBeVisible();
        if (how === 'cancel') await page.locator('juel-file-picker footer [data-command="cancel-pick"]').click();
        if (how === 'x') await page.locator('juel-file-picker [data-command="cancel-x"]').click();
        if (how === 'escape') await page.keyboard.press('Escape');
        if (how === 'backdrop') await page.locator('juel-file-picker .backdrop').click({ position: { x: 5, y: 5 } });
        await expect(picker(page)).toHaveCount(0);
        await expect(log(page)).toHaveText('Cancelled');
    }
    // Escape with a selection clears the selection first.
    await page.click('#one-picture');
    await row(page, 'logo.png').click();
    await page.keyboard.press('Escape');
    await expect(picker(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(picker(page)).toHaveCount(0);
});

test('several files; folders in the selection disable Open', async ({ page }) => {
    await page.click('#many');
    await row(page, 'logo.png').click();
    await row(page, 'notes.md').click({ modifiers: ['Control'] });
    await expect(page.locator('juel-file-picker footer .summary')).toHaveText('2 items');
    await row(page, 'Data').click({ modifiers: ['Control'] });
    await expect(pickButton(page)).toBeDisabled();
    await row(page, 'Data').click({ modifiers: ['Control'] });
    await pickButton(page).click();
    await expect(log(page)).toHaveText('Chose logo.png, notes.md');
});

test('the page\'s own picker: its accept and labels; an upload is selected, ready to choose', async ({ page }) => {
    await page.click('#data');
    await expect(picker(page).locator('h2')).toHaveText('Choose a data file');
    await expect(pickButton(page)).toHaveText('Use this file');
    await expect(labels(page)).toHaveText(['Data', 'Pictures']);
    await row(page, 'Data').dblclick();
    await expect(labels(page)).toHaveText(['quiz.json', 'sales.csv']);
    await page.locator('juel-file-picker juel-file-manager input.files').setInputFiles({ name: 'new.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2\n') });
    await expect(row(page, 'Data/new.csv')).toHaveAttribute('aria-selected', 'true');
    await pickButton(page).click();
    await expect(log(page)).toHaveText('Chose Data/new.csv');
    // It opens again where it was left.
    await page.click('#data');
    await expect(row(page, 'Data/new.csv')).toBeVisible();
    await page.keyboard.press('Escape');
});

test('the rest of the page is inert while it\'s open, and focus comes back after', async ({ page }) => {
    await page.click('#many');
    await expect(picker(page)).toBeVisible();
    expect(await page.evaluate(() => (document.querySelector('.buttons') as HTMLElement).inert)).toBe(true);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => (document.querySelector('.buttons') as HTMLElement).inert)).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('many');
});

test('dark: the picker follows the page', async ({ page }) => {
    await page.locator('#dark').check();
    await page.click('#many');
    expect(await picker(page).evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(31, 31, 31)');
    await page.keyboard.press('Escape');
});

test('it only browses: Open, upload and New folder, but no Rename, Move to, Copy to or Delete', async ({ page }) => {
    await page.click('#many');
    const manager = page.locator('juel-file-picker juel-file-manager');
    await expect(manager).toHaveAttribute('browse', '');
    const bar = (id: string) => manager.locator(`.bar [data-command="${id}"]`);
    // Nothing selected: New folder and Upload are there.
    await expect(bar('new-folder')).toHaveCount(1);
    await expect(bar('upload')).toHaveCount(1);
    // A file selected: Open and Download, nothing that changes it.
    await row(page, 'notes.md').click();
    await expect(bar('open')).toHaveCount(1);
    for (const id of ['rename', 'move', 'copy', 'delete']) await expect(bar(id)).toHaveCount(0);
    // Nor in the ⋯ menu.
    await row(page, 'notes.md').locator('.more-actions').click();
    const menu = manager.locator('.menu');
    await expect(menu.locator('[data-item="open"]')).toHaveCount(1);
    for (const id of ['rename', 'move', 'copy', 'duplicate', 'delete']) await expect(menu.locator(`[data-item="${id}"]`)).toHaveCount(0);
    await page.keyboard.press('Escape');
    // Nor by the keyboard: F2 doesn't rename, Delete doesn't delete.
    await row(page, 'notes.md').click();
    await page.keyboard.press('F2');
    await expect(manager.locator('input.rename')).toHaveCount(0);
    await page.keyboard.press('Delete');
    await expect(row(page, 'notes.md')).toBeVisible();
    await expect(page.locator('juel-message-box, .juel-message-box')).toHaveCount(0);
});

test('it opens over a modal <dialog> already open, and can be used there', async ({ page }) => {
    // An app's own modal dialog (say "Insert image") that opens the picker.
    await page.evaluate(() => {
        const dialog = document.createElement('dialog');
        dialog.id = 'app-dialog';
        dialog.innerHTML = '<button id="from-dialog">Choose…</button>';
        dialog.querySelector('button')!.addEventListener('click', () => document.getElementById('one-picture')!.click());
        document.body.append(dialog);
        dialog.showModal();
    });
    await page.click('#from-dialog');
    await expect(picker(page)).toBeVisible();
    await page.locator('juel-file-picker footer [data-command="cancel-pick"]').click();
    await expect(picker(page)).toHaveCount(0);
    await expect(log(page)).toHaveText('Cancelled');
    await page.click('#from-dialog');
    await row(page, 'logo.png').click();
    await pickButton(page).click();
    await expect(log(page)).toHaveText('Chose logo.png');
    // The app's dialog is still open, and usable again.
    await expect(page.locator('#app-dialog')).toHaveJSProperty('open', true);
    await page.click('#from-dialog');
    await page.keyboard.press('Escape');
    await expect(picker(page)).toHaveCount(0);
    await expect(page.locator('#app-dialog')).toHaveJSProperty('open', true);
});

// --- Narrow, touch and dark ----------------------------------------------------

/** A touch tap (or press, held for `ms`) on an element. */
async function tap(page: Page, locator: ReturnType<Page['locator']>, ms = 50) {
    const box = (await locator.boundingBox())!;
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerType: 'touch', isPrimary: true, bubbles: true, composed: true };
    await locator.dispatchEvent('pointerdown', at);
    await page.waitForTimeout(ms);
    await locator.dispatchEvent('pointerup', at);
    // A tap's click is a PointerEvent with pointerType "touch" (dispatchEvent('click') would make a MouseEvent).
    await locator.evaluate((el, at) => el.dispatchEvent(new PointerEvent('click', { ...at, detail: 1 } as PointerEventInit)), at);
}

test('narrow: the panel fits a phone, the bar stays on one line, and Open is on screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.click('#many');
    const panel = (await picker(page).boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(360);
    expect(panel.y + panel.height).toBeLessThanOrEqual(640);
    await row(page, 'logo.png').click();
    expect((await page.locator('juel-file-picker juel-file-manager .bar').boundingBox())!.height).toBeLessThan(60);
    const open = (await pickButton(page).boundingBox())!;
    expect(open.x + open.width).toBeLessThanOrEqual(360);
    expect(open.y + open.height).toBeLessThanOrEqual(640);
    await pickButton(page).click();
    await expect(log(page)).toHaveText('Chose logo.png');
});

test('touch: a tap selects; in a one-file picker the next tap moves the selection, in a several-file picker it adds', async ({ page }) => {
    await page.click('#one-picture');
    await tap(page, row(page, 'logo.png'));
    await expect(row(page, 'logo.png')).toHaveAttribute('aria-selected', 'true');
    await expect(pickButton(page)).toBeEnabled();
    await tap(page, row(page, 'Pictures'));
    await expect(row(page, 'Pictures')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, 'logo.png')).not.toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(picker(page)).toHaveCount(0);

    await page.click('#many');
    await tap(page, row(page, 'logo.png'), 650);
    await tap(page, row(page, 'notes.md'));
    await expect(page.locator('juel-file-picker footer .summary')).toHaveText('2 items');
    // A touch never starts a row drag.
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await row(page, 'notes.md').dispatchEvent('dragstart', { dataTransfer });
    expect(await dataTransfer.evaluate(d => d.types.length)).toBe(0);
    await pickButton(page).click();
    await expect(log(page)).toHaveText('Chose logo.png, notes.md');
});

test('dark: the footer, the rows and the manager inside take the dark tokens', async ({ page }) => {
    await page.locator('#dark').check();
    await page.click('#many');
    const footer = page.locator('juel-file-picker footer');
    expect(await footer.evaluate(el => getComputedStyle(el).borderTopColor)).toBe('rgb(56, 56, 56)');
    expect(await page.locator('juel-file-picker juel-file-manager').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(31, 31, 31)');
    expect(await labels(page).first().evaluate(el => getComputedStyle(el).color)).toBe('rgb(240, 240, 240)');
    await page.keyboard.press('Escape');
});

test('selected: it opens with the file already chosen selected, ready to Open; a path that isn\'t there is skipped', async ({ page }) => {
    const choose = (selected: string[]) => page.evaluate(selected => {
        const storage = (document.querySelector('juel-file-picker') as any).storage;
        void (window as any).juel.files.pick({ storage, accept: 'image/*', path: 'Pictures', selected })
            .then((records: any[]) => { document.getElementById('log')!.textContent = records.map(r => r.path).join(', ') || 'Cancelled'; });
    }, selected);
    await choose(['Pictures/sunset.png']);
    await expect(row(page, 'Pictures/sunset.png')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, 'Pictures/harbour.png')).not.toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('juel-file-picker footer .summary').last()).toHaveText('"sunset.png"');
    await page.locator('juel-file-picker footer [data-command="pick"]').last().click();
    await expect(log(page)).toHaveText('Pictures/sunset.png');
    await choose(['Pictures/gone.png']);
    await expect(row(page, 'Pictures/sunset.png')).toBeVisible();
    await expect(page.locator('juel-file-picker juel-file-manager .item[aria-selected="true"]')).toHaveCount(0);
    await expect(page.locator('juel-file-picker footer [data-command="pick"]').last()).toBeDisabled();
});
