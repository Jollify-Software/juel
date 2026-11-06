// juel-shape-editor's ready-made shapes, rubbing out part of a line, Join and Cut out, and the PNG: real pointer drags and
// real buttons, and the result read back as pixels from the picture itself, because a mark's numbers can be right and the
// fill wrong.
import { expect, Page, test } from '@playwright/test';
import path from 'node:path';

const Shots = process.env.SHAPE_SHOTS ?? '';
const shot = async (page: Page, name: string) => { if (Shots) await page.screenshot({ path: path.join(Shots, `${name}.png`) }); };

const open = async (page: Page) => {
    await page.goto('examples/Editors/ShapeEditor/shape-editor.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.waitForTimeout(100);
};
const marks = (page: Page) => page.evaluate(() => (document.getElementById('editor') as any).drawing.marks as any[]);
const savedText = (page: Page) => page.evaluate(() => (document.getElementById('editor') as any).svg as string);
const hint = (page: Page) => page.locator('#editor .hint').innerText();
const tool = (page: Page, name: string) => page.locator(`#editor juel-button[data-tool="${name}"]`).click();
const drag = async (page: Page, from: [number, number], to: [number, number]) => {
    const b = (await page.locator('#editor svg.canvas').boundingBox())!;
    await page.mouse.move(b.x + from[0], b.y + from[1]);
    await page.mouse.down();
    await page.mouse.move(b.x + (from[0] + to[0]) / 2, b.y + (from[1] + to[1]) / 2, { steps: 4 });
    await page.mouse.move(b.x + to[0], b.y + to[1], { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(30);
};
const click2 = async (page: Page, x: number, y: number) => {
    const b = (await page.locator('#editor svg.canvas').boundingBox())!;
    await page.mouse.click(b.x + x, b.y + y);
    await page.waitForTimeout(40);
};
const pick = (page: Page, select: string, label: string) => page.locator(`#editor juel-select.${select} select`).selectOption({ label });
const selectAll = async (page: Page) => { await tool(page, 'select'); await page.keyboard.press('Control+a'); };
const press = (page: Page, name: string) => page.locator(`#editor juel-button.${name}`).click();

/** The saved file drawn as a PNG at 1 pixel per unit, and how solid it is at each spot (0 to 255), measured from the file's own corner. */
const alphaAt = (page: Page, spots: [number, number][]) => page.evaluate(async (at) => {
    const blob: Blob = await (document.getElementById('editor') as any).toPng(1);
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    return { size: [bitmap.width, bitmap.height], alpha: at.map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]) };
}, spots);

test('a ready-made shape: choose it, press, drag', async ({ page }) => {
    await open(page);
    await page.locator('#editor').evaluate((e: any) => e.setTool('rect'));
    await tool(page, 'preset');
    await expect(page.locator('#editor juel-select.preset-kind')).toBeVisible();
    await pick(page, 'preset-kind', 'Heart');
    await drag(page, [100, 100], [300, 300]);
    let drawn = await marks(page);
    expect(drawn).toHaveLength(1);
    expect(drawn[0].kind).toBe('path');
    expect(drawn[0].closed).toBe(true);
    // A heart: solid in the lobes and the middle, clear in the notch at the top and the bottom corners.
    const heart = await alphaAt(page, [[50, 30], [100, 100], [150, 30], [100, 3], [5, 195], [195, 195]]);
    expect(heart.alpha.slice(0, 3)).toEqual([255, 255, 255]);
    expect(heart.alpha.slice(3)).toEqual([0, 0, 0]);

    await pick(page, 'preset-kind', 'Speech bubble');
    await drag(page, [350, 100], [550, 300]);
    expect(await marks(page)).toHaveLength(2);
    // Its points can be changed like any other mark's.
    await page.keyboard.press('v');
    await tool(page, 'points');
    await page.mouse.click((await page.locator('#editor svg.canvas').boundingBox())!.x + 450, (await page.locator('#editor svg.canvas').boundingBox())!.y + 150);
    await page.waitForTimeout(50);
    expect(await page.locator('#editor .point').count()).toBeGreaterThan(5);
    await shot(page, 'preset');
    // A key chooses the tool.
    await page.keyboard.press('Escape');
    await page.locator('#editor .stage').focus();
    await page.keyboard.press('k');
    await expect(page.locator('#editor')).toHaveAttribute('tool', 'preset');
    drawn = await marks(page);
    expect(drawn).toHaveLength(2);
});

test('the eraser takes part of a line, one undo step, and leaves a filled shape alone', async ({ page }) => {
    await open(page);
    await tool(page, 'line');
    await drag(page, [100, 100], [500, 100]);
    await tool(page, 'rect');
    await drag(page, [100, 200], [300, 300]);
    await tool(page, 'eraser');
    // Whole marks until asked: the existing behaviour stays the default.
    await expect(page.locator('#editor juel-number.erase-size')).toHaveCount(0);
    await pick(page, 'erase-mode', 'Part of a line');
    await expect(page.locator('#editor juel-number.erase-size')).toBeVisible();
    expect(await hint(page)).toContain('rub out');

    await drag(page, [300, 60], [300, 140]);
    let now = await marks(page);
    expect(now).toHaveLength(3);
    const pieces = now.filter(m => m.kind === 'path');
    expect(pieces).toHaveLength(2);
    expect(pieces[0].nodes[1].x).toBeCloseTo(290, 0);
    expect(pieces[1].nodes[0].x).toBeCloseTo(310, 0);
    expect(new Set(now.map(m => m.id)).size).toBe(3);
    await shot(page, 'rub-line');

    // One piece at a time now: each can be picked up by itself.
    await page.keyboard.press('Control+z');
    expect(await marks(page)).toHaveLength(2);
    await page.keyboard.press('Control+y');
    expect(await marks(page)).toHaveLength(3);

    // A filled shape stays, and it says why.
    const before = JSON.stringify(await marks(page));
    await drag(page, [200, 180], [200, 320]);
    expect(JSON.stringify(await marks(page))).toBe(before);
    expect(await hint(page)).toContain('Only lines can be rubbed out');

    // With its fill gone, its outline can be: a rectangle opens where it's crossed.
    await tool(page, 'select');
    const b = (await page.locator('#editor svg.canvas').boundingBox())!;
    await page.mouse.click(b.x + 200, b.y + 250);
    await page.waitForTimeout(600);
    await press(page, 'no-fill');
    await page.waitForTimeout(400);
    await tool(page, 'eraser');
    await drag(page, [200, 180], [200, 220]);
    now = await marks(page);
    const opened = now.find(m => m.kind === 'path' && m.nodes.length >= 4)!;
    expect(opened).toBeTruthy();
    expect(opened.closed).toBe(false);
});

test('join two shapes: one mark, nothing inside it, undone in one step', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [100, 100], [300, 300]);
    await tool(page, 'ellipse');
    await drag(page, [200, 100], [400, 300]);
    await selectAll(page);
    await press(page, 'join');
    const joined = await marks(page);
    expect(joined).toHaveLength(1);
    expect(joined[0].kind).toBe('path');
    expect(joined[0].more).toBeUndefined();
    expect(joined[0].nodes.some((n: any) => n.out || n.in)).toBe(true);
    // Still picked, so it can be moved straight away.
    await shot(page, 'joined');
    await page.keyboard.press('Control+z');
    expect(await marks(page)).toHaveLength(2);
    await page.keyboard.press('Control+y');
    expect(await marks(page)).toHaveLength(1);
});

test('cut out a hole: it really is see-through, moves, recolours, saves and reopens', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [100, 100], [300, 300]);
    await tool(page, 'ellipse');
    await drag(page, [150, 150], [250, 250]);
    await selectAll(page);
    await press(page, 'cut-out');
    let now = await marks(page);
    expect(now).toHaveLength(1);
    expect(now[0].more).toHaveLength(1);
    // The file starts at the shape's corner, plus half the 2-wide line.
    const middle: [number, number] = [101, 101], ring: [number, number] = [21, 21];
    let read = await alphaAt(page, [middle, ring]);
    expect(read.alpha).toEqual([0, 255]);
    await shot(page, 'hole');

    // Moves as one.
    const before = now[0];
    await page.keyboard.press('ArrowRight');
    now = await marks(page);
    expect(now[0].nodes[0].x).toBeCloseTo(before.nodes[0].x + 1, 3);
    expect(now[0].more[0][0].x).toBeCloseTo(before.more[0][0].x + 1, 3);

    // Saved and opened again: still one mark, its colour still changes, the hole's still a hole.
    const text = await savedText(page);
    expect(text).not.toMatch(/<script|href/);
    await page.locator('#editor').evaluate((e: any, svg: string) => { e.value = svg; }, text);
    await page.waitForTimeout(100);
    now = await marks(page);
    expect(now).toHaveLength(1);
    expect(now[0].kind).toBe('path');
    expect(now[0].more).toHaveLength(1);
    await tool(page, 'fill');
    await page.evaluate(() => (document.querySelector('#editor') as any).shadowRoot.querySelector('juel-colour.fill').setValue('#ff0000'));
    const onRing = await page.evaluate(() => {
        const e = document.getElementById('editor') as any;
        const hit = e.shadowRoot.querySelector('.hits [data-id]') as SVGGraphicsElement;
        const r = hit.getBoundingClientRect();
        return { x: r.x + 10, y: r.y + 10 };
    });
    await page.mouse.click(onRing.x, onRing.y);
    await page.waitForTimeout(50);
    expect((await marks(page))[0].fill).toBe('#ff0000');
    read = await alphaAt(page, [middle, ring]);
    expect(read.alpha).toEqual([0, 255]);
});

test('cutting takes the top shape out of the bottom one, and what it refuses it says', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [100, 100], [300, 300]);
    await tool(page, 'rect');
    await drag(page, [500, 100], [600, 200]);
    await selectAll(page);
    await press(page, 'cut-out');
    expect(await marks(page)).toHaveLength(2);
    expect(await hint(page)).toContain("doesn't touch");

    await open(page);
    await tool(page, 'rect');
    await drag(page, [150, 150], [200, 200]);
    await tool(page, 'rect');
    await drag(page, [100, 100], [300, 300]);
    await selectAll(page);
    await press(page, 'cut-out');
    expect(await marks(page)).toHaveLength(2);
    expect(await hint(page)).toContain('leave nothing');

    await open(page);
    await tool(page, 'rect');
    await drag(page, [100, 100], [300, 300]);
    await tool(page, 'line');
    await drag(page, [100, 100], [300, 300]);
    await selectAll(page);
    await press(page, 'join');
    expect(await marks(page)).toHaveLength(2);
    expect(await hint(page)).toContain('Only closed shapes');
    // Nothing to undo from any of those: the two marks are one step each.
    await page.keyboard.press('Control+z');
    expect(await marks(page)).toHaveLength(1);

    // One picked: the buttons don't offer it.
    await open(page);
    await expect(page.locator('#editor juel-button.join')).toHaveAttribute('disabled', '');
    await expect(page.locator('#editor juel-button.cut-out')).toHaveAttribute('disabled', '');
});

test('keys join and cut', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [100, 100], [200, 200]);
    await tool(page, 'rect');
    await drag(page, [150, 150], [250, 250]);
    await selectAll(page);
    await page.keyboard.press('Shift+J');
    expect(await marks(page)).toHaveLength(1);
    await page.keyboard.press('Control+z');
    await selectAll(page);
    await page.keyboard.press('Shift+K');
    const cut = await marks(page);
    expect(cut).toHaveLength(1);
    expect(cut[0].nodes).toHaveLength(6);
});

test('an opened file keeps its gradients when you draw on it', async ({ page }) => {
    await open(page);
    const file = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs><rect x="0" y="0" width="100" height="100" fill="url(#g)"/></svg>`;
    await page.locator('#editor').evaluate((e: any, svg: string) => { e.value = svg; }, file);
    await page.waitForTimeout(100);
    expect((await marks(page))[0].kind).toBe('locked');
    await tool(page, 'rect');
    await drag(page, [10, 10], [40, 40]);
    expect(await marks(page)).toHaveLength(2);
    expect(await savedText(page)).toContain('linearGradient');
    // And on moving, on undo, and on redo.
    await page.keyboard.press('Control+z');
    expect(await savedText(page)).toContain('linearGradient');
    await page.keyboard.press('Control+y');
    expect(await savedText(page)).toContain('linearGradient');
});

test('the PNG: a real picture, the right size, see-through outside the shape, and stopping at 4096', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [100, 100], [300, 200]);
    const info = await page.evaluate(async () => {
        const e = document.getElementById('editor') as any;
        const big: Blob = await e.toPng();
        const huge: Blob = await e.toPng(100);
        const head = [...new Uint8Array(await big.slice(0, 4).arrayBuffer())];
        const a = await createImageBitmap(big), b = await createImageBitmap(huge);
        return { type: big.type, head, big: [a.width, a.height], huge: [b.width, b.height] };
    });
    expect(info.type).toBe('image/png');
    expect(info.head).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(info.big).toEqual([404, 204]);
    expect(Math.max(...info.huge)).toBe(4096);
});

test('words become a shape: type, click or drag, with real holes, no font needed, and they reopen as they were', async ({ page }) => {
    await open(page);
    await tool(page, 'words');
    // The keyboard is on the words at once: letters don't choose tools.
    await page.keyboard.type('Oi');
    await expect(page.locator('#editor')).toHaveAttribute('tool', 'words');
    expect(await page.locator('#editor juel-text.words-text').evaluate((e: any) => e.value)).toBe('Oi');

    await drag(page, [100, 100], [500, 300]);
    let now = await marks(page);
    expect(now).toHaveLength(1);
    expect(now[0].kind).toBe('path');
    expect(now[0].stroke).toBeNull();
    // O's outside, O's hole, the i's stem and dot.
    expect(now[0].more.length).toBe(3);
    const text = await savedText(page);
    expect(text).not.toMatch(/<text|font-family|href/);
    expect(text).toContain('data-shape="holes"');
    // The O's middle is see-through, its ring solid.
    const o = now[0].nodes; // the biggest outline is the O's outside
    const box = o.reduce((b: any, p: any) => ({ x0: Math.min(b.x0, p.x), x1: Math.max(b.x1, p.x), y0: Math.min(b.y0, p.y), y1: Math.max(b.y1, p.y) }), { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
    const all = [o, ...now[0].more].flat();
    const left = Math.min(...all.map((p: any) => p.x)), top = Math.min(...all.map((p: any) => p.y));
    const middle: [number, number] = [Math.round((box.x0 + box.x1) / 2 - left), Math.round((box.y0 + box.y1) / 2 - top)];
    const ring: [number, number] = [Math.round(box.x0 - left + (box.x1 - box.x0) * 0.04), middle[1]];
    expect((await alphaAt(page, [middle, ring])).alpha).toEqual([0, 255]);
    await shot(page, 'words');

    // Clicking places them at an ordinary size, one undo step.
    await click2(page, 100, 350);
    now = await marks(page);
    expect(now).toHaveLength(2);
    const clicked = [...now[1].nodes, ...now[1].more.flat()];
    expect(Math.max(...clicked.map((p: any) => p.y)) - Math.min(...clicked.map((p: any) => p.y))).toBeCloseTo(60, 0);
    await page.keyboard.press('Control+z');
    expect(await marks(page)).toHaveLength(1);

    // Reopened: the same shape, nothing locked, the same picture.
    await page.locator('#editor').evaluate((e: any, svg: string) => { e.value = svg; }, text);
    await page.waitForTimeout(100);
    now = await marks(page);
    expect(now).toHaveLength(1);
    expect(now[0].kind).toBe('path');
    expect((await alphaAt(page, [middle, ring])).alpha).toEqual([0, 255]);

    // With no words it says so, and draws nothing.
    await tool(page, 'words');
    await page.locator('#editor juel-text.words-text input').fill('');
    await click2(page, 400, 400);
    expect(await marks(page)).toHaveLength(1);
    expect(await hint(page)).toContain('Type your words');
});