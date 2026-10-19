// juel-toolbar's `overflow`, on examples/Navigation/Toolbar/overflow.html.
import { expect, test } from '@playwright/test';

test('overflow: one row; what does not fit is in the â€¦ menu and still works', async ({ page }) => {
    await page.goto('examples/Navigation/Toolbar/overflow.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const bar = page.locator('#narrow');
    const more = bar.locator('.more');
    // At 260px, some items are hidden and the â€¦ menu shows.
    await expect(more).toBeVisible();
    await expect(page.locator('#insert')).toBeHidden();
    await expect(bar.locator('juel-button.b')).toBeVisible();
    // One row: the bar is no taller than a button row.
    const h = await bar.evaluate(b => b.getBoundingClientRect().height);
    expect(h).toBeLessThan(60);
    // A hidden button is clicked.
    await more.locator('juel-button[slot=trigger]').click();
    await more.locator('juel-menu-item[label="Image"]').click();
    await expect(page.locator('#log')).toHaveText('clicked Image');
    // Wide enough: nothing hidden, no â€¦ menu.
    await bar.evaluate(b => { (b as HTMLElement).style.width = '700px'; });
    await expect(page.locator('#insert')).toBeVisible();
    await expect(more).toBeHidden();
});

test('without overflow, the toolbar still wraps as before', async ({ page }) => {
    await page.goto('examples/Navigation/Toolbar/overflow.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.locator('#narrow').evaluate(b => b.removeAttribute('overflow'));
    await expect(page.locator('#insert')).toBeVisible();
    await expect(page.locator('#narrow .more')).toHaveCount(0);
    expect(await page.locator('#narrow').evaluate(b => b.getBoundingClientRect().height)).toBeGreaterThan(60);
});

test('overflow: the items of a hidden menu are listed and fire its menu-select', async ({ page }) => {
    await page.goto('examples/Navigation/Toolbar/overflow.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const more = page.locator('#narrow .more');
    await more.locator('juel-button[slot=trigger]').click();
    await more.locator('juel-menu-item[label="Table"]').click();
    await expect(page.locator('#log')).toHaveText('insert table');
});
