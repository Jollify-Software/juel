// juel-icon-picker on its example page, and in the diagram editor's rows.
import { expect, test, type Page } from '@playwright/test';

const open = async (page: Page) => {
    await page.goto('examples/Editors/IconPicker/icon-picker.html');
    await page.waitForFunction(() => (window as any).exampleReady);
};
const panel = (page: Page, id = 'picker') => page.locator(`#${id} .panel`);

test('choosing an icon: the button shows it, the value is reported, the grid closes', async ({ page }) => {
    await open(page);
    await page.locator('#picker juel-button.trigger').click();
    await expect(panel(page)).toBeVisible();
    await page.locator('#picker .grid juel-button[data-glyph="lucide-rocket"]').click();
    await expect(page.locator('#value')).toHaveText('lucide-rocket');
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#picker juel-button.trigger')).toHaveAttribute('glyph', 'lucide-rocket');
    await expect(page.locator('#picker juel-button.trigger')).toHaveAttribute('button-label', 'Icon: Rocket');
});

test('search by the words people use; Enter takes the first', async ({ page }) => {
    await open(page);
    await page.locator('#picker juel-button.trigger').click();
    await page.locator('#picker .search').fill('van');
    await expect(page.locator('#picker .grid juel-button')).toHaveCount(1);
    await page.locator('#picker .search').press('Enter');
    await expect(page.locator('#value')).toHaveText('lucide-truck');
});

test('no match says so', async ({ page }) => {
    await open(page);
    await page.locator('#picker juel-button.trigger').click();
    await page.locator('#picker .search').fill('zzzz');
    await expect(page.locator('#picker .nothing')).toBeVisible();
});

test('the arrow keys go from the search box through the grid', async ({ page }) => {
    await open(page);
    await page.locator('#picker juel-button.trigger').click();
    await page.locator('#picker .search').press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.locator('#value')).toHaveText('lucide-users');
});

test('No icon clears it; Escape and a click outside choose nothing', async ({ page }) => {
    await open(page);
    await expect(page.locator('#picker .none')).toHaveCount(0);
    await page.locator('#picker juel-button.trigger').click();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await page.locator('#picker juel-button.trigger').click();
    await page.locator('#picker .grid juel-button[data-glyph="lucide-star"]').click();
    await page.locator('#picker juel-button.trigger').click();
    await page.mouse.click(600, 400);
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#value')).toHaveText('lucide-star');
    await page.locator('#picker juel-button.trigger').click();
    await page.locator('#picker juel-button.none').click();
    await expect(page.locator('#value')).toHaveText('');
    await expect(page.locator('#picker juel-button.trigger')).toHaveAttribute('button-label', 'Icon: none');
});

test('in a modal dialog it opens above the dialog, and stays on screen', async ({ page }) => {
    await open(page);
    await page.locator('#open-dialog').click();
    await page.locator('#in-dialog juel-button.trigger').click();
    await expect(panel(page, 'in-dialog')).toBeVisible();
    await page.locator('#in-dialog .grid juel-button[data-glyph="lucide-star"]').click();
    await expect(page.locator('#in-dialog juel-button.trigger')).toHaveAttribute('glyph', 'lucide-star');
    await expect(page.locator('#dialog')).toHaveAttribute('open', '');
    await page.locator('#in-dialog juel-button.trigger').click();
    const box = (await panel(page, 'in-dialog').boundingBox())!;
    const size = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
});

test('a diagram row picks its icon, and the drawing shows it as one undo step', async ({ page }) => {
    await page.goto('examples/Visualization/Diagram/diagram-editor.html');
    await page.waitForFunction(() => customElements.get('juel-diagram-editor'));
    await page.evaluate(() => { const e = document.querySelector('#editor') as any; e.value = { type: 'org', nodes: [{ id: 'a', text: 'Head' }, { id: 'b', text: 'B', parent: 'a' }] }; return e.updateComplete; });
    const row = page.locator('#editor .row[data-id="b"]');
    await expect(row.locator('juel-text.icon')).toHaveCount(0);
    await row.locator('juel-icon-picker juel-button.trigger').click();
    await row.locator('juel-icon-picker .grid juel-button[data-glyph="lucide-rocket"]').click();
    expect(await page.evaluate(() => (document.querySelector('#editor') as any).diagram.nodes[1].icon)).toBe('lucide-rocket');
    await expect(page.locator('#editor juel-diagram svg.icon')).toHaveCount(1);
    await page.locator('#editor juel-button[button-label="Undo"]').click();
    expect(await page.evaluate(() => (document.querySelector('#editor') as any).diagram.nodes[1].icon)).toBeUndefined();
});
