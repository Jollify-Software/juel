// juel-menu on a phone (a screen under 500 px counts as one: `IsMobile`). It used to go into push mode there, whose
// content stayed `visibility: hidden` for good, so no menu opened, and whose closed width pushed its neighbours along.
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 800 } });

const load = async (page, markup: string) => {
    await page.goto('examples/Menus/Menu/context-menu.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    expect(await page.evaluate(() => (window as any).isMobile)).toBe(true);
    await page.evaluate(markup => {
        const host = document.createElement('div');
        host.id = 'host';
        host.innerHTML = markup;
        document.body.prepend(host);
    }, markup);
    await page.waitForFunction(() => (document.querySelector('#host juel-menu, #host juel-toolbar') as any)?.updateComplete);
    await page.waitForTimeout(100);
};
const Items = `
    <button slot="trigger" id="open">More</button>
    <juel-menu-item value="rename" label="Rename"></juel-menu-item>
    <juel-menu-item value="delete" label="Delete"></juel-menu-item>`;

test('in a toolbar, closed it takes no room, and open it floats and can be used', async ({ page }) => {
    await load(page, `<juel-toolbar id="bar" style="width: max-content"><juel-menu trigger="click">${Items}</juel-menu><button id="next">Next</button></juel-toolbar>`);
    const openBox = await page.locator('#open').boundingBox();
    const nextBox = await page.locator('#next').boundingBox();
    // Only the toolbar's gap between them.
    expect(nextBox!.x - (openBox!.x + openBox!.width)).toBeLessThan(30);

    await page.locator('#open').click();
    const rename = page.locator('#host juel-menu-item[value="rename"]');
    await expect(rename).toBeVisible();
    const content = page.locator('#host juel-menu [part="content"]');
    expect(await content.evaluate(e => getComputedStyle(e).position)).toBe('fixed');
    // The toolbar hasn't grown: the menu is over the page, not in the row.
    expect((await page.locator('#next').boundingBox())!.x).toBe(nextBox!.x);

    await page.evaluate(() => document.querySelector('#host juel-menu')!.addEventListener('menu-select', (e: any) => { (window as any).chosen = e.detail.value; }));
    await rename.click();
    expect(await page.evaluate(() => (window as any).chosen)).toBe('rename');
    await expect(rename).toBeHidden();
});

test('an anchored toolbar keeps to one row, unless it is told it can wrap', async ({ page }) => {
    const tools = Array.from({ length: 12 }, (_, i) => `<button style="width: 40px">${i}</button>`).join('');
    await load(page, `<div style="position: relative; height: 200px"><span id="by" style="position: absolute; top: 120px; left: 10px">by</span>
        <juel-toolbar id="bar" anchor="by">${tools}</juel-toolbar></div>`);
    const bar = page.locator('#bar');
    await expect(bar).toHaveAttribute('data-placement', /.+/);
    const wide = (await bar.boundingBox())!;
    expect(wide.width).toBeGreaterThan(400);
    await bar.evaluate(e => { e.style.setProperty('--toolbar-anchored-wrap', 'wrap'); e.style.setProperty('--toolbar-max-width', '300px'); });
    await expect.poll(async () => (await bar.boundingBox())!.width).toBeLessThan(400);
    expect((await bar.boundingBox())!.height).toBeGreaterThan(wide.height);
});

test('collapse-mode="push" opens in the flow, and shows', async ({ page }) => {
    await load(page, `<juel-menu trigger="click" collapse-mode="push">${Items}</juel-menu><div id="below">Below</div>`);
    const content = page.locator('#host juel-menu [part="content"]');
    const before = (await page.locator('#below').boundingBox())!.y;
    await page.locator('#open').click();
    await expect(page.locator('#host juel-menu-item[value="rename"]')).toBeVisible();
    expect(await content.evaluate(e => getComputedStyle(e).position)).toBe('static');
    await expect.poll(async () => (await page.locator('#below').boundingBox())!.y).toBeGreaterThan(before + 20);
    await page.locator('#open').click();
    await expect(page.locator('#host juel-menu-item[value="rename"]')).toBeHidden();
});
