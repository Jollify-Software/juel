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

// --- drawing (L2) ---

/** A point in plan units on screen. */
const at = (page: Page, x: number, y: number) => page.evaluate(([x, y]) => {
    const g = document.getElementById('plan')!.shadowRoot!.querySelector('g.doc') as SVGGElement;
    const p = new DOMPoint(x, y).matrixTransform(g.getScreenCTM()!);
    return { x: p.x, y: p.y };
}, [x, y]);
const tool = (page: Page, name: string) => page.locator(`#tools juel-button[data-value="${name}"]`).click();
const lastShape = (page: Page) => page.evaluate(() => {
    const p = document.getElementById('plan') as any;
    const id = p.selection[0];
    const el = p.shadowRoot.getElementById(id);
    return { id, tag: el?.localName, parent: el?.parentElement?.getAttribute('data-level') ?? null, attrs: p.itemAttributes(id) };
});
const drag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
};

test('drawing: a rect by dragging, on the grid, with newAttributes, in the storey\'s group', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, await at(page, 302, 398), await at(page, 383, 437));
    const s = await lastShape(page);
    expect(s.tag).toBe('rect');
    expect([s.attrs.x, s.attrs.y, s.attrs.width, s.attrs.height]).toEqual(['300', '400', '80', '40']);
    expect(s.attrs['data-fixture']).toBe('room');
    expect(s.parent).toBe('0');
    await expect(page.locator('#log')).toHaveText(`created rect: ${s.id}`);
    await page.keyboard.press('Control+z');
    expect(await page.evaluate(id => !!document.getElementById('plan')!.shadowRoot!.getElementById(id), s.id)).toBe(false);
});

test('drawing: a point snaps to a corner nearby before the grid', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    // The partition's corner is at (388, 140), off the 20 grid.
    await drag(page, await at(page, 389, 141), await at(page, 440, 200));
    const s = await lastShape(page);
    expect([s.attrs.x, s.attrs.y]).toEqual(['388', '140']);
});

test('drawing: a polygon by clicks, closed on its first point; Escape drops one', async ({ page }) => {
    await open(page);
    await tool(page, 'polygon');
    for (const [x, y] of [[300, 400], [360, 400], [360, 420]]) { const p = await at(page, x, y); await page.mouse.click(p.x, p.y); }
    const first = await at(page, 301, 401);
    await page.mouse.click(first.x, first.y);
    const s = await lastShape(page);
    expect(s.tag).toBe('polygon');
    expect(s.attrs.points).toBe('300,400 360,400 360,420');
    // Escape drops a polygon being drawn.
    for (const [x, y] of [[100, 400], [140, 400]]) { const p = await at(page, x, y); await page.mouse.click(p.x, p.y); }
    await page.keyboard.press('Escape');
    expect((await lastShape(page)).id).toBe(s.id);
});

test('drawing: a polyline ends with Enter; Backspace takes a point back; Shift keeps 45°', async ({ page }) => {
    await open(page);
    await tool(page, 'polyline');
    const a = await at(page, 100, 400); await page.mouse.click(a.x, a.y);
    const b = await at(page, 160, 413);
    await page.keyboard.down('Shift'); await page.mouse.click(b.x, b.y); await page.keyboard.up('Shift');
    const c = await at(page, 200, 300); await page.mouse.click(c.x, c.y);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    const s = await lastShape(page);
    expect(s.tag).toBe('polyline');
    expect(s.attrs.points).toBe('100,400 160,400');
});

test('drawing: a circle by dragging its radius; a point by a click', async ({ page }) => {
    await open(page);
    await tool(page, 'circle');
    await drag(page, await at(page, 460, 400), await at(page, 500, 400));
    let s = await lastShape(page);
    expect([s.tag, s.attrs.cx, s.attrs.cy, s.attrs.r]).toEqual(['circle', '460', '400', '40']);
    await tool(page, 'point');
    const p = await at(page, 421, 99); await page.mouse.click(p.x, p.y);
    s = await lastShape(page);
    expect([s.tag, s.attrs.cx, s.attrs.cy, s.attrs.r]).toEqual(['circle', '420', '100', '5']);
});

test('drawing: on the first floor, a new shape goes in that storey\'s group', async ({ page }) => {
    await open(page);
    await page.locator('#levels juel-button[data-value="1"]').click();
    await tool(page, 'rect');
    await drag(page, await at(page, 300, 300), await at(page, 340, 340));
    expect((await lastShape(page)).parent).toBe('1');
});

test('handles: a rect\'s corner resizes it; a polygon\'s point moves; double-click adds one, Alt+click removes one', async ({ page }) => {
    await open(page);
    const hall = await centre(page, 'hall');
    await page.mouse.click(hall.x, hall.y);
    // The hall's bottom-right corner (260, 380) out to (300, 400).
    await drag(page, await at(page, 260, 380), await at(page, 301, 399));
    expect([await attr(page, 'hall', 'width'), await attr(page, 'hall', 'height')]).toEqual(['240', '340']);
    await page.keyboard.press('Control+z');
    expect(await attr(page, 'hall', 'width')).toBe('200');

    await page.locator('#levels juel-button[data-value="1"]').click();
    const m = await centre(page, 'mezzanine');
    await page.mouse.click(m.x, m.y);
    await drag(page, await at(page, 60, 60), await at(page, 41, 39));
    expect(await attr(page, 'mezzanine', 'points')).toBe('40,40 260,60 260,200 160,260 60,260');
    // Double-click the top edge (from 40,40 to 260,60) at its middle.
    const mid = await at(page, 150, 50);
    await page.mouse.dblclick(mid.x, mid.y);
    expect((await attr(page, 'mezzanine', 'points'))!.split(' ')).toHaveLength(6);
    // Alt+click that new point removes it.
    const added = (await attr(page, 'mezzanine', 'points'))!.split(' ')[1].split(',').map(Number);
    const q = await at(page, added[0], added[1]);
    await page.keyboard.down('Alt'); await page.mouse.click(q.x, q.y); await page.keyboard.up('Alt');
    expect(await attr(page, 'mezzanine', 'points')).toBe('40,40 260,60 260,200 160,260 60,260');
});

test('setLevelAttributes names a storey (making its group if need be), one undo step', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (document.getElementById('plan') as any).setLevelAttributes(2, { 'data-label': 'Roof terrace', 'data-height': '3' }));
    const svg: string = await page.evaluate(() => (document.getElementById('plan') as any).svg);
    expect(svg).toMatch(/<g data-fixture="level" data-level="1"[^>]*>[\s\S]*<\/g><g data-fixture="level" data-level="2" data-label="Roof terrace" data-height="3"\/>/);
    await page.evaluate(() => (document.getElementById('plan') as any).undo());
    expect(await page.evaluate(() => (document.getElementById('plan') as any).svg.includes('Roof terrace'))).toBe(false);
});

test('newAttributes: {id} in a value is the new shape\'s id', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { (document.getElementById('plan') as any).newAttributes = { 'data-fixture': 'room', 'data-id': '{id}', title: 'room {id}' }; });
    await tool(page, 'rect');
    await drag(page, await at(page, 300, 400), await at(page, 340, 430));
    const s = await lastShape(page);
    expect(s.attrs['data-id']).toBe(s.id);
    expect(s.attrs.title).toBe(`room ${s.id}`);
});

test('marks: drawn over the plan in plan units, not part of svg and not pickable', async ({ page }) => {
    await open(page);
    const before: string = await page.evaluate(() => (document.getElementById('plan') as any).svg);
    await page.evaluate(async () => {
        const plan = document.getElementById('plan') as any;
        const hall = plan.shadowRoot.getElementById('hall');
        const b = hall.getBBox();
        plan.marks = `<circle class="mark" cx="${b.x + b.width / 2}" cy="${b.y + b.height / 2}" r="10" fill="red"/>`;
        await plan.updateComplete;
    });
    const mark = page.locator('#plan .overlay .marks circle.mark');
    await expect(mark).toHaveCount(1);
    // On screen where the hall is (plan units follow the view).
    const hall = await centre(page, 'hall');
    const box = (await mark.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - hall.x)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - hall.y)).toBeLessThan(2);
    expect(await page.evaluate(() => (document.getElementById('plan') as any).svg)).toBe(before);
    // A click on the mark picks the hall under it.
    await page.mouse.click(hall.x, hall.y);
    expect(await selection(page)).toEqual(['hall']);
});

test('planStyle: styles shapes with no fill on screen only, not part of svg', async ({ page }) => {
    await open(page);
    const before: string = await page.evaluate(() => (document.getElementById('plan') as any).svg);
    const fill = (id: string) => page.evaluate(id => getComputedStyle(document.getElementById('plan')!.shadowRoot!.getElementById(id)!).fill, id);
    const hallBefore = await fill('hall');
    // A shape without a fill attribute takes it; one with a fill keeps its own.
    await page.evaluate(async () => {
        const plan = document.getElementById('plan') as any;
        plan.shadowRoot.getElementById('gallery').removeAttribute('fill');
        plan.planStyle = '[data-fixture="room"]:not([fill]) { fill: rgb(1, 2, 3); }';
        await plan.updateComplete;
    });
    expect(await fill('gallery')).toBe('rgb(1, 2, 3)');
    expect(await fill('hall')).toBe(hallBefore);
    expect(await page.evaluate(() => (document.getElementById('plan') as any).svg)).toBe(before);
});

test('plan editor: a ghost is drawn and dragged by one press, one undo takes it back', async ({ page }) => {
    await open(page);
    const plan = page.locator('#plan');
    const before: string = await plan.evaluate((p: any) => p.svg);
    // A ghost on the hall's centre (ghosts lie over the plan, so it's the ghost that's pressed).
    await plan.evaluate((p: any) => {
        const hall = p.shadowRoot.getElementById('hall');
        const b = hall.getBBox();
        p.ghosts = [{ id: 'auto-2', cx: b.x + b.width / 2, cy: b.y + b.height / 2, r: 20, label: '2', attributes: { 'data-fixture': 'platform', 'data-slide': 'b' } }];
        (window as any).drawn = [];
        p.addEventListener('ghost-drawn', (e: CustomEvent) => (window as any).drawn.push(e.detail));
    });
    const ghost = plan.locator('.ghost');
    await expect(ghost).toHaveCount(1);
    await expect(plan.locator('.ghost text')).toHaveText('2');
    const box = (await ghost.locator('circle').boundingBox())!;
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 5 });
    await page.mouse.move(x + 120, y, { steps: 5 });
    await page.mouse.up();

    const drawn = await page.evaluate(() => (window as any).drawn);
    expect(drawn).toHaveLength(1);
    expect(drawn[0].ghost).toBe('auto-2');
    const svg: string = await plan.evaluate((p: any) => p.svg);
    const circle = svg.match(/<circle data-fixture="platform" data-slide="b" cx="([-\d.]+)"[^>]*>/);
    expect(circle, 'the ghost is a real circle in the plan').not.toBeNull();
    const ghostX = (await plan.evaluate((p: any) => { const b = p.shadowRoot.getElementById('hall').getBBox(); return b.x + b.width / 2; }));
    expect(Number(circle![1])).toBeGreaterThan(ghostX + 1);   // dragged on, not left where it was
    expect(await selection(page)).toEqual([drawn[0].id]);
    await expect(ghost).toHaveCount(0);

    await plan.evaluate((p: any) => p.undo());
    expect(await plan.evaluate((p: any) => p.svg)).toBe(before);
});
