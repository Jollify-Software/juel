// juel-mdi data-poppable="false", on examples/Layout/Mdi/chrome.html (#nopop).
import { expect, test } from '@playwright/test';

test('data-poppable="false": popPanel refuses that panel, others still pop out', async ({ page }) => {
    await page.goto('examples/Layout/Mdi/chrome.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.waitForFunction(() => document.getElementById('nopop')!.shadowRoot!.querySelectorAll('.pane').length === 2);

    const refused = await page.evaluate(() => (document.getElementById('nopop') as any).popPanel('nopop-a'));
    expect(refused).toBeNull();
    expect(await page.evaluate(() => document.getElementById('nopop-a')!.parentElement!.id)).toBe('nopop');

    const popup = page.waitForEvent('popup');
    const popped = await page.evaluate(() => (document.getElementById('nopop') as any).popPanel('nopop-b') !== null);
    expect(popped).toBe(true);
    const win = await popup;
    expect(await win.evaluate(() => !!document.getElementById('nopop-b'))).toBe(true);
    expect(await page.evaluate(() => (document.getElementById('nopop') as any).isPopped('nopop-a'))).toBe(false);
});
