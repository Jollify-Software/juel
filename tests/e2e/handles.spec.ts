// juel-move-handle and juel-rotate-handle, on examples/Editors/Handles/handles.html.
import { expect, Page, test } from '@playwright/test';

const open = async (page: Page) => {
    await page.goto('examples/Editors/Handles/handles.html');
    await page.waitForFunction(() => (window as any).exampleReady);
};
const centreOf = (page: Page, sel: string) => page.locator(sel).evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
const handleAt = (page: Page, id: string) => page.locator(`#${id}`).evaluate(el => {
    const r = el.shadowRoot!.querySelector('.handle')!.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});

test('move handle: a drag reports the distance live, then one commit; no drag, no commit', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { (window as any).moves = []; document.getElementById('move')!.addEventListener('handle-move', e => (window as any).moves.push((e as CustomEvent).detail)); });
    const h = await handleAt(page, 'move');
    await page.mouse.move(h.x, h.y);
    await page.mouse.down();
    await page.mouse.move(h.x + 20, h.y + 10, { steps: 4 });
    await page.mouse.move(h.x + 40, h.y + 30, { steps: 4 });
    await page.mouse.up();
    const moves = await page.evaluate(() => (window as any).moves);
    expect(moves.filter((m: any) => m.commit)).toEqual([{ dx: 40, dy: 30, commit: true }]);
    expect(moves.filter((m: any) => !m.commit).length).toBeGreaterThan(2);
    expect(await page.locator('#box').evaluate(el => (el as HTMLElement).style.translate)).toBe('40px 30px');
    // A click without a drag commits nothing.
    await page.evaluate(() => { (window as any).moves = []; });
    await page.mouse.click(h.x, h.y);
    expect(await page.evaluate(() => (window as any).moves)).toEqual([]);
});

test('move handle: arrow keys nudge, Shift for big', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { (window as any).nudges = []; document.getElementById('move')!.addEventListener('handle-nudge', e => (window as any).nudges.push((e as CustomEvent).detail)); });
    await page.locator('#move').evaluate(el => (el.shadowRoot!.querySelector('.handle') as HTMLElement).focus());
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowUp');
    expect(await page.evaluate(() => (window as any).nudges)).toEqual([{ dx: 1, dy: 0, big: false }, { dx: 0, dy: -1, big: true }]);
});

test('rotate handle: a drag round the centre turns by the angle swept; Shift snaps', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { (window as any).turns = []; document.getElementById('rotate')!.addEventListener('handle-rotate', e => (window as any).turns.push((e as CustomEvent).detail)); });
    const c = await centreOf(page, '#box');
    const h = await handleAt(page, 'rotate');
    // Press on the handle, then sweep a quarter turn on round the box's centre.
    const r = Math.hypot(h.x - c.x, h.y - c.y), a0 = Math.atan2(h.y - c.y, h.x - c.x);
    const to = (deg: number) => ({ x: c.x + r * Math.cos(a0 + deg * Math.PI / 180), y: c.y + r * Math.sin(a0 + deg * Math.PI / 180) });
    await page.mouse.move(h.x, h.y);
    await page.mouse.down();
    for (const d of [20, 45, 70, 90]) { const p = to(d); await page.mouse.move(p.x, p.y); }
    await page.mouse.up();
    const turns = await page.evaluate(() => (window as any).turns);
    const last = turns.filter((t: any) => t.commit);
    expect(last).toHaveLength(1);
    expect(Math.abs(last[0].angle - 90)).toBeLessThan(1.5);
    expect(await page.locator('#box').evaluate(el => (el as HTMLElement).style.rotate)).toBe(`${last[0].angle}deg`);
    // The sweep crossed the iframe under the box; the drag's cover is gone afterwards.
    expect(await page.evaluate(() => document.querySelectorAll('[data-juel-drag-cover]').length)).toBe(0);
    // Shift: a multiple of 15, from the committed value.
    await page.evaluate(() => { (window as any).turns = []; });
    const h2 = await handleAt(page, 'rotate');
    const r2 = Math.hypot(h2.x - c.x, h2.y - c.y), b0 = Math.atan2(h2.y - c.y, h2.x - c.x);
    await page.mouse.move(h2.x, h2.y);
    await page.keyboard.down('Shift');
    await page.mouse.down();
    await page.mouse.move(c.x + r2 * Math.cos(b0 + 0.3), c.y + r2 * Math.sin(b0 + 0.3));
    await page.mouse.up();
    await page.keyboard.up('Shift');
    const snapped = (await page.evaluate(() => (window as any).turns)).filter((t: any) => t.commit)[0].angle;
    expect(snapped % 15).toBe(0);
});

test('rotate handle: arrow keys turn by step, Shift by big-step, from value', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { (window as any).turns = []; document.getElementById('rotate')!.addEventListener('handle-rotate', e => (window as any).turns.push((e as CustomEvent).detail)); });
    await page.locator('#rotate').evaluate(el => { (el as any).value = 175; (el.shadowRoot!.querySelector('.handle') as HTMLElement).focus(); });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('ArrowLeft');
    expect((await page.evaluate(() => (window as any).turns)).map((t: any) => [t.angle, t.commit])).toEqual([[176, true], [-169, true], [-170, true]]);
});
