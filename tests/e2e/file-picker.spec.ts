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
