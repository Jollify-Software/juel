// juel-plan-editor, on examples/Editors/PlanEditor/plan-editor.html (grid 20).
import { expect, test, type Page } from '@playwright/test';

const open = async (page: Page) => {
    await page.goto('examples/Editors/PlanEditor/plan-editor.html');
    await page.waitForFunction(() => (window as any).exampleReady);
};
/** The centre of an item on screen. */
const centre = (page: Page, id: string) => page.evaluate(id => {
    const r = document.getElementById('plan')!.shadowRoot!.getElementById(id)!.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, id);
const attr = (page: Page, id: string, name: string) => page.evaluate(([id, name]) =>
    document.getElementById('plan')!.shadowRoot!.getElementById(id)?.getAttribute(name) ?? null, [id, name]);
const selection = (page: Page) => page.evaluate(() => (document.getElementById('plan') as any).selection as string[]);

test('plan editor: the plan renders, with the other storey faint and unpickable', async ({ page }) => {
    await open(page);
    expect(await attr(page, 'hall', 'data-label')).toBe('Entrance Hall');
    const opacity = (level: string) => page.evaluate(level => getComputedStyle(document.getElementById('plan')!.shadowRoot!.querySelector(`.doc > g[data-level="${level}"]`)!).opacity, level);
    expect(await opacity('1')).toBe('0.22');
    expect(await opacity('0')).toBe('1');
    // Ids were added where missing (the ground slab, the label).
    const svg: string = await page.evaluate(() => (document.getElementById('plan') as any).svg);
    expect(svg).toMatch(/<rect data-fixture="ground"[^>]* id="p1"/);
    // A click where the faint mezzanine is picks what's under it on the ground floor, never the mezzanine.
    const m = await centre(page, 'mezzanine');
    await page.mouse.click(m.x, m.y);
    expect(await selection(page)).not.toContain('mezzanine');
});

test('plan editor: click selects, Shift adds, Escape clears', async ({ page }) => {
    await open(page);
    const hall = await centre(page, 'hall');
    await page.mouse.click(hall.x, hall.y);
    await expect(page.locator('#log')).toHaveText('selected: hall');
    const gallery = await centre(page, 'gallery');
    await page.keyboard.down('Shift');
    await page.mouse.click(gallery.x, gallery.y);
    await page.keyboard.up('Shift');
    expect(await selection(page)).toEqual(['hall', 'gallery']);
    await page.keyboard.press('Escape');
    expect(await selection(page)).toEqual([]);
});

test('plan editor: a drag moves the selection on the grid; arrows nudge; one undo step each', async ({ page }) => {
    await open(page);
    const hall = await centre(page, 'hall');
    // How many screen px is one plan unit at this zoom?
    const scale = await page.evaluate(() => { const v = document.getElementById('plan')!.shadowRoot!.querySelector('svg.view') as SVGSVGElement; return v.getScreenCTM()!.a; });
    await page.mouse.move(hall.x, hall.y);
    await page.mouse.down();
    await page.mouse.move(hall.x + 30 * scale, hall.y + 9 * scale, { steps: 5 });
    await page.mouse.move(hall.x + 41 * scale, hall.y + 12 * scale, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator('#log')).toHaveText('changed (move)');
    expect([await attr(page, 'hall', 'x'), await attr(page, 'hall', 'y')]).toEqual(['100', '80']);   // 60+40, 60+20 (snapped)
    await page.keyboard.press('ArrowRight');
    expect(await attr(page, 'hall', 'x')).toBe('120');
    await page.keyboard.press('Shift+ArrowUp');
    expect(await attr(page, 'hall', 'y')).toBe('-120');
    const plan = page.locator('#plan');
    await page.keyboard.press('Control+z');
    expect(await attr(page, 'hall', 'y')).toBe('80');
    await page.keyboard.press('Control+z');
    expect(await attr(page, 'hall', 'x')).toBe('100');
    await page.keyboard.press('Control+z');
    expect([await attr(page, 'hall', 'x'), await attr(page, 'hall', 'y')]).toEqual(['60', '60']);
    expect(await plan.evaluate((p: any) => p.canUndo)).toBe(false);
    await page.keyboard.press('Control+y');
    expect(await attr(page, 'hall', 'x')).toBe('100');
});

test('plan editor: Delete removes the selection; undo brings it back', async ({ page }) => {
    await open(page);
    const wall = await centre(page, 'partition');
    await page.mouse.click(wall.x, wall.y);
    await page.keyboard.press('Delete');
    expect(await attr(page, 'partition', 'data-fixture')).toBeNull();
    expect(await page.evaluate(() => (window as any).lastPlan.includes('partition'))).toBe(false);
    await page.keyboard.press('Control+z');
    expect(await attr(page, 'partition', 'data-fixture')).toBe('wall');
});

test('plan editor: a box on empty space selects what it touches, on the storey shown', async ({ page }) => {
    await open(page);
    const box = await page.evaluate(() => {
        const sr = document.getElementById('plan')!.shadowRoot!;
        const a = sr.getElementById('partition')!.getBoundingClientRect(), b = sr.getElementById('stairs')!.getBoundingClientRect();
        const view = sr.querySelector('svg.view')!.getBoundingClientRect();
        return { view, a, b };
    });
    // From the plan's empty top-left margin to the partition, level with the stairs: hall, gallery, partition, stairs and the slab.
    await page.mouse.move(box.view.x + 4, box.view.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.a.x + 2, box.b.y + box.b.height / 2, { steps: 8 });
    await page.mouse.up();
    const ids = await selection(page);
    expect(ids).toEqual(expect.arrayContaining(['hall', 'gallery', 'partition', 'stairs']));
    expect(ids).not.toContain('mezzanine');
});

test('plan editor: the first floor shows and picks its own items', async ({ page }) => {
    await open(page);
    await page.locator('#levels juel-button[data-value="1"]').click();
    const m = await centre(page, 'mezzanine');
    await page.mouse.click(m.x, m.y);
    expect(await selection(page)).toEqual(['mezzanine']);
    // A polygon moves by its points.
    await page.keyboard.press('ArrowDown');
    expect(await attr(page, 'mezzanine', 'points')).toBe('60,80 260,80 260,220 160,280 60,280');
});

test('plan editor: setAttributes is one undoable change; the wheel zooms', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (document.getElementById('plan') as any).setAttributes(['hall'], { 'data-label': 'Foyer', 'data-roof': 'glass', fill: null }));
    expect(await attr(page, 'hall', 'data-label')).toBe('Foyer');
    expect(await attr(page, 'hall', 'fill')).toBeNull();
    await page.evaluate(() => (document.getElementById('plan') as any).undo());
    expect(await attr(page, 'hall', 'data-label')).toBe('Entrance Hall');
    const viewBox = () => page.evaluate(() => document.getElementById('plan')!.shadowRoot!.querySelector('svg.view')!.getAttribute('viewBox')!.split(' ').map(Number));
    const before = await viewBox();
    const hall = await centre(page, 'hall');
    await page.mouse.move(hall.x, hall.y);
    await page.mouse.wheel(0, -300);
    const after = await viewBox();
    expect(after[2]).toBeLessThan(before[2]);
});
