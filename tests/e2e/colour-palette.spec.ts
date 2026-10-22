// juel-colour `palette` and `recent`, on examples/Editors/Colour/colour.html.
import { expect, test } from '@playwright/test';

test('colour: without a palette, the built-in eight swatches and no Recent row', async ({ page }) => {
    await page.goto('examples/Editors/Colour/colour.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.locator('#picker .swatch').click();
    await expect(page.locator('#picker .preset')).toHaveCount(8);
    await expect(page.locator('#picker .recent')).toHaveCount(0);
});

test('colour: palette replaces the swatches, with names; recent is a second row; both choose', async ({ page }) => {
    await page.goto('examples/Editors/Colour/colour.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.locator('#themed .swatch').click();
    const palette = page.locator('#themed .swatches:not(.recent) .preset');
    await expect(palette).toHaveCount(3);
    await expect(palette.nth(2)).toHaveAttribute('title', 'Accent (#f27a1a)');
    await expect(page.locator('#themed .recent .preset')).toHaveCount(2);
    await expect(page.locator('#themed-log')).toHaveText('');
    await palette.nth(2).click();
    await expect(page.locator('#themed-log')).toHaveText('#f27a1a');
    await page.locator('#themed .recent .preset').nth(1).click();
    await expect(page.locator('#themed-log')).toHaveText('#abcdef');
});

test('colour: the popup opens leftwards at a scrolling panel\'s right edge, and as before where it fits', async ({ page }) => {
    await page.goto('examples/Editors/Colour/colour.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const inside = (id: string) => page.evaluate(id => {
        const el = document.getElementById(id)!;
        const pop = el.shadowRoot!.querySelector('.popup')!;
        return { end: pop.classList.contains('end'), right: Math.round(pop.getBoundingClientRect().right), panel: Math.round(document.getElementById('narrow')!.getBoundingClientRect().right) };
    }, id);
    await page.locator('#edge .swatch').click();
    await expect.poll(async () => (await inside('edge')).end).toBe(true);
    const edge = await inside('edge');
    expect(edge.right).toBeLessThanOrEqual(edge.panel);
    await page.locator('#picker .swatch').click();
    expect((await inside('picker')).end).toBe(false);
});

// The unset swatch's overlay: 'none' unless the opt-in look gives it the "no colour" mark.
const unsetMark = (page: import('@playwright/test').Page, id: string) => page.locator(`#${id}`).evaluate(el =>
    getComputedStyle(el.shadowRoot!.querySelector('.swatch')!, '::after').backgroundImage);

test('an unset swatch is unchanged without the look, and shows the "no colour" slash with it', async ({ page }) => {
    await page.goto('examples/Editors/Colour/colour.html');
    await page.locator('#unset').evaluate(el => (el as any).updateComplete);
    expect(await unsetMark(page, 'unset')).toBe('none');
    await page.evaluate(() => (window as any).juel.theme.useLook());
    await expect.poll(() => unsetMark(page, 'unset')).toContain('linear-gradient');
    // A swatch with a colour never shows it, and setting a value clears it.
    expect(await unsetMark(page, 'picker')).toBe('none');
    await page.locator('#unset').evaluate(el => { (el as any).value = '#ff0000'; });
    await expect.poll(() => unsetMark(page, 'unset')).toBe('none');
});
