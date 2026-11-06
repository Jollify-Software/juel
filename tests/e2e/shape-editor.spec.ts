// juel-shape-editor, on examples/Editors/ShapeEditor/shape-editor.html, with real pointer drags (no model calls): every tool
// draws, selection and its handles, fill, eyedropper, eraser, points, undo for all of it, opening a file (unsafe parts
// out, text locked), zoom, the grid, a saved file loading as a picture, and touch.
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
const tool = (page: Page, name: string) => page.locator(`#editor juel-button[data-tool="${name}"]`).click();
const stageBox = async (page: Page) => (await page.locator('#editor svg.canvas').boundingBox())!;
/** Coordinates on the page, in the drawing's own units at 100% and no panning. */
const at = async (page: Page, x: number, y: number) => { const b = await stageBox(page); return { x: b.x + x, y: b.y + y }; };
const drag = async (page: Page, from: [number, number], to: [number, number]) => {
    const a = await at(page, ...from), b = await at(page, ...to);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(30);
};
const click = async (page: Page, x: number, y: number, options: { modifiers?: string } = {}) => {
    const p = await at(page, x, y);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(30);
    void options;
};
const pressAway = async (page: Page) => page.waitForTimeout(550); // past the double-click window
const handleCentre = async (page: Page, attr: string) => {
    const box = await page.locator(`#editor [${attr}]`).first().boundingBox();
    return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
};
const dragPage = async (page: Page, a: { x: number; y: number }, b: { x: number; y: number }) => {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(30);
};
const pictureLoads = (page: Page) => page.evaluate(async () => {
    const svg = (document.getElementById('editor') as any).svg as string;
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/svg+xml,' + encodeURIComponent(svg); });
    return { w: img.naturalWidth, h: img.naturalHeight };
});

test('every drawing tool makes its mark from a real drag', async ({ page }) => {
    await open(page);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    const steps: [string, [number, number], [number, number], (m: any) => void][] = [
        ['rect', [30, 30], [130, 90], m => expect(m).toMatchObject({ kind: 'rect', x: 30, y: 30, w: 100, h: 60 })],
        ['rounded', [150, 30], [250, 90], m => { expect(m.kind).toBe('rect'); expect(m.radius).toBeGreaterThan(0); }],
        ['ellipse', [270, 30], [370, 90], m => expect(m).toMatchObject({ kind: 'ellipse', w: 100, h: 60 })],
        ['triangle', [390, 30], [490, 90], m => { expect(m.kind).toBe('path'); expect(m.nodes).toHaveLength(3); expect(m.closed).toBe(true); }],
        ['polygon', [510, 30], [610, 90], m => expect(m.nodes).toHaveLength(6)],
        ['star', [630, 30], [730, 90], m => expect(m.nodes).toHaveLength(10)],
        ['line', [30, 120], [130, 180], m => { expect(m.nodes).toHaveLength(2); expect(m.arrow).toBeUndefined(); expect(m.fill).toBeNull(); }],
        ['arrow', [150, 120], [250, 180], m => expect(m.arrow).toBe(true)],
        ['pencil', [270, 120], [370, 180], m => expect(m.kind).toBe('path')],
    ];
    for (const [i, [name, from, to, check]] of steps.entries()) {
        await tool(page, name);
        await drag(page, from, to);
        const now = await marks(page);
        expect(now, `${name} added one mark`).toHaveLength(i + 1);
        check(now[i]);
    }
    await shot(page, 'tools');
    const size = await pictureLoads(page);
    expect(size.w).toBeGreaterThan(600);
    expect(errors).toEqual([]);
    // Undo takes them all off, one at a time, and redo puts them back.
    for (let i = steps.length; i > 0; i--) {
        expect(await marks(page)).toHaveLength(i);
        await page.keyboard.press('Control+z');
    }
    expect(await marks(page)).toHaveLength(0);
    await page.keyboard.press('Control+y');
    expect(await marks(page)).toHaveLength(1);
    await page.locator('#editor juel-button[button-label="Redo"]').click();
    expect(await marks(page)).toHaveLength(2);
});

test('every button shows its icon, and a hidden label stays hidden', async ({ page }) => {
    await open(page);
    const missing = await page.evaluate(() => {
        const root = (document.getElementById('editor') as any).shadowRoot as ShadowRoot;
        const buttons = [...root.querySelectorAll('juel-button[glyph]')];
        return { count: buttons.length, without: buttons.filter(b => !/data:image\/svg/.test(b.shadowRoot?.querySelector('.icon')?.getAttribute('style') ?? '')).map(b => b.getAttribute('glyph')) };
    });
    expect(missing.count).toBeGreaterThan(25);
    expect(missing.without).toEqual([]);
    await expect(page.locator('#editor juel-number.width label')).toHaveCount(0);
    expect(await page.locator('#editor juel-number.width input').getAttribute('aria-label')).toBe('Line width');
});

test('a press with no drag draws nothing; a pencil dot does', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await click(page, 100, 100);
    expect(await marks(page)).toHaveLength(0);
    await tool(page, 'pencil');
    await click(page, 100, 100);
    expect(await marks(page)).toHaveLength(1);
});

test('Shift makes it square and locks a line; Alt draws from the middle; keys choose the tools', async ({ page }) => {
    await open(page);
    await page.locator('#editor .stage').focus();
    await page.keyboard.press('r');
    await page.keyboard.down('Shift');
    await drag(page, [50, 50], [150, 90]);
    await page.keyboard.up('Shift');
    expect((await marks(page))[0]).toMatchObject({ kind: 'rect', w: 100, h: 100 });
    await page.keyboard.press('e');
    await page.keyboard.down('Alt');
    await drag(page, [300, 100], [340, 120]);
    await page.keyboard.up('Alt');
    expect((await marks(page))[1]).toMatchObject({ kind: 'ellipse', x: 260, y: 80, w: 80, h: 40 });
    await page.keyboard.press('l');
    await page.keyboard.down('Shift');
    await drag(page, [50, 200], [150, 210]);
    await page.keyboard.up('Shift');
    const line = (await marks(page))[2];
    expect(line.nodes[1].y).toBeCloseTo(line.nodes[0].y);
    // Every tool's tooltip names its key.
    for (const [name, key] of [['pencil', 'P'], ['fill', 'F'], ['eraser', 'X'], ['select', 'V'], ['curve', 'C']]) {
        expect(await page.locator(`#editor juel-button[data-tool="${name}"]`).getAttribute('title')).toContain(`(${key})`);
    }
});

test('the number of sides and points', async ({ page }) => {
    await open(page);
    await tool(page, 'polygon');
    await page.locator('#editor juel-number.sides input').fill('8');
    await page.locator('#editor juel-number.sides input').blur();
    await drag(page, [50, 50], [150, 150]);
    expect((await marks(page))[0].nodes).toHaveLength(8);
    await tool(page, 'star');
    await page.locator('#editor juel-number.star-points input').fill('7');
    await page.locator('#editor juel-number.star-points input').blur();
    await drag(page, [200, 50], [300, 150]);
    expect((await marks(page))[1].nodes).toHaveLength(14);
});

test('the curve: click for points, drag for a bend, double-click, Enter, and click the first point to close', async ({ page }) => {
    await open(page);
    await tool(page, 'curve');
    await click(page, 50, 50);
    await pressAway(page);
    await drag(page, [150, 50], [180, 90]); // a bend
    await pressAway(page);
    await click(page, 250, 50);
    await page.keyboard.press('Enter');
    let m = (await marks(page))[0];
    expect(m.nodes).toHaveLength(3);
    expect(m.closed).toBe(false);
    expect(m.nodes[1].out).toEqual({ x: 180, y: 90 });
    expect(m.nodes[1].in).toEqual({ x: 120, y: 10 });
    // Double-click ends it, without a stray extra point.
    await click(page, 50, 200);
    await pressAway(page);
    await click(page, 150, 200);
    await pressAway(page);
    await click(page, 250, 200);
    await click(page, 250, 200);
    m = (await marks(page))[1];
    expect(m.nodes).toHaveLength(3);
    // Clicking the first point closes it.
    await click(page, 50, 300);
    await pressAway(page);
    await click(page, 150, 300);
    await pressAway(page);
    await click(page, 100, 380);
    await pressAway(page);
    await click(page, 50, 300);
    m = (await marks(page))[2];
    expect(m.closed).toBe(true);
    expect(m.nodes).toHaveLength(3);
    // Escape throws away a curve in progress; Backspace takes the last point off.
    await click(page, 400, 300);
    await pressAway(page);
    await click(page, 500, 300);
    await page.keyboard.press('Backspace');
    await pressAway(page);
    await click(page, 450, 350);
    await page.keyboard.press('Enter');
    expect((await marks(page))[3].nodes[1]).toEqual({ x: 450, y: 350 });
    await click(page, 400, 100);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    expect(await marks(page)).toHaveLength(4);
});

test('select: click, Shift+click, drag a box; move, nudge, resize, turn', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [50, 50], [150, 150]);
    await drag(page, [200, 50], [300, 150]);
    await tool(page, 'select');
    await click(page, 100, 100);
    await expect(page.locator('#editor .selection')).toHaveCount(1);
    await expect(page.locator('#editor juel-button.delete')).not.toHaveAttribute('disabled');
    await drag(page, [100, 100], [130, 120]);
    expect((await marks(page))[0]).toMatchObject({ x: 80, y: 70 });
    // Undo takes the move back as one step.
    await page.keyboard.press('Control+z');
    expect((await marks(page))[0]).toMatchObject({ x: 50, y: 50 });
    // Arrow keys nudge.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    expect((await marks(page))[0]).toMatchObject({ x: 51, y: 60 });
    // A corner handle resizes and the far corner stays.
    const se = await page.locator('#editor [data-handle="se"]').boundingBox();
    await dragPage(page, { x: se!.x + se!.width / 2, y: se!.y + se!.height / 2 }, { x: se!.x + se!.width / 2 + 40, y: se!.y + se!.height / 2 + 20 });
    expect((await marks(page))[0]).toMatchObject({ x: 51, y: 60, w: 140, h: 120 });
    // The turning handle turns it.
    const turn = await handleCentre(page, 'data-rotate');
    const box = await at(page, 121, 120);
    await dragPage(page, turn, { x: box.x + 120, y: box.y });
    const angle = (await marks(page))[0].rotation;
    expect(Math.abs(angle - 90)).toBeLessThan(3);
    await shot(page, 'select-turned');
    // Shift+click adds the other; a box round both picks both.
    await click(page, 121, 120);
    const b = await at(page, 250, 100);
    await page.keyboard.down('Shift');
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect(page.locator('#editor juel-button.group')).not.toHaveAttribute('disabled');
    await page.keyboard.press('Escape');
    await expect(page.locator('#editor .selection')).toHaveCount(0);
    await drag(page, [10, 10], [600, 300]);
    await expect(page.locator('#editor juel-button.group')).not.toHaveAttribute('disabled');
    // Moving several moves both.
    const before = await marks(page);
    await drag(page, [250, 100], [260, 110]);
    const after = await marks(page);
    expect(after[0].x).toBeCloseTo(before[0].x + 10);
    expect(after[1].x).toBeCloseTo(before[1].x + 10);
});

test('fill, copy colours and the eraser', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [50, 50], [150, 150]);
    await tool(page, 'line');
    await drag(page, [200, 50], [300, 50]);
    await tool(page, 'ellipse');
    await drag(page, [350, 50], [450, 150]);
    const fillColour = '#ff0000';
    await page.evaluate(c => (document.querySelector('#editor') as any).shadowRoot.querySelector('juel-colour.fill').setValue(c), fillColour);
    await tool(page, 'fill');
    await click(page, 100, 100);
    expect((await marks(page))[0].fill).toBe(fillColour);
    // A line has no inside, so it takes the line colour.
    await page.evaluate(() => (document.querySelector('#editor') as any).shadowRoot.querySelector('juel-colour.stroke').setValue('#00ff00'));
    await click(page, 250, 50);
    expect((await marks(page))[1].stroke).toBe('#00ff00');
    expect((await marks(page))[1].fill).toBeNull();
    // Copy colours: the next mark has them.
    await tool(page, 'dropper');
    await click(page, 400, 100);
    await tool(page, 'rect');
    await drag(page, [50, 200], [150, 250]);
    const copied = (await marks(page))[3];
    expect(copied.fill).toBe((await marks(page))[2].fill);
    // The eraser takes whole marks, by clicking and by dragging across; one undo brings the drag's back.
    await tool(page, 'eraser');
    await click(page, 100, 225);
    expect(await marks(page)).toHaveLength(3);
    await drag(page, [100, 100], [400, 100]);
    expect(await marks(page)).toHaveLength(1); // the rectangle and the ellipse; the line is above the path
    await page.keyboard.press('Control+z');
    expect(await marks(page)).toHaveLength(3);
});

test('no fill, line width, dashes and see-through change what is picked', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [50, 50], [150, 150]);
    await tool(page, 'select');
    await click(page, 100, 100);
    await page.locator('#editor juel-button.no-fill').click();
    expect((await marks(page))[0].fill).toBeNull();
    await page.locator('#editor juel-button.no-fill').click();
    expect((await marks(page))[0].fill).toBeTruthy();
    await page.locator('#editor juel-number.width input').fill('6');
    await page.locator('#editor juel-number.width input').blur();
    expect((await marks(page))[0].width).toBe(6);
    await page.locator('#editor juel-select.dash select').selectOption({ label: 'Dashed' });
    await page.waitForTimeout(50);
    expect((await marks(page))[0].dash).toBe('dashed');
    await page.locator('#editor juel-number.opacity input[type="range"]').fill('40');
    await page.waitForTimeout(450);
    expect((await marks(page))[0].opacity).toBeCloseTo(0.6);
    expect(await savedText(page)).toContain('stroke-dasharray');
    // A pause later it was all recorded: undo takes the last change back.
    await page.keyboard.press('Control+z');
    expect((await marks(page))[0].opacity).toBe(1);
    // Picked colours come back under Recent.
    await page.evaluate(() => (document.querySelector('#editor') as any).shadowRoot.querySelector('juel-colour.fill').setValue('#123456'));
    await page.waitForTimeout(50);
    expect(await page.evaluate(() => (document.querySelector('#editor') as any).shadowRoot.querySelector('juel-colour.stroke').recent)).toContain('#123456');
});

test('duplicate, copy and paste, delete, flip, front and back, group and ungroup', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [50, 50], [150, 150]);
    await tool(page, 'triangle');
    await drag(page, [200, 50], [300, 150]);
    await tool(page, 'select');
    await click(page, 100, 100);
    await page.keyboard.press('Control+d');
    let now = await marks(page);
    expect(now).toHaveLength(3);
    expect(now[2]).toMatchObject({ kind: 'rect', x: 70, y: 70 });
    await page.keyboard.press('Delete');
    expect(await marks(page)).toHaveLength(2);
    await click(page, 100, 100);
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await page.keyboard.press('Control+v');
    now = await marks(page);
    expect(now).toHaveLength(4);
    expect(now[3]).toMatchObject({ x: 90, y: 90 });
    await page.locator('#editor juel-button.delete').click();
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Escape');
    await drag(page, [40, 40], [320, 170]);
    await page.keyboard.press('Control+g');
    now = await marks(page);
    expect(new Set(now.map(m => m.group)).size).toBe(1);
    await page.keyboard.press('Escape');
    // One of a group picks them all, and they move as one.
    await click(page, 250, 120);
    const moved = await marks(page);
    await drag(page, [250, 120], [260, 130]);
    expect((await marks(page))[0].x).toBeCloseTo(moved[0].x + 10);
    // It is one <g> in the file, and comes apart again.
    expect((await savedText(page)).match(/data-shape="group"/g)).toHaveLength(1);
    await page.keyboard.press('Control+Shift+g');
    expect((await marks(page)).every(m => !m.group)).toBe(true);
    await page.keyboard.press('Escape');
    // Flip and order.
    await tool(page, 'select');
    await page.evaluate(() => (document.getElementById('editor') as any).fit());
    await page.waitForTimeout(50);
    await page.locator('#editor .stage').focus();
    await page.keyboard.press('Control+a');
    const ids = (await marks(page)).map(m => m.id);
    await page.keyboard.press('Shift+h');
    await page.keyboard.press('Control+[');
    expect((await marks(page)).map(m => m.id)).toEqual(ids);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');
});

test('points: drag one, double-click the line to add one, Delete removes it; a rectangle comes back on undo', async ({ page }) => {
    await open(page);
    await tool(page, 'rect');
    await drag(page, [100, 100], [300, 200]);
    await tool(page, 'select');
    await click(page, 200, 150);
    await pressAway(page);
    await click(page, 200, 150);
    await click(page, 200, 150); // a double-click goes to the points
    await expect(page.locator('#editor juel-button[data-tool="points"]')).toHaveAttribute('pressed', '');
    await expect(page.locator('#editor [data-point]')).toHaveCount(4);
    await drag(page, [100, 100], [60, 70]);
    let m = (await marks(page))[0];
    expect(m.kind).toBe('path');
    expect(m.nodes[0]).toEqual({ x: 60, y: 70 });
    // Undo: the rectangle is a rectangle again.
    await page.keyboard.press('Control+z');
    expect((await marks(page))[0].kind).toBe('rect');
    await page.keyboard.press('Control+y');
    // Double-click on the top line: a new point.
    await pressAway(page);
    const onLine = await at(page, 200, 87);
    await page.mouse.click(onLine.x, onLine.y, { clickCount: 2 });
    await page.waitForTimeout(50);
    m = (await marks(page))[0];
    expect(m.nodes).toHaveLength(5);
    // It's picked: Delete takes it away.
    await page.keyboard.press('Delete');
    expect((await marks(page))[0].nodes).toHaveLength(4);
    // Round it: a curve's picked point shows its bend handles, and dragging one bends it.
    await tool(page, 'ellipse');
    await drag(page, [400, 100], [500, 200]);
    await tool(page, 'points');
    await click(page, 450, 150);
    await expect(page.locator('#editor [data-point]')).toHaveCount(4);
    await pressAway(page);
    await click(page, 450, 100);
    await expect(page.locator('#editor [data-bend]')).toHaveCount(2);
    const out = await page.locator('#editor [data-bend="out"]').boundingBox();
    await dragPage(page, { x: out!.x + out!.width / 2, y: out!.y + out!.height / 2 }, { x: out!.x + out!.width / 2 + 30, y: out!.y + out!.height / 2 - 30 });
    expect((await marks(page))[1].nodes[0].out.y).toBeLessThan(100);
    await shot(page, 'points');
});

test('zoom keeps the pointer true, the grid snaps, the view moves', async ({ page }) => {
    await open(page);
    await page.locator('#editor juel-button.zoom-in').click();
    await page.locator('#editor juel-button.zoom-in').click();
    await tool(page, 'rect');
    await drag(page, [100, 100], [200, 200]);
    const zoomed = (await marks(page))[0];
    expect(zoomed.w).toBeCloseTo(100 / 1.5625, 0);
    // The mark is under the pointer: selecting by clicking inside it finds it.
    await tool(page, 'select');
    await click(page, 150, 150);
    await expect(page.locator('#editor .selection')).toHaveCount(1);
    await page.locator('#editor juel-button.zoom-fit').click();
    await page.locator('#editor juel-button.grid-toggle').click();
    await page.keyboard.press('Escape');
    await tool(page, 'rect');
    await drag(page, [23, 37], [88, 91]);
    const snapped = (await marks(page))[1];
    for (const v of [snapped.x, snapped.y, snapped.w, snapped.h]) expect(Math.abs(v / 10 - Math.round(v / 10))).toBeLessThan(0.01 * 10);
    await shot(page, 'grid');
    // The hand moves the view and draws nothing.
    await tool(page, 'hand');
    const count = (await marks(page)).length;
    await drag(page, [300, 300], [350, 340]);
    expect(await marks(page)).toHaveLength(count);
    // Ctrl and the wheel zoom.
    const level = () => page.locator('#editor .zoom-level').innerText();
    const was = await level();
    const c = await at(page, 300, 200);
    await page.mouse.move(c.x, c.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -300);
    await page.keyboard.up('Control');
    await page.waitForTimeout(50);
    expect(await level()).not.toBe(was);
});

test('opening a file: unsafe parts go and it says so, text is locked and moves, the rest edits', async ({ page }) => {
    await open(page);
    let alerted = false;
    page.on('dialog', d => { alerted = true; void d.dismiss(); });
    await page.evaluate(() => {
        const editor = document.getElementById('editor') as any;
        editor.value = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
            <script>alert(1)</script>
            <rect x="10" y="10" width="60" height="40" fill="#336699" onclick="alert(2)"/>
            <text x="100" y="40" font-size="20" fill="#333">Hello</text>
            <image href="https://example.invalid/x.png" x="0" y="60" width="20" height="20"/>
        </svg>`;
    });
    await page.waitForTimeout(150);
    const notes = await page.evaluate(() => (document.getElementById('editor') as any).notes);
    expect(notes.join(' ')).toContain('script');
    expect(notes.join(' ')).toContain('action');
    expect(notes.join(' ')).toContain('outside');
    const now = await marks(page);
    expect(now.map(m => m.kind)).toEqual(['rect', 'locked', 'locked']);
    const text = now[1];
    expect(text.w).toBeGreaterThan(20); // the browser measured it
    expect(alerted).toBe(false);
    // Nothing to undo: opening isn't an edit.
    await expect(page.locator('#editor juel-button[button-label="Undo"]')).toHaveAttribute('disabled', '');
    // Move the locked text; its words are still there.
    const hit = await page.locator(`#editor .hits [data-id="${text.id}"]`).boundingBox();
    const mid = { x: hit!.x + hit!.width / 2, y: hit!.y + hit!.height / 2 };
    await dragPage(page, mid, { x: mid.x + 30, y: mid.y + 10 });
    const movedText = (await marks(page))[1];
    expect(movedText.x).toBeGreaterThan(text.x);
    const saved = await savedText(page);
    expect(saved).toContain('Hello');
    expect(saved).not.toMatch(/alert|script|onclick|example\.invalid/);
    await shot(page, 'opened');
    // Save and reopen: the same.
    await page.evaluate(s => { (document.getElementById('editor') as any).value = s; }, saved);
    await page.waitForTimeout(150);
    expect(await savedText(page)).toBe(saved);
    expect((await marks(page)).map(m => m.kind)).toEqual(['rect', 'locked', 'locked']);
});

test('a logo from several marks saves, reopens the same, and loads as a picture', async ({ page }) => {
    await open(page);
    await tool(page, 'ellipse');
    await drag(page, [100, 50], [300, 250]);
    await tool(page, 'star');
    await page.evaluate(() => (document.querySelector('#editor') as any).shadowRoot.querySelector('juel-colour.fill').setValue('#ffcc00'));
    await drag(page, [140, 90], [260, 210]);
    await tool(page, 'arrow');
    await drag(page, [60, 280], [340, 280]);
    await shot(page, 'logo');
    const text = await savedText(page);
    expect(text).toMatch(/viewBox="0 0 \d+ \d+"/);
    expect(text).not.toMatch(/<script|on\w+=|href|http:\/\/(?!www\.w3\.org)/);
    const size = await pictureLoads(page);
    expect(size.w).toBeGreaterThan(200);
    await page.evaluate(s => { (document.getElementById('editor') as any).value = s; }, text);
    await page.waitForTimeout(150);
    expect(await savedText(page)).toBe(text);
    expect(await marks(page)).toHaveLength(3);
});

test.describe('touch', () => {
    test.use({ hasTouch: true });
    test('a finger draws, picks and moves', async ({ page, context }) => {
        await open(page);
        const cdp = await context.newCDPSession(page);
        const fingerDrag = async (from: [number, number], to: [number, number]) => {
            const a = await at(page, ...from), b = await at(page, ...to);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
            for (let i = 1; i <= 6; i++) {
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 6, y: a.y + (b.y - a.y) * i / 6 }] });
            }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            // Long enough that the browser doesn't take the next tap as part of this gesture.
            await page.waitForTimeout(500);
        };
        await page.locator('#editor juel-button[data-tool="rect"]').tap();
        await fingerDrag([60, 60], [160, 140]);
        expect((await marks(page))[0]).toMatchObject({ kind: 'rect', x: 60, y: 60, w: 100, h: 80 });
        await page.locator('#editor juel-button[data-tool="pencil"]').tap();
        await fingerDrag([200, 60], [300, 140]);
        expect(await marks(page)).toHaveLength(2);
        await page.locator('#editor juel-button[data-tool="select"]').tap();
        await fingerDrag([100, 100], [130, 130]);
        expect((await marks(page))[0]).toMatchObject({ x: 90, y: 90 });
        await shot(page, 'touch');
    });
});
