// The guide (src/_Modules/Guide, src/Utilities/Guide) on its example page
// (examples/_Modules/guide-element.html): a target inside a shadow root, a
// missing target skipped, the keyboard and focus, "seen" remembered, the dark
// look; and today's juel.guide.start({ selector, title, description }) still works.
import { expect, Page, test } from '@playwright/test';

const card = (page: Page) => page.locator('.visual-guide-tooltip');

async function open(page: Page, query = '') {
    await page.goto(`examples/_Modules/guide-element.html${query}`);
    await page.waitForFunction(() => customElements.get('juel-guide') && (window as any).juel?.guide);
}

async function startTour(page: Page) {
    await page.evaluate(() => (document.getElementById('tour') as any).start());
    await expect(card(page)).toBeVisible();
}

test('steps through, skipping the missing target and reaching into a shadow root', async ({ page }) => {
    // No sliding, so the highlight is measured where it ends up.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const steps: number[] = [];
    await page.exposeFunction('stepSeen', (i: number) => steps.push(i));
    await page.evaluate(() => document.getElementById('tour')!.addEventListener('guide-step', (e: any) => (window as any).stepSeen(e.detail.index)));
    await startTour(page);
    await expect(card(page)).toContainText('First');
    await expect(card(page)).toContainText('1 of 4');
    await expect(card(page).locator('b')).toHaveText('the first');
    await card(page).locator('juel-button.guide-next').click();
    // Step 2's target isn't on the page, so step 3 shows.
    await expect(card(page)).toContainText('Inside a shadow root');
    await expect(card(page)).toContainText('3 of 4');
    // The highlight sits on the shadow-root button.
    const save = (await page.locator('#panel .save').boundingBox())!;
    const hl = (await page.locator('.visual-guide-highlight').boundingBox())!;
    expect(hl.x).toBeLessThanOrEqual(save.x);
    expect(hl.x + hl.width).toBeGreaterThanOrEqual(save.x + save.width);
    // Back from 3 goes to 1, skipping 2 again.
    await card(page).locator('juel-button.guide-back').click();
    await expect(card(page)).toContainText('1 of 4');
    expect(steps).toEqual([0, 2, 0]);
});

test('arrows move, focus stays in the card, Escape ends it as skipped', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.getElementById('tour')!.addEventListener('guide-end', (e: any) => (window as any).ended = e.detail));
    await startTour(page);
    await page.keyboard.press('ArrowRight');
    await expect(card(page)).toContainText('3 of 4');
    await page.keyboard.press('ArrowRight');
    await expect(card(page)).toContainText('Last');
    // Tab cycles inside the card.
    for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const inCard = await page.evaluate(() => {
            const tip = document.querySelector('.visual-guide-tooltip')!;
            return tip.contains(document.activeElement);
        });
        expect(inCard).toBe(true);
    }
    await page.keyboard.press('ArrowLeft');
    await expect(card(page)).toContainText('3 of 4');
    await page.keyboard.press('Escape');
    await expect(card(page)).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).ended)).toEqual({ finished: false });
});

test('Done finishes it, and "seen" is remembered across a reload until reset', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (document.getElementById('tour') as any).resetSeen());
    await page.reload();
    await open(page);
    expect(await page.evaluate(() => (document.getElementById('tour') as any).seen)).toBe(false);
    await page.evaluate(() => document.getElementById('tour')!.addEventListener('guide-end', (e: any) => (window as any).ended = e.detail));
    await startTour(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(card(page)).toContainText('Last');
    await card(page).locator('juel-button.guide-done').click();
    await expect(card(page)).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).ended)).toEqual({ finished: true });
    await page.reload();
    await open(page);
    await expect(page.locator('#seen')).toHaveText('Seen');
    expect(await page.evaluate(() => (window as any).juel.guide.seen('example-tour'))).toBe(true);
    await page.evaluate(() => (document.getElementById('tour') as any).resetSeen());
    expect(await page.evaluate(() => (document.getElementById('tour') as any).seen)).toBe(false);
});

test('the dark look paints the card dark; light is light', async ({ page }) => {
    const background = async () => {
        await startTour(page);
        const bg = await card(page).evaluate(el => getComputedStyle(el).backgroundColor);
        await page.keyboard.press('Escape');
        const [r, g, b] = bg.match(/\d+/g)!.map(Number);
        return (r + g + b) / 3;
    };
    await open(page, '?look&theme=dark');
    expect(await background()).toBeLessThan(100);
    await open(page, '?look&theme=light');
    expect(await background()).toBeGreaterThan(160);
});

test('reduced motion: no pulse', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await startTour(page);
    expect(await page.locator('.visual-guide-highlight').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test("today's juel.guide.start({ selector, title, description }) still works", async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).juel.guide.start([
        { selector: '#first', title: 'Old step', description: 'Plain <text>' },
        { selector: '#last', title: 'Old last', description: 'End' },
    ]));
    await expect(card(page)).toContainText('Old step');
    await expect(card(page)).toContainText('Plain <text>');
    await expect(card(page)).toContainText('1 of 2');
    await page.keyboard.press('ArrowRight');
    await expect(card(page)).toContainText('Old last');
});
