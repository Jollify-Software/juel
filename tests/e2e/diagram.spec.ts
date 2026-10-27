// juel-diagram, on examples/Visualization/Diagram/diagram.html: each type draws, every node inside
// the drawing and none overlapping, a problem shows as text, and the page's tokens colour it.
import { expect, Page, test } from '@playwright/test';

const open = async (page: Page) => {
    await page.goto('examples/Visualization/Diagram/diagram.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.waitForFunction(() => ['process', 'org', 'timeline', 'flowchart'].every(id => document.getElementById(id)!.shadowRoot!.querySelector('svg g.node')));
};

interface Rect { x: number; y: number; w: number; h: number }
const nodes = (page: Page, id: string) => page.evaluate(id => {
    const root = document.getElementById(id)!.shadowRoot!;
    const svg = root.querySelector('svg')!.getBoundingClientRect();
    const boxes = [...root.querySelectorAll('g.node')].map(g => {
        const r = g.querySelector('rect, polygon')!.getBoundingClientRect();
        return { id: (g as HTMLElement).dataset.id, x: r.x - svg.x, y: r.y - svg.y, w: r.width, h: r.height, text: [...g.querySelectorAll('text')].map(t => t.textContent).join(' | ') };
    });
    return { svg: { w: svg.width, h: svg.height }, boxes, edges: root.querySelectorAll('g.edge').length, arrows: root.querySelectorAll('g.edge.arrow').length };
}, id);
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
const inside = (r: Rect, s: { w: number; h: number }) => r.x >= -1 && r.y >= -1 && r.x + r.w <= s.w + 1 && r.y + r.h <= s.h + 1;

test('each type draws its nodes inside the box, none overlapping', async ({ page }) => {
    await open(page);
    for (const [id, count, arrows] of [['process', 4, 3], ['org', 7, 0], ['timeline', 4, 0], ['flowchart', 5, 5]] as const) {
        const got = await nodes(page, id);
        expect(got.boxes.length, id).toBe(count);
        expect(got.arrows, id).toBe(arrows);
        expect(got.svg.w, id).toBeGreaterThan(200);
        for (const b of got.boxes) expect(inside(b, got.svg), `${id} ${b.id} inside`).toBe(true);
        for (let i = 0; i < got.boxes.length; i++) for (let j = i + 1; j < got.boxes.length; j++)
            expect(overlap(got.boxes[i], got.boxes[j]), `${id}: ${got.boxes[i].id} vs ${got.boxes[j].id}`).toBe(false);
    }
    const process = await nodes(page, 'process');
    expect(process.boxes.map(b => b.text)).toEqual(['Offer | Contract signed', 'First day | Laptop, badge, buddy', 'First week | Team intros', 'Review | At 30 days']);
    const flow = await nodes(page, 'flowchart');
    expect(flow.edges).toBe(5);
    expect(await page.locator('#flowchart').evaluate(el => [...el.shadowRoot!.querySelectorAll('g.edge text.label')].map(t => t.textContent))).toEqual(['yes', 'no', 'approved']);
    // The timeline's labels alternate sides of the axis.
    const sides = await page.locator('#timeline').evaluate(el => { const r = el.shadowRoot!; const axis = r.querySelector('line.axis')!.getBoundingClientRect().y; return [...r.querySelectorAll('g.node rect')].map(n => { const b = n.getBoundingClientRect(); return b.y + b.height / 2 < axis ? 'above' : 'below'; }); });
    expect(sides).toEqual(['above', 'below', 'above', 'below']);
});

test('the drawing scales to its box, and a broken model shows its problems', async ({ page }) => {
    await open(page);
    const wide = await page.locator('#process').evaluate(el => el.shadowRoot!.querySelector('svg')!.getBoundingClientRect().width);
    await page.locator('#process').evaluate(el => { (el as HTMLElement).style.width = '300px'; });
    await page.waitForTimeout(100);
    const narrow = await page.locator('#process').evaluate(el => el.shadowRoot!.querySelector('svg')!.getBoundingClientRect().width);
    expect(narrow).toBeLessThan(wide);
    expect(narrow).toBeCloseTo(300, 0);
    const problems = await page.locator('#broken').evaluate(el => [...el.shadowRoot!.querySelectorAll('.problem li')].map(li => li.textContent));
    expect(problems).toEqual(['node 2: the id "a" is used twice.', 'node "a": "parent" names no node ("zz").']);
    expect(await page.locator('#broken').evaluate(el => !!el.shadowRoot!.querySelector('svg'))).toBe(false);
    // Many reports stack in a column; `across` puts the manager at the left.
    const stacked = await nodes(page, 'stacked');
    expect(stacked.boxes.length).toBe(7);
    expect(Math.min(...stacked.boxes.map(b => b.x))).toBe(stacked.boxes.find(b => b.id === 'm')!.x);
});

test('the page\'s tokens colour it: a dark look changes the fills and the text', async ({ page }) => {
    await open(page);
    const colours = () => page.locator('#org').evaluate(el => {
        const r = el.shadowRoot!;
        const fill = (sel: string) => getComputedStyle(r.querySelector(sel)!).fill;
        return { top: fill('g.node[data-id="ceo"] rect'), second: fill('g.node[data-id="ops"] rect'), own: fill('g.node[data-id="fin"] rect'), text: fill('g.node[data-id="ceo"] text'), line: getComputedStyle(r.querySelector('g.edge path')!).stroke };
    });
    const light = await colours();
    expect(light.own).toBe('rgb(192, 57, 43)'); // the node's own colour wins
    expect(light.top).not.toBe(light.second);
    await page.click('#dark');
    const dark = await colours();
    expect(dark.top).toBe('rgb(122, 162, 247)');
    expect(dark.second).toBe('rgb(158, 206, 106)');
    expect(dark.text).toBe('rgb(11, 15, 25)');
    expect(dark.line).toBe('rgb(75, 85, 99)');
    expect(dark.own).toBe(light.own);
});
