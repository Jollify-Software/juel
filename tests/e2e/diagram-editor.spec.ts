// juel-diagram-editor, on examples/Visualization/Diagram/diagram-editor.html: the outline (Enter adds, Tab
// puts under a manager, Alt+↓ reorders, Backspace on an empty row removes, undo), the canvas (add a box,
// drag to move on the grid, link by dragging a port, double-click to edit, Delete), and the drawing
// following every edit.
import { expect, Page, test } from '@playwright/test';

const open = async (page: Page, type: string) => {
    await page.goto('examples/Visualization/Diagram/diagram-editor.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.evaluate(t => (window as any).load(t), type);
    await page.waitForTimeout(150);
};
const model = (page: Page) => page.evaluate(() => (document.getElementById('editor') as any).diagram);
const texts = async (page: Page) => (await model(page)).nodes.map((n: any) => `${n.parent ? n.parent + '>' : ''}${n.text}`);
const rowInput = (page: Page, index: number) => page.locator('#editor .row').nth(index).locator('juel-text.text input');
const drawnNodes = (page: Page) => page.locator('#editor juel-diagram').evaluate(el => el.shadowRoot!.querySelectorAll('g.node').length);
const canUndo = (page: Page) => page.locator('#editor juel-button[button-label="Undo"]').evaluate(el => !(el as any).disabled);

test('outline: typing changes the text live, Enter adds a step after, Backspace on an empty one removes it', async ({ page }) => {
    await open(page, 'process');
    expect(await texts(page)).toEqual(['Offer', 'First day', 'First week', 'Review']);
    await rowInput(page, 1).click();
    await rowInput(page, 1).fill('Day one');
    expect((await model(page)).nodes[1].text).toBe('Day one');
    await rowInput(page, 1).press('Enter');
    await page.waitForTimeout(100);
    expect(await texts(page)).toEqual(['Offer', 'Day one', '', 'First week', 'Review']);
    // The new row has the focus: type into it.
    await page.keyboard.type('Buddy');
    expect((await model(page)).nodes[2].text).toBe('Buddy');
    expect(await drawnNodes(page)).toBe(5);
    // Empty it, then Backspace removes it.
    await rowInput(page, 2).fill('');
    await rowInput(page, 2).press('Backspace');
    await page.waitForTimeout(100);
    expect(await texts(page)).toEqual(['Offer', 'Day one', 'First week', 'Review']);
    expect(await drawnNodes(page)).toBe(4);
    // Alt+↓ moves it down; the Move down button too.
    await rowInput(page, 1).click();
    await rowInput(page, 1).press('Alt+ArrowDown');
    expect(await texts(page)).toEqual(['Offer', 'First week', 'Day one', 'Review']);
});

test('outline: undo steps back one gesture at a time, and the event says why', async ({ page }) => {
    await open(page, 'process');
    expect(await canUndo(page)).toBe(false);
    await rowInput(page, 0).click();
    await rowInput(page, 0).fill('Offer made');
    await rowInput(page, 0).press('Tab'); // leaves the field: the edit is one entry
    await page.locator('#editor .bar juel-button[label="Add step"]').click(); // after the picked row
    await page.waitForTimeout(100);
    expect(await texts(page)).toEqual(['Offer made', '', 'First day', 'First week', 'Review']);
    await page.locator('#editor juel-button[button-label="Undo"]').click();
    expect(await texts(page)).toEqual(['Offer made', 'First day', 'First week', 'Review']);
    await page.locator('#editor juel-button[button-label="Undo"]').click();
    expect(await texts(page)).toEqual(['Offer', 'First day', 'First week', 'Review']);
    await page.locator('#editor juel-button[button-label="Redo"]').click();
    expect(await texts(page)).toEqual(['Offer made', 'First day', 'First week', 'Review']);
    const reasons = await page.evaluate(() => (window as any).events.map((e: any) => e.reason));
    expect(reasons).toContain('add');
    expect(reasons).toContain('history');
});

test('org chart: Tab puts a person under the one above, Shift+Tab lifts them, the rows indent', async ({ page }) => {
    await open(page, 'org');
    expect(await texts(page)).toEqual(['Alex Morgan', 'ceo>Sam Lee', 'ops>Dana Kim', 'ops>Riley Chen', 'ceo>Jo Patel', 'sales>Taylor Reed', 'ceo>Chris Diaz']);
    // Chris Diaz (last, under ceo): Tab puts him under Jo Patel (the sibling above).
    await rowInput(page, 6).click();
    await rowInput(page, 6).press('Tab');
    await page.waitForTimeout(100);
    expect((await model(page)).nodes.find((n: any) => n.id === 'fin').parent).toBe('sales');
    const depths = await page.locator('#editor .row').evaluateAll(rows => rows.map(r => (r as HTMLElement).style.getPropertyValue('--depth').trim()));
    expect(depths).toEqual(['0', '1', '2', '2', '1', '2', '2']);
    // Shift+Tab lifts him back under ceo, after Jo.
    await page.locator('#editor .row[data-id="fin"] juel-text.text input').press('Shift+Tab');
    await page.waitForTimeout(100);
    expect((await model(page)).nodes.find((n: any) => n.id === 'fin').parent).toBe('ceo');
    // The top can't be put under anyone (it has no sibling above) and can't be lifted.
    await rowInput(page, 0).click();
    await rowInput(page, 0).press('Tab');
    expect((await model(page)).nodes[0].parent).toBeUndefined();
    // Clicking a node in the drawing picks its row.
    await page.locator('#editor .preview juel-diagram').evaluate(el => (el.shadowRoot!.querySelector('g.node[data-id="ops1"] rect') as SVGElement).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true })));
    expect(await page.locator('#editor .row[data-selected]').getAttribute('data-id')).toBe('ops1');
});

test('timeline: a date per row, drawn on the axis', async ({ page }) => {
    await open(page, 'timeline');
    await page.locator('#editor .row').nth(1).locator('juel-text.date input').fill('Apr');
    await page.locator('#editor .row').nth(1).locator('juel-text.date input').press('Tab');
    expect((await model(page)).nodes[1].date).toBe('Apr');
    expect(await page.locator('#editor juel-diagram').evaluate(el => [...el.shadowRoot!.querySelectorAll('text.date')].map(t => t.textContent))).toEqual(['Jan', 'Apr', 'Jun', 'Sep']);
});

test('flowchart: add a box, drag it on the grid, link two boxes from a port, edit in place, delete', async ({ page }) => {
    await open(page, 'flowchart');
    const before = (await model(page)).nodes.length;
    await page.locator('#editor juel-button[label="Rounded box"]').click();
    await page.waitForTimeout(150);
    let m = await model(page);
    expect(m.nodes.length).toBe(before + 1);
    const added = m.nodes[m.nodes.length - 1];
    expect(added.shape).toBe('rounded');
    expect(added.x % 10).toBe(0);
    // It's being edited in place: type a name and press Enter.
    await page.locator('#editor .inplace juel-text input').fill('Notify');
    await page.locator('#editor .inplace juel-text input').press('Enter');
    m = await model(page);
    expect(m.nodes[m.nodes.length - 1].text).toBe('Notify');
    // Drag it 60 px right and 40 down (in diagram units: the overlay is drawn 1:1 here or scaled; check the grid and the direction).
    const hit = page.locator(`#editor .overlay rect.hit[data-id="${added.id}"]`);
    const box = (await hit.boundingBox())!;
    const scale = await page.locator('#editor .overlay').evaluate(el => (el as SVGSVGElement).getScreenCTM()!.a);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60 * scale, box.y + box.height / 2 + 40 * scale, { steps: 6 });
    await page.mouse.up();
    m = await model(page);
    const moved = m.nodes[m.nodes.length - 1];
    expect(moved.x).toBe(added.x + 60);
    expect(moved.y).toBe(added.y + 40);
    expect(moved.x % 10).toBe(0);
    // Link: pick 'paid', drag from its right port onto the new box.
    await page.locator('#editor .overlay rect.hit[data-id="paid"]').click();
    const port = page.locator('#editor .overlay circle.port[data-side="right"]');
    const p = (await port.boundingBox())!;
    const target = (await hit.boundingBox())!;
    const links = (m.links ?? []).length;
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
    await page.mouse.up();
    m = await model(page);
    expect(m.links.length).toBe(links + 1);
    expect(m.links[m.links.length - 1]).toEqual({ from: 'paid', to: added.id });
    // The new link is picked: give it a label.
    await page.locator('#editor .props juel-text.link-label input').fill('then');
    await page.locator('#editor .props juel-text.link-label input').press('Tab');
    m = await model(page);
    expect(m.links[m.links.length - 1].label).toBe('then');
    expect(await page.locator('#editor juel-diagram').evaluate(el => [...el.shadowRoot!.querySelectorAll('g.edge text.label')].map(t => t.textContent))).toContain('then');
    // Delete the new box: its link goes with it.
    await hit.click();
    await page.locator('#editor .canvas').press('Delete');
    m = await model(page);
    expect(m.nodes.length).toBe(before);
    expect((m.links ?? []).length).toBe(links);
    // Undo brings both back.
    await page.locator('#editor juel-button[button-label="Undo"]').click();
    m = await model(page);
    expect(m.nodes.length).toBe(before + 1);
    expect(m.links.length).toBe(links + 1);
});
