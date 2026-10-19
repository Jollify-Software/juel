// juel-segmented, on examples/Buttons/Segmented/segmented.html.
import { expect, test } from '@playwright/test';

test('segmented: a click and the arrow keys choose; value-changed says so', async ({ page }) => {
    await page.goto('examples/Buttons/Segmented/segmented.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const align = page.locator('#align');
    await expect(align.getByRole('radio')).toHaveCount(4);
    await expect(align.locator('juel-button[data-value="left"]')).toHaveAttribute('aria-checked', 'true');
    await align.locator('juel-button[data-value="center"]').click();
    await expect(page.locator('#log')).toHaveText('align: center');
    await expect(align.locator('juel-button[data-value="left"]')).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#log')).toHaveText('align: right');
    await page.keyboard.press('End');
    await expect(page.locator('#log')).toHaveText('align: justify');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#log')).toHaveText('align: left');
    // Only the chosen one is in the tab order.
    await expect(align.locator('juel-button[tabindex="0"]')).toHaveCount(1);
    // Choosing the chosen one again does nothing without clearable...
    await align.locator('juel-button[data-value="left"]').click();
    await expect(page.locator('#log')).toHaveText('align: left');
});

test('segmented: clearable clears on a second click', async ({ page }) => {
    await page.goto('examples/Buttons/Segmented/segmented.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const weight = page.locator('#weight');
    await weight.locator('juel-button[data-value="bold"]').click();
    await expect(page.locator('#log')).toHaveText('weight: bold');
    await weight.locator('juel-button[data-value="bold"]').click();
    await expect(page.locator('#log')).toHaveText('weight: null');
    await expect(weight.locator('juel-button[aria-checked="true"]')).toHaveCount(0);
});

test('segmented: stretch shares the width; without it the group keeps its own size', async ({ page }) => {
    await page.goto('examples/Buttons/Segmented/segmented.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const widths = (id: string) => page.locator(`#${id} juel-button`).evaluateAll(bs => bs.map(b => Math.round(b.getBoundingClientRect().width)));
    const stretched = await widths('stretched');
    expect(stretched).toHaveLength(3);
    expect(Math.abs(stretched.reduce((a, b) => a + b, 0) - 240)).toBeLessThanOrEqual(4);
    expect(Math.max(...stretched) - Math.min(...stretched)).toBeLessThanOrEqual(1);
    const host = await page.locator('#align').evaluate(e => e.getBoundingClientRect().width);
    expect(host).toBeLessThan(page.viewportSize()!.width / 2);
});
