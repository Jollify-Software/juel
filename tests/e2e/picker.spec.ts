// juel-picker, on examples/Buttons/Picker/picker.html.
import { expect, test } from '@playwright/test';

test('picker: its valued children are radio tiles; a click and the arrow keys choose', async ({ page }) => {
    await page.goto('examples/Buttons/Picker/picker.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const themes = page.locator('#themes');
    await expect(themes.getByRole('radio')).toHaveCount(4);
    await expect(themes.locator('[value="dusk"]')).toHaveAttribute('aria-checked', 'true');
    await expect(themes.locator('[value="dusk"]')).toHaveAttribute('selected', '');
    await expect(themes.locator('[tabindex="0"]')).toHaveCount(1);
    await themes.locator('[value="report"] figcaption').click();
    await expect(page.locator('#log')).toHaveText('theme: report');
    await expect(themes.locator('[value="dusk"]')).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#log')).toHaveText('theme: cinema');
    await expect(themes.locator('[value="cinema"]')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('#log')).toHaveText('theme: plain');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#log')).toHaveText('theme: cinema');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect(page.locator('#log')).toHaveText('theme: report');
    await expect(themes.locator('[tabindex="0"]')).toHaveCount(1);
    await expect(themes.locator('[selected]')).toHaveCount(1);
});
