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

test('overflow: data-overflow-priority picks what goes first; the "…" menu keeps the row order', async ({ page }) => {
    await page.goto('examples/Navigation/Toolbar/overflow.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const bar = page.locator('#ranked');
    await expect(bar.locator('.more')).toBeVisible();
    // The ranked ends of the row stay; Quote and Link (-1) go before Bold or Italic (0).
    await expect(page.locator('#ranked-insert')).toBeVisible();
    await expect(page.locator('#ranked-image')).toBeVisible();
    await expect(bar.locator('juel-button[button-label="Quote"]')).toBeHidden();
    await expect(bar.locator('juel-button[button-label="Link"]')).toBeHidden();
    await expect(bar.locator('juel-button[button-label="Bold"]')).toBeVisible();
    // One gap stays between the groups still showing (Bold… | Image, Insert); the other goes.
    const gaps = await bar.evaluate(b => [...b.querySelectorAll(':scope > .gap')].map(g => g.hasAttribute('data-overflowed')));
    expect(gaps.filter(hidden => !hidden)).toHaveLength(1);
    await bar.locator('.more juel-button[slot=trigger]').click();
    const listed = await bar.locator('.more juel-menu-item').evaluateAll(items => items.map(i => i.getAttribute('label')));
    expect(listed.indexOf('Quote')).toBeLessThan(listed.indexOf('Link'));
});
