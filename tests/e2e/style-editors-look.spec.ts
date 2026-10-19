// juel-gradient-editor and juel-shadow-editor under Juel's opt-in look: unchanged without it,
// on the look's surface and border tokens with it (dark here), on the gradient editor's example page.
import { expect, test } from '@playwright/test';

const box = (page: import('@playwright/test').Page) => page.locator('juel-gradient-editor').first().evaluate(el => {
    const s = getComputedStyle(el.shadowRoot!.querySelector('.se-root')!);
    return { background: s.backgroundColor, border: s.borderTopColor };
});

test('the gradient editor keeps its white box without the look, and takes the dark tokens with it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('examples/Editors/Style/GradientEditor/gradient-editor.html');
    await page.locator('juel-gradient-editor').first().evaluate(el => (el as any).updateComplete);
    expect(await box(page)).toEqual({ background: 'rgb(255, 255, 255)', border: 'rgb(206, 212, 218)' });
    await page.evaluate(() => { (window as any).juel.theme.useLook(); (window as any).juel.theme.set('dark', { persist: false }); });
    await expect.poll(() => box(page)).toEqual({ background: 'rgb(30, 31, 34)', border: 'rgb(58, 60, 66)' });
});
