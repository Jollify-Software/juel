// juel-menu inside another element's shadow root (as an app's views use it): the arrow
// keys move from the focused item. document.activeElement is the shadow host there.
import { expect, test } from '@playwright/test';

test('in a shadow root, ArrowDown and ArrowUp move between the items', async ({ page }) => {
    await page.goto('examples/Menus/Menu/context-menu.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.evaluate(() => {
        const host = document.createElement('div');
        host.id = 'host';
        document.body.append(host);
        host.attachShadow({ mode: 'open' }).innerHTML = `
            <juel-menu trigger="click">
                <button slot="trigger">More</button>
                <juel-menu-item value="rename" label="Rename"></juel-menu-item>
                <juel-menu-item value="duplicate" label="Duplicate"></juel-menu-item>
                <juel-menu-item value="delete" label="Delete"></juel-menu-item>
            </juel-menu>`;
    });
    const focused = () => page.evaluate(() => document.getElementById('host')!.shadowRoot!.activeElement?.getAttribute('value'));
    await page.locator('#host button').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(focused).toBe('rename');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('duplicate');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('delete');
    await page.keyboard.press('ArrowUp');
    expect(await focused()).toBe('duplicate');
});
