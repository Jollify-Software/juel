// juel-table editable (night 19 B1), on examples/Data/Table/editable.html.
// Control: CONTROL=1 turns `editable` off after the page loads: all five FAIL (the slots exist only while editable).
import { expect, test, type Page } from '@playwright/test';

const grid = (page: Page) => page.locator('#sales').evaluate((t: any) => t.value);
const cell = (page: Page, row: number, column: number) => page.locator(`#sales input[data-row="${row}"][data-column="${column}"]`);
const focused = (page: Page) => page.locator('#sales').evaluate(t => {
    const input = t.shadowRoot!.activeElement as HTMLInputElement | null;
    return input ? [Number(input.dataset.row), Number(input.dataset.column)] : null;
});

test.beforeEach(async ({ page }) => {
    await page.goto('examples/Data/Table/editable.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    if (process.env.CONTROL) await page.locator('#sales').evaluate((t: any) => { t.editable = false; return t.updateComplete; });
});

test('editable table: typing changes the grid and value-changed says so', async ({ page }) => {
    await cell(page, 1, 1).fill('13');
    expect((await grid(page))[1]).toEqual(['Q1', '13', '8']);
    await expect(page.locator('#log')).toContainText('"Q1","13","8"');
    await cell(page, 0, 2).fill('Spend');
    expect((await grid(page))[0]).toEqual(['Quarter', 'Sales', 'Spend']);
});

test('editable table: Tab, Shift+Tab, Enter and arrows move; Tab on the last cell adds a row', async ({ page }) => {
    await cell(page, 1, 0).click();
    await page.keyboard.press('Tab');
    expect(await focused(page)).toEqual([1, 1]);
    await page.keyboard.press('Shift+Tab');
    expect(await focused(page)).toEqual([1, 0]);
    await page.keyboard.press('Enter');
    expect(await focused(page)).toEqual([2, 0]);
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toEqual([1, 0]);
    // The caret is at the end of "Q1": → moves to the next cell, ← (not at the start) stays.
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toEqual([1, 1]);
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toEqual([1, 1]);
    await cell(page, 3, 2).click();
    await page.keyboard.press('Tab');
    expect((await grid(page)).length).toBe(5);
    expect(await focused(page)).toEqual([4, 0]);
    await page.keyboard.type('Q4');
    expect((await grid(page))[4]).toEqual(['Q4', '', '']);
});

test('editable table: + and − add and remove rows and columns, never the last', async ({ page }) => {
    const table = page.locator('#sales');
    await table.locator('button.add-column').click();
    expect((await grid(page))[0]).toEqual(['Quarter', 'Sales', 'Costs', '']);
    expect(await focused(page)).toEqual([0, 3]);
    await table.locator('button.add-row').click();
    expect((await grid(page)).length).toBe(5);
    // − shows on hover.
    const removeRow = table.locator('tbody tr').nth(0).locator('button.remove-row');
    await expect(removeRow).toBeHidden();
    await table.locator('tbody tr').nth(0).hover();
    await expect(removeRow).toBeVisible();
    await removeRow.click();
    expect((await grid(page)).slice(0, 2)).toEqual([['Quarter', 'Sales', 'Costs', ''], ['Q2', '18', '11', '']]);
    await table.locator('th.edit-heading').nth(3).hover();
    await table.locator('th.edit-heading').nth(3).locator('button.remove-column').click();
    expect((await grid(page))[0]).toEqual(['Quarter', 'Sales', 'Costs']);
    // Down to one body row and one column: their − buttons go.
    await table.evaluate((t: any) => { t.value = [['a', 'b'], ['1', '2']]; });
    await expect(table.locator('button.remove-row')).toHaveCount(1);
    await expect(table.locator('button.remove-row')).toBeDisabled();
    await table.locator('th.edit-heading').nth(1).hover();
    await table.locator('th.edit-heading').nth(1).locator('button.remove-column').click();
    expect(await grid(page)).toEqual([['a'], ['1']]);
    await expect(table.locator('button.remove-column')).toBeDisabled();
});

test('editable table: a pasted block of cells spreads and grows the grid', async ({ page }) => {
    await cell(page, 3, 1).click();
    await cell(page, 3, 1).evaluate(input => {
        const data = new DataTransfer();
        data.setData('text/plain', '20\ta\r\n30\tb\r\n');
        input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true, composed: true }));
    });
    expect(await grid(page)).toEqual([
        ['Quarter', 'Sales', 'Costs'], ['Q1', '12', '8'], ['Q2', '18', '11'], ['Q3', '20', 'a'], ['', '30', 'b'],
    ]);
    expect(await focused(page)).toEqual([4, 2]);
});

test('editable table: the page\'s controls sit in the column slots; plain tables are unchanged', async ({ page }) => {
    const slotted = await page.locator('#sales').evaluate(t =>
        [...t.shadowRoot!.querySelectorAll('slot[name^="column-"]')].map(s => [s.getAttribute('name'), (s as HTMLSlotElement).assignedElements().length]));
    expect(slotted).toEqual([['column-0', 0], ['column-1', 1], ['column-2', 1]]);
    await page.goto('examples/Data/Table/selection.html');
    await expect(page.locator('juel-table').first().locator('input.cell-input')).toHaveCount(0);
});
