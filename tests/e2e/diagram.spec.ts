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

// A node's colours as [r, g, b]. A canvas reads any colour the browser computes (lch(), color(srgb …)), so these are what's painted.
const paint = (page: Page, id: string, node: string) => page.locator(`#${id}`).evaluate((el, node) => {
    const rgb = (text: string) => { const c = document.createElement('canvas').getContext('2d')!; c.fillStyle = text; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const g = el.shadowRoot!.querySelector(`g.node[data-id="${node}"]`)!;
    const icon = g.querySelector('svg.icon');
    return {
        fill: rgb(getComputedStyle(g.querySelector('.fill')!).fill),
        text: rgb(getComputedStyle(g.querySelector('text:not(.date)')!).fill),
        icon: icon ? rgb(getComputedStyle(icon).color) : null,
    };
}, node);
const channel = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const White = [255, 255, 255], Black = [0, 0, 0];
const Readable = 4; // The floor the rule gives: plain's indigo keeps its white, at 4.47:1.
/** Sets tokens on one diagram. They're CSS, so a change shows at once, with no redraw. */
const tokens = (page: Page, id: string, values: Record<string, string>) => page.locator(`#${id}`).evaluate((el, values) => {
    for (const [name, value] of Object.entries(values)) (el as HTMLElement).style.setProperty(name, value);
}, values);
/** Draws a model on one of the page's diagrams, and waits for the node named. */
const draw = async (page: Page, id: string, model: object, node: string) => {
    await page.locator(`#${id}`).evaluate((el, model) => { (el as any).data = model; }, model);
    await page.waitForFunction(([id, node]) => document.getElementById(id)!.shadowRoot!.querySelector(`g.node[data-id="${node}"]`), [id, node]);
};
const team = (own: Record<string, string> = {}) => ({ type: 'org', nodes: [
    { id: 'top', text: 'Top', icon: 'lucide-plus', colour: own.top },
    { id: 'left', text: 'Left', parent: 'top', colour: own.left },
    { id: 'right', text: 'Right', parent: 'top' },
].map(n => JSON.parse(JSON.stringify(n))) });

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
    // The second looks: chevrons are polygons with no arrows between; cards are pale rects with a band.
    expect(await page.locator('#chevrons').evaluate(el => { const r = el.shadowRoot!; return { chevrons: r.querySelectorAll('polygon.chevron').length, arrows: r.querySelectorAll('g.edge').length, cls: r.querySelector('svg')!.getAttribute('class') }; })).toEqual({ chevrons: 4, arrows: 0, cls: 'process look-chevrons' });
    expect(await page.locator('#cards').evaluate(el => { const r = el.shadowRoot!; return { cards: r.querySelectorAll('rect.card').length, bands: r.querySelectorAll('path.band').length, text: getComputedStyle(r.querySelector('g.node text')!).fill }; })).toEqual({ cards: 7, bands: 7, text: 'rgb(31, 36, 48)' });
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
    // A node's icon: a bundled Lucide glyph, inline, in the text colour.
    expect(await page.locator('#org').evaluate(el => { const i = el.shadowRoot!.querySelector('g.node[data-id="ceo"] svg.icon'); return i ? { paths: i.querySelectorAll('path, line, circle, polyline, polygon, rect').length > 0, color: !!getComputedStyle(i).color } : null; })).toEqual({ paths: true, color: true });
    expect((await paint(page, 'org', 'ceo')).icon).toEqual(White);
    const light = await colours();
    expect(light.own).toBe('rgb(192, 57, 43)'); // the node's own colour wins
    expect(light.top).not.toBe(light.second);
    await page.click('#dark');
    const dark = await colours();
    expect(dark.top).toBe('rgb(122, 162, 247)');
    expect(dark.second).toBe('rgb(158, 206, 106)');
    expect(dark.text).toBe('rgb(11, 15, 25)');
    expect(dark.line).toBe('rgb(181, 188, 201)'); // --diagram-edge: the page's --muted, as --line is a hairline
    expect(dark.own).toBe(light.own);
});

test('the text on a box reads on any fill, and follows a change of theme with no redraw', async ({ page }) => {
    await open(page);
    const first = (await nodes(page, 'process')).boxes[0].id!;
    // The five themes' accents. Plain's and report's stay white, as they were; the three light ones turn dark.
    for (const [theme, accent, text] of [['plain', '#6366f1', White], ['report', '#2563eb', White], ['dark', '#7c9cff', Black], ['dusk', '#ffd166', Black], ['cinema', '#f5c518', Black]] as const) {
        await tokens(page, 'process', { '--chart-1': accent });
        expect((await paint(page, 'process', first)).text, theme).toEqual(text);
    }
    // Any colour a brand might choose.
    const levels = ['00', '55', 'aa', 'ff'];
    for (const r of levels) for (const g of levels) for (const b of levels) {
        await tokens(page, 'process', { '--chart-1': `#${r}${g}${b}` });
        const seen = await paint(page, 'process', first);
        expect(seen.fill, 'the test set the fill it meant to').toEqual([parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)]);
        const ratio = contrast(seen.text, seen.fill);
        expect(ratio, `text on #${r}${g}${b}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(Readable);
    }
    // Colours that aren't plain hex; a translucent fill's text is still solid.
    for (const colour of ['oklch(0.9 0.15 90)', 'color-mix(in srgb, #ffd166 70%, #ffffff)', 'hsl(50 100% 60%)', 'rgb(255 209 102 / .5)']) {
        await tokens(page, 'process', { '--chart-1': colour });
        expect((await paint(page, 'process', first)).text, colour).toEqual(Black);
    }
});

test('each box works out its own text: depth, kind, icon and own colour', async ({ page }) => {
    await open(page);
    // Two depths in one drawing: a dark fill above a light one.
    await tokens(page, 'org', { '--chart-1': '#123456', '--chart-2': '#ffd166' });
    await draw(page, 'org', team(), 'top');
    expect(await paint(page, 'org', 'top')).toEqual({ fill: [18, 52, 86], text: White, icon: White });
    expect((await paint(page, 'org', 'left')).text).toEqual(Black);
    // A node's own colour wins over the theme's fill, and the text and icon follow it.
    await draw(page, 'org', team({ top: '#fff176', left: '#1a237e' }), 'top');
    expect(await paint(page, 'org', 'top')).toEqual({ fill: [255, 241, 118], text: Black, icon: Black });
    expect(await paint(page, 'org', 'left')).toMatchObject({ fill: [26, 35, 126], text: White });
    // A flowchart's decision takes the second colour, and a decision's own colour wins too.
    await tokens(page, 'flowchart', { '--chart-1': '#123456', '--chart-2': '#ffd166' });
    const flow = await page.locator('#flowchart').evaluate(el => JSON.parse(JSON.stringify((el as any).data)));
    flow.nodes[1].shape = 'decision';
    await draw(page, 'flowchart', flow, flow.nodes[1].id);
    expect(await paint(page, 'flowchart', flow.nodes[1].id)).toMatchObject({ fill: [255, 209, 102], text: Black });
    flow.nodes[1].colour = '#1a237e';
    await draw(page, 'flowchart', { ...flow, nodes: flow.nodes.map((n: object) => ({ ...n })) }, flow.nodes[1].id);
    await page.waitForFunction(id => document.getElementById('flowchart')!.shadowRoot!.querySelector(`g.node.own[data-id="${id}"]`), flow.nodes[1].id);
    expect(await paint(page, 'flowchart', flow.nodes[1].id)).toMatchObject({ fill: [26, 35, 126], text: White });
    // A timeline's cards keep the page's ink. One with its own colour reads on that, and its date, on the page, keeps the ink.
    await draw(page, 'timeline', { type: 'timeline', nodes: [{ id: 'one', text: 'One', date: '2020', colour: '#1a237e' }, { id: 'two', text: 'Two', date: '2021' }] }, 'one');
    expect(await paint(page, 'timeline', 'one')).toMatchObject({ fill: [26, 35, 126], text: White });
    expect((await paint(page, 'timeline', 'two')).text).toEqual([31, 36, 48]);
    expect(await page.locator('#timeline').evaluate(el => getComputedStyle(el.shadowRoot!.querySelector('g.node[data-id="one"] .date')!).fill)).toBe('rgb(31, 36, 48)');
    // An org chart's cards keep the ink too: their text is on the card, whatever colours the band.
    await draw(page, 'cards', { ...team({ top: '#1a237e' }), options: { look: 'cards' } }, 'top');
    expect((await paint(page, 'cards', 'top')).text).toEqual([31, 36, 48]);
});

test('a page\'s own --chart-on-fill wins on the page\'s fills, but not on a node\'s own colour', async ({ page }) => {
    await open(page);
    await tokens(page, 'org', { '--chart-1': '#ffd166', '--chart-on-fill': '#7a0000' });
    await draw(page, 'org', team({ left: '#1a237e' }), 'top');
    expect((await paint(page, 'org', 'top')).text, 'the page\'s choice, though the rule alone would say black').toEqual([122, 0, 0]);
    expect((await paint(page, 'org', 'left')).text, 'the page chose its token for its own fills').toEqual(White);
});
