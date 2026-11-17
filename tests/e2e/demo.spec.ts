// juel.demo (src/_Modules/Demo) on its example page (examples/_Modules/demo.html):
// the ghost hand plays a script with real-looking events (a menu and its
// submenu, a drag with pointer capture inside a scaled iframe, HTML
// drag-and-drop, typing, a key, a click); the person's own clicks pause it and
// don't reach the page; Escape stops it; a missing target fails it; the bar's
// step button plays one step; and coach mode waits for the person.
import { expect, Page, test } from '@playwright/test';

async function open(page: Page) {
    await page.goto('examples/_Modules/demo.html');
    await page.waitForFunction(() => (window as any).juel?.demo && customElements.get('juel-menu'));
    await page.evaluate(() => {
        (window as any).ends = [];
        document.addEventListener('demo-end', (e: any) => (window as any).ends.push(e.detail));
    });
}

const ends = (page: Page) => page.evaluate(() => (window as any).ends as { result: string; index: number; error?: string }[]);

test('plays the whole script: menus, a drag in a scaled iframe, drag-and-drop, typing, a click', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).juel.demo.play((window as any).demoScript, { speed: 4 }));
    await expect(page.locator('juel-ghost')).toHaveCount(1);
    await expect(page.locator('juel-demo-bar')).toHaveCount(1);
    await expect.poll(async () => (await ends(page)).length, { timeout: 45_000 }).toBe(1);
    expect((await ends(page))[0]).toMatchObject({ result: 'finished' });
    // The submenu opened as the hand came onto Reveal ▸, and Fade in was chosen.
    await expect(page.locator('#chosen')).toHaveText('fade-in');
    // The letter was dragged 40 px up on the page: 40 / 0.75 in the scaled iframe, through pointer capture.
    const moved = await page.evaluate(() => (document.getElementById('slide') as HTMLIFrameElement).contentDocument!.querySelector<HTMLElement>('.char-3')!.dataset.moved);
    const [dx, dy] = moved!.split(',').map(Number);
    expect(Math.abs(dx)).toBeLessThanOrEqual(2);
    expect(dy).toBeGreaterThanOrEqual(-56);
    expect(dy).toBeLessThanOrEqual(-50);
    // The third row went to the top (HTML drag-and-drop).
    await expect(page.locator('#rows')).toHaveAttribute('data-order', 'cab');
    // Typed into the editable note and the field; Done was clicked once.
    await expect(page.locator('#note')).toHaveText('Hello');
    await expect(page.locator('#field')).toHaveValue('Typed');
    await expect(page.locator('#done-count')).toHaveText('1');
    // The hand and bar have gone, and pointer capture is the browser's own again.
    await expect(page.locator('juel-ghost')).toHaveCount(0);
    await expect(page.locator('juel-demo-bar')).toHaveCount(0);
    const patched = await page.evaluate(() => Element.prototype.setPointerCapture.toString().includes('[native code]'));
    expect(patched).toBe(true);
});

test('a real click pauses it and never reaches the page; Escape stops it', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).juel.demo.play([
        { say: 'One.' }, { say: 'Two.' }, { say: 'Three.' },
    ], { speed: 0.5 }));
    await expect(page.locator('juel-demo-bar')).toBeVisible();
    await page.locator('#done').click({ force: true });
    await expect(page.locator('#done-count')).toHaveText('0');
    await expect(page.locator('juel-demo-bar .play, juel-demo-bar >> .play')).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).juel.demo.active()?.paused)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await ends(page)).length).toBe(1);
    expect((await ends(page))[0]).toMatchObject({ result: 'stopped', index: 0 });
    await expect(page.locator('juel-demo-bar')).toHaveCount(0);
});

test('a target that never comes fails it, saying which step', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).juel.demo.play([{ say: 'Hi.' }, { click: '#nope', timeout: 300 }], { speed: 8 }));
    await expect.poll(async () => (await ends(page)).length, { timeout: 10_000 }).toBe(1);
    const end = (await ends(page))[0];
    expect(end.result).toBe('failed');
    expect(end.index).toBe(1);
    expect(end.error).toMatch(/Step 2 \(click\): "#nope" isn't on the page/);
});

test('started paused, the step button plays one step and pauses again', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).juel.demo.play([
        { click: '#done', say: 'Press Done.' }, { click: '#done' }, { click: '#done' },
    ], { speed: 4, paused: true }));
    const bar = page.locator('juel-demo-bar');
    await expect(bar).toContainText('1 of 3');
    await bar.locator('.step').click();
    await expect(page.locator('#done-count')).toHaveText('1');
    await expect(bar).toContainText('2 of 3');
    // It waits, paused, on step 2.
    await page.waitForTimeout(800);
    await expect(page.locator('#done-count')).toHaveText('1');
    await bar.locator('.play').click();
    await expect.poll(async () => (await ends(page)).length, { timeout: 10_000 }).toBe(1);
    await expect(page.locator('#done-count')).toHaveText('3');
});

test('coach mode rings each target and waits for the person', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).juel.demo.coach([
        { click: '#done', say: 'Press Done.' },
        { choose: '#split', item: 'Words', say: 'Choose Split into ▸ Words.' },
    ]));
    const ring = page.locator('juel-ghost').locator('.ring');
    await expect(ring).toBeVisible();
    // The ring is round Done.
    const done = (await page.locator('#done').boundingBox())!;
    const r = (await ring.boundingBox())!;
    expect(r.x).toBeLessThanOrEqual(done.x);
    expect(r.x + r.width).toBeGreaterThanOrEqual(done.x + done.width);
    // A click elsewhere doesn't count.
    await page.locator('#field').click();
    await page.waitForTimeout(300);
    await expect(page.locator('juel-demo-bar')).toContainText('1 of 2');
    // The person presses Done: on to step 2.
    await page.locator('#done').click();
    await expect(page.locator('juel-demo-bar')).toContainText('2 of 2');
    await page.locator('#split .split-trigger').click();
    await page.locator('#split juel-menu-item[value=words]').click();
    await expect.poll(async () => (await ends(page)).length).toBe(1);
    expect((await ends(page))[0]).toMatchObject({ result: 'finished' });
    await expect(page.locator('#chosen')).toHaveText('words');
});

test('coach mode: Show me plays the step with the hand, then goes on', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).juel.demo.coach([{ click: '#done', say: 'Press Done.' }, { say: 'Well done.' }], { speed: 4 }));
    await page.locator('juel-demo-bar .show').click();
    await expect(page.locator('#done-count')).toHaveText('1');
    await expect(page.locator('juel-demo-bar')).toContainText('2 of 2');
    await page.locator('juel-demo-bar .next').click();
    await expect.poll(async () => (await ends(page)).length).toBe(1);
});

test('a sandboxed frame (opaque origin): the hand clicks and drags in it through its agent', async ({ page }) => {
    await open(page);
    // The frame's own juel.js has loaded and its agent is on.
    await page.frameLocator('#sandboxed').locator('#press').waitFor();
    await page.waitForTimeout(500);
    await page.evaluate(() => (window as any).juel.demo.play([
        { click: '#sandboxed >>> #press', say: 'Press the button in the frame.' },
        { dblclick: { frame: document.getElementById('sandboxed'), selector: '#press' } },
        { drag: '#sandboxed >>> #knob', to: { dx: 60, dy: 0 } },
    ], { speed: 4 }));
    await expect.poll(async () => (await ends(page)).length, { timeout: 20_000 }).toBe(1);
    expect((await ends(page))[0]).toMatchObject({ result: 'finished' });
    expect(await page.evaluate(() => (window as any).sandbox.presses)).toBe(3);
    const moved = await page.evaluate(() => (window as any).sandbox.moved);
    expect(moved).toBeGreaterThanOrEqual(56);
    expect(moved).toBeLessThanOrEqual(64);
});

test('coach mode in a sandboxed frame: the agent says when the person clicks the target', async ({ page }) => {
    await open(page);
    await page.frameLocator('#sandboxed').locator('#press').waitFor();
    await page.waitForTimeout(500);
    await page.evaluate(() => (window as any).juel.demo.coach([{ click: '#sandboxed >>> #press', say: 'Press it.' }]));
    await expect(page.locator('juel-ghost').locator('.ring')).toBeVisible();
    await page.frameLocator('#sandboxed').locator('#press').click();
    await expect.poll(async () => (await ends(page)).length).toBe(1);
    expect((await ends(page))[0]).toMatchObject({ result: 'finished' });
});
