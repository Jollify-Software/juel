// juel.tips (src/_Modules/Tips/TipsModule.ts) on its example page
// (examples/_Modules/tips.html): hover and keyboard focus show the one Juel
// tooltip (also for an element inside a shadow root), Escape hides it, key caps,
// the dark look, and no native title while it shows.
import { expect, Page, test } from '@playwright/test';

const tip = (page: Page) => page.locator('#juel-tip');

async function open(page: Page, query = '') {
    await page.goto(`examples/_Modules/tips.html${query}`);
    await page.waitForFunction(() => (window as any).juel?.tips?.enabled?.());
    await page.locator('#undo').evaluate(el => (el as any).updateComplete);
}

test('hovering a juel-button shows its title as a Juel tooltip, with key caps, and no native title', async ({ page }) => {
    await open(page);
    await page.hover('#undo');
    await expect(tip(page)).toBeVisible();
    await expect(tip(page)).toContainText('Undo the last change');
    expect(await tip(page).locator('kbd').allTextContents()).toEqual(['Ctrl', 'Z']);
    // The brackets went into the key caps, not the text.
    expect(await tip(page).evaluate(el => el.firstChild!.textContent)).toBe('Undo the last change');
    // The native title is off while it shows, and its text is kept for screen readers.
    expect(await page.locator('#undo').getAttribute('title')).toBeNull();
    expect(await page.locator('#undo').getAttribute('aria-description')).toBe('Undo the last change (Ctrl+Z)');
    // Below the button and on screen.
    const box = (await page.locator('#undo').boundingBox())!;
    const tipBox = (await tip(page).boundingBox())!;
    expect(tipBox.y).toBeGreaterThanOrEqual(box.y + box.height);
    expect(tipBox.x).toBeGreaterThanOrEqual(0);
    // Moving away hides it and gives the title back.
    await page.mouse.move(5, 5);
    await expect(tip(page)).toBeHidden();
    expect(await page.locator('#undo').getAttribute('title')).toBe('Undo the last change (Ctrl+Z)');
    expect(await page.locator('#undo').getAttribute('aria-description')).toBeNull();
});

test('an element inside a shadow root gets it too, and Escape hides it', async ({ page }) => {
    await open(page);
    await page.locator('#host').locator('#inner').hover();
    await expect(tip(page)).toBeVisible();
    await expect(tip(page)).toHaveText('Inside a shadow root');
    expect(await page.locator('#juel-tip').count()).toBe(1);
    await page.keyboard.press('Escape');
    await expect(tip(page)).toBeHidden();
    expect(await page.locator('#host').locator('#inner').getAttribute('title')).toBe('Inside a shadow root');
});

test('keyboard focus shows it at once; data-tip with data-shortcut', async ({ page }) => {
    await open(page);
    await page.locator('#plain').focus();
    await page.keyboard.press('Tab');
    await expect(tip(page)).toBeVisible({ timeout: 300 });
    await expect(tip(page)).toContainText('Save a copy');
    expect(await tip(page).locator('kbd').allTextContents()).toEqual(['Ctrl', 'Shift', 'S']);
    await page.keyboard.press('Tab');
    await expect(tip(page)).not.toContainText('Save a copy');
});

test('the dark look paints it dark; light is light', async ({ page }) => {
    await open(page, '?look&theme=light');
    await page.hover('#plain');
    await expect(tip(page)).toBeVisible();
    expect(await tip(page).evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(247, 247, 248)');
    await open(page, '?look&theme=dark');
    await page.hover('#plain');
    await expect(tip(page)).toBeVisible();
    expect(await tip(page).evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(38, 39, 43)');
    expect(await tip(page).evaluate(el => getComputedStyle(el).color)).toBe('rgb(232, 233, 236)');
});

test('juel.tips.disable() gives the page its native titles back', async ({ page }) => {
    await open(page);
    await page.click('#off');
    expect(await page.evaluate(() => (window as any).juel.tips.enabled())).toBe(false);
    await page.hover('#plain');
    await page.waitForTimeout(600);
    expect(await page.locator('#juel-tip').isVisible()).toBe(false);
    expect(await page.locator('#plain').getAttribute('title')).toBe("A plain button's title");
});
