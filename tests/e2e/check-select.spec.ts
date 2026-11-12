// juel-check-select on its example page, and juel-select's option for no value.
import { expect, test, type Page } from '@playwright/test';

const open = async (page: Page) => {
    await page.goto('examples/Editors/CheckSelect/check-select.html');
    await page.waitForFunction(() => (window as any).exampleReady);
};
const trigger = (page: Page, id = 'types') => page.locator(`#${id} juel-button.trigger`);
const panel = (page: Page, id = 'types') => page.locator(`#${id} .panel`);
const box = (page: Page, value: string) => page.locator(`#types .panel input[data-value="${value}"]`);
const selectAll = (page: Page) => page.locator('#types .panel input.select-all');

test('the button says what is ticked; the list opens with Select all first, all ticked', async ({ page }) => {
    await open(page);
    await expect(trigger(page)).toHaveAttribute('label', 'All types');
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    const rows = await page.locator('#types .panel .row').allTextContents();
    expect(rows.map(r => r.trim())).toEqual(['Select all', 'Presentations', 'Reports', 'Websites', 'Notes', 'Packages']);
    await expect(selectAll(page)).toBeChecked();
    await expect(selectAll(page)).toBeFocused();
});

test('unticking one: the value follows, Select all shows a dash, the list stays open', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await box(page, 'report').click();
    await expect(page.locator('#value')).toHaveText('["presentation","site","notes","package"]');
    await expect(panel(page)).toBeVisible();
    expect(await selectAll(page).evaluate((b: HTMLInputElement) => [b.checked, b.indeterminate])).toEqual([false, true]);
    await expect(trigger(page)).toHaveAttribute('label', '4 of 5');
});

test('Select all ticks everything when some are unticked, and unticks all when all are ticked', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await box(page, 'report').click();
    await selectAll(page).click();
    await expect(page.locator('#value')).toHaveText('["presentation","report","site","notes","package"]');
    await selectAll(page).click();
    await expect(page.locator('#value')).toHaveText('[]');
    await expect(trigger(page)).toHaveAttribute('label', 'No types');
    expect(await selectAll(page).evaluate((b: HTMLInputElement) => [b.checked, b.indeterminate])).toEqual([false, false]);
    await box(page, 'notes').click();
    await expect(trigger(page)).toHaveAttribute('label', 'Notes');
});

test('keys: arrows move, Space ticks, Escape closes back to the button', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await page.keyboard.press('ArrowDown');
    await expect(box(page, 'presentation')).toBeFocused();
    await page.keyboard.press('End');
    await expect(box(page, 'package')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('#value')).toHaveText('["presentation","report","site","notes"]');
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
});

test('a click outside closes it; it is not clipped by an overflow: hidden bar', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    const bar = await page.locator('.bar').boundingBox();
    const list = await panel(page).boundingBox();
    expect(list!.y + list!.height).toBeGreaterThan(bar!.y + bar!.height);
    await page.mouse.click(5, 5);
    await expect(panel(page)).toBeHidden();
});

test('with nothing to choose it says so', async ({ page }) => {
    await open(page);
    await expect(trigger(page, 'empty')).toHaveAttribute('label', 'None');
    await trigger(page, 'empty').click();
    await expect(page.locator('#empty .panel .empty')).toHaveText('Nothing to choose.');
});

test('works inside a modal dialog', async ({ page }) => {
    await open(page);
    await page.locator('#open-dialog').click();
    await expect(trigger(page, 'in-dialog')).toHaveAttribute('label', 'Fonts');
    await trigger(page, 'in-dialog').click();
    await expect(panel(page, 'in-dialog')).toBeVisible();
    await page.locator('#in-dialog .panel input[data-value="brand"]').click();
    await expect(trigger(page, 'in-dialog')).toHaveAttribute('label', 'All');
});

test('juel-select: an option whose value is empty shows for an empty value, with no placeholder', async ({ page }) => {
    await page.goto('examples/Editors/Select/select-empty-option.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const select = page.locator('#group select');
    const options = await select.locator('option').allTextContents();
    expect(options.map(o => o.trim())).toEqual(['The top level', 'Finance', 'A new group…']);
    expect(await select.evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent?.trim())).toBe('The top level');
    await select.selectOption({ label: 'Finance' });
    await expect(page.locator('#value')).toHaveText('"finance"');
    await select.selectOption({ label: 'The top level' });
    await expect(page.locator('#value')).toHaveText('""');
    // Control: without such an option the placeholder is still first and shown.
    const plain = page.locator('#plain select');
    expect((await plain.locator('option').first().textContent())?.trim()).toBe('Choose…');
    expect(await plain.evaluate((s: HTMLSelectElement) => s.selectedIndex)).toBe(0);
});

test('juel-select with a value and no placeholder of its own: "Choose…" is not offered (Sue, 2026-11-12)', async ({ page }) => {
    await page.goto('examples/Editors/Select/select-empty-option.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const chosen = page.locator('#chosen select');
    expect((await chosen.locator('option').allTextContents()).map(o => o.trim())).toEqual(["Doesn't play", 'On a press', "When it's clicked"]);
    expect(await chosen.evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent?.trim())).toBe("Doesn't play");
    // Control: emptied, "Choose…" is back, first and shown.
    await page.locator('#chosen').evaluate(async (el: any) => { el.value = null; await el.updateComplete; });
    expect((await chosen.locator('option').first().textContent())?.trim()).toBe('Choose…');
    expect(await chosen.evaluate((s: HTMLSelectElement) => s.selectedIndex)).toBe(0);
});

test('juel-select with a placeholder of its own keeps it as a way back to no value', async ({ page }) => {
    await page.goto('examples/Editors/Select/select-empty-option.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const themed = page.locator('#themed select');
    expect((await themed.locator('option').allTextContents()).map(o => o.trim())).toEqual(['theme · Inter', 'Inter', 'Georgia']);
    expect(await themed.evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent?.trim())).toBe('Georgia');
    await themed.selectOption({ label: 'theme · Inter' });
    await expect(page.locator('#value')).toHaveText('null');
});

test('juel-select required: no placeholder offered; the value shows', async ({ page }) => {
    await page.goto('examples/Editors/Select/select-empty-option.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const select = page.locator('#required select');
    expect((await select.locator('option').allTextContents()).map(o => o.trim())).toEqual(['Pitches', 'A new package']);
    expect(await select.evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent?.trim())).toBe('Pitches');
    // With no value, nothing is shown as chosen (not the first option pretending to be).
    await page.locator('#required').evaluate(async (el: any) => { el.value = null; await el.updateComplete; });
    expect(await select.evaluate((s: HTMLSelectElement) => s.selectedIndex)).toBe(-1);
});
