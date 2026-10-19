// juel-select style-field, on examples/Editors/Select/select-styled.html.
import { expect, test } from '@playwright/test';

test('select: style-field styles each option; without it options have no style', async ({ page }) => {
    await page.goto('examples/Editors/Select/select-styled.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const fonts = page.locator('#fonts option[value="\\"monospace\\""]');
    await expect(fonts).toHaveAttribute('style', 'font-family: monospace');
    await expect(page.locator('#plain option[value="\\"monospace\\""]')).toHaveCount(1);
    await expect(page.locator('#plain option[style]')).toHaveCount(0);
});
