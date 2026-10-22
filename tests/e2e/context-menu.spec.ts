// juel-menu as a context menu: openAt(x, y), on examples/Menus/Menu/context-menu.html.
import { expect, Page, test } from '@playwright/test';

async function open(page: Page) {
    await page.goto('examples/Menus/Menu/context-menu.html');
    await page.waitForFunction(() => (window as any).exampleReady);
}
// At the point, give or take the menu's 4px offset from what it opens against.
const near = (got: { visible: boolean; left: number; top: number }, x: number, y: number) =>
    got.visible && Math.abs(got.left - x) <= 6 && Math.abs(got.top - y) <= 6;
const content = (page: Page) => page.locator('#menu').evaluate(el => {
    const part = el.shadowRoot!.querySelector('[part="content"]') as HTMLElement;
    const box = part.getBoundingClientRect();
    return { visible: getComputedStyle(part).visibility === 'visible', left: Math.round(box.left), top: Math.round(box.top) };
});

test('openAt opens the menu at the point, and an item selects and closes it', async ({ page }) => {
    await open(page);
    expect((await content(page)).visible).toBe(false);
    await page.locator('#area').click({ button: 'right', position: { x: 50, y: 40 } });
    const area = await page.locator('#area').boundingBox();
    await expect.poll(async () => near(await content(page), area!.x + 50, area!.y + 40)).toBe(true);
    // A second right-click elsewhere moves it there.
    await page.locator('#area').click({ button: 'right', position: { x: 200, y: 100 } });
    await expect.poll(async () => near(await content(page), area!.x + 200, area!.y + 100)).toBe(true);
    await page.locator('juel-menu-item[value="delete"]').click();
    await expect(page.locator('#chose')).toHaveText('delete');
    expect((await content(page)).visible).toBe(false);
});

test('from the keyboard: focus moves into the menu, Escape returns it', async ({ page }) => {
    await open(page);
    await page.locator('#area').focus();
    await page.locator('#menu').evaluate(el => (el as any).openAt(20, 20, { focusFirst: true }));
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('value'))).toBe('duplicate');
    await page.keyboard.press('Escape');
    expect((await content(page)).visible).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('area');
});

test('a menu with a trigger still opens under its trigger', async ({ page }) => {
    await page.goto('examples/Menus/Menu/menu.html');
    const menu = page.locator('#insert-menu');
    const trigger = menu.locator('[slot="trigger"]');
    await trigger.click();
    const t = await trigger.boundingBox();
    const c = await menu.evaluate(el => (el.shadowRoot!.querySelector('[part="content"]') as HTMLElement).getBoundingClientRect().top);
    expect(c).toBeGreaterThanOrEqual(t!.y + t!.height);
});
