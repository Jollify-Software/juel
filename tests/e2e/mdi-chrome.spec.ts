// juel-mdi `chrome="minimal"` and `collapsible`, on examples/Layout/Mdi/chrome.html.
// The first instance has neither, and must look and behave as it always did.
import { expect, Page, test } from '@playwright/test';

async function open(page: Page) {
    await page.goto('examples/Layout/Mdi/chrome.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.waitForFunction(() => ['full', 'minimal'].every(id =>
        document.getElementById(id)!.shadowRoot!.querySelectorAll('.pane').length === 3));
}

const panes = (page: Page, id: string) => page.locator(`#${id}`).evaluate(mdi => {
    const root = mdi.shadowRoot!;
    const title = root.querySelector('.pane-title') as HTMLElement;
    return {
        panes: root.querySelectorAll('.pane').length,
        strips: [...root.querySelectorAll('.collapsed-strip')].map(s => (s as HTMLElement).className),
        minimise: root.querySelectorAll('.minimize-button').length,
        collapse: [...root.querySelectorAll('.collapse-button')].map(b => (b as any).glyph),
        weight: getComputedStyle(title).fontWeight,
        maximiseOpacity: getComputedStyle(root.querySelector('.maximize-button')!).opacity,
    };
});

test('without chrome or collapsible: today\'s title bars', async ({ page }) => {
    await open(page);
    const full = await panes(page, 'full');
    expect(full.minimise).toBe(3);
    expect(full.collapse).toEqual([]);
    expect(full.weight).toBe('700');
    expect(full.maximiseOpacity).toBe('1');
});

test('minimal chrome: no minimise button, maximise only on hover', async ({ page }) => {
    await open(page);
    const min = await panes(page, 'minimal');
    expect(min.minimise).toBe(0);
    expect(min.weight).toBe('600');
    expect(min.maximiseOpacity).toBe('0');
    // Only the side panes collapse, each towards its own side.
    expect(min.collapse).toEqual(['lucide-panel-left', 'lucide-panel-right']);
    await page.hover('#minimal >> .pane-title >> nth=1');
    await expect.poll(() => page.locator('#minimal').evaluate(mdi =>
        getComputedStyle(mdi.shadowRoot!.querySelectorAll('.maximize-button')[1]).opacity)).toBe('1');
});

test('collapsible: a side pane folds to a strip and back, and the layout keeps it', async ({ page }) => {
    await open(page);
    const mdi = page.locator('#minimal');
    expect(await mdi.evaluate((m: any) => m.collapsePanel('min-b'))).toBe(false); // the middle pane can't
    expect(await page.locator('#full').evaluate((m: any) => m.collapsePanel('full-a'))).toBe(false); // not collapsible

    await page.click('#minimal >> .collapse-button >> nth=0');
    await expect.poll(() => panes(page, 'minimal').then(p => p.strips)).toEqual(['collapsed-strip left']);
    expect((await panes(page, 'minimal')).panes).toBe(2);
    expect(await mdi.evaluate((m: any) => m.isCollapsed('min-a'))).toBe(true);
    const width = await mdi.evaluate(m => m.shadowRoot!.querySelector('.collapsed-strip')!.getBoundingClientRect().width);
    expect(width).toBe(32);
    const layout = await mdi.evaluate((m: any) => m.getLayout());
    expect(layout.collapsed).toEqual(['min-a']);

    await page.click('#minimal >> .expand-button');
    await expect.poll(() => panes(page, 'minimal').then(p => p.panes)).toBe(3);
    expect(await mdi.evaluate((m: any) => m.getLayout().collapsed)).toBeUndefined();

    // A saved layout brings the collapsed side back.
    await mdi.evaluate((m: any, l) => m.setLayout(l), layout);
    await expect.poll(() => panes(page, 'minimal').then(p => p.strips)).toEqual(['collapsed-strip left']);
});

test('collapsible: clicking anywhere on the strip (not just the icon) expands the pane', async ({ page }) => {
    await open(page);
    const mdi = page.locator('#minimal');
    const events: string[] = [];
    await page.exposeFunction('onExpanded', (id: string) => events.push(id));
    await mdi.evaluate(m => m.addEventListener('panel-expanded', (e: any) => (window as any).onExpanded(e.detail.id)));

    await page.click('#minimal >> .collapse-button >> nth=0');
    await expect.poll(() => panes(page, 'minimal').then(p => p.strips)).toEqual(['collapsed-strip left']);
    // The whole strip reads as clickable.
        expect(await mdi.evaluate(m => getComputedStyle(m.shadowRoot!.querySelector('.collapsed-strip')!).cursor)).toBe('pointer');

    // Click the vertical title, well away from the expand icon.
    await page.click('#minimal >> .collapsed-title');
    await expect.poll(() => panes(page, 'minimal').then(p => p.panes)).toBe(3);
    expect(await mdi.evaluate((m: any) => m.isCollapsed('min-a'))).toBe(false);
    await expect.poll(() => events).toEqual(['min-a']);

    // And the empty space below the title.
    await page.click('#minimal >> .collapse-button >> nth=0');
    await expect.poll(() => panes(page, 'minimal').then(p => p.strips)).toEqual(['collapsed-strip left']);
    const strip = page.locator('#minimal >> .collapsed-strip');
    const box = (await strip.boundingBox())!;
    await strip.click({ position: { x: box.width / 2, y: box.height - 8 } });
    await expect.poll(() => panes(page, 'minimal').then(p => p.panes)).toBe(3);

    // The expand button still works from the keyboard, and fires the event once.
    await page.click('#minimal >> .collapse-button >> nth=0');
    await expect.poll(() => panes(page, 'minimal').then(p => p.strips)).toEqual(['collapsed-strip left']);
    events.length = 0;
    await mdi.evaluate(m => (m.shadowRoot!.querySelector('.expand-button') as any).focus());
    await page.keyboard.press('Enter');
    await expect.poll(() => panes(page, 'minimal').then(p => p.panes)).toBe(3);
    await expect.poll(() => events).toEqual(['min-a']);
});

test('data-title-hidden: the title bar leaves the words out; the buttons and the collapsed strip keep them', async ({ page }) => {
    await open(page);
    const result = await page.evaluate(async () => {
        const mdi = document.createElement('juel-mdi') as any;
        mdi.setAttribute('order', 'row');
        mdi.setAttribute('collapsible', '');
        mdi.setAttribute('chrome', 'minimal');
        mdi.style.height = '200px';
        mdi.innerHTML = `<div id="tool-a" data-title="Named" data-title-hidden data-closable="false">A</div>
            <button data-header-for="tool-a">Gear</button>
            <div id="tool-b" data-title="Shown" data-closable="false">B</div>
            <div id="tool-c" data-title="Third" data-closable="false">C</div>`;
        document.body.append(mdi);
        await mdi.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 100));
        await mdi.updateComplete;
        const root = mdi.shadowRoot as ShadowRoot;
        const titles = [...root.querySelectorAll('.pane-title-text')].map(t => t.textContent);
        const hidden = root.querySelector('.pane[data-panel-id="tool-a"]')!;
        const header = hidden.querySelector('slot[name="header-tool-a"]') !== null;
        const button = hidden.querySelector('.collapse-button') as HTMLElement | null;
        const buttonName = button?.getAttribute('button-label') ?? button?.getAttribute('title') ?? '';
        mdi.collapsePanel('tool-a');
        await mdi.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 100));
        const strip = root.querySelector('.collapsed-strip')?.textContent ?? '';
        const stripName = root.querySelector('.collapsed-strip juel-button, .collapsed-strip button')?.getAttribute('title') ?? '';
        return { titles, header, buttonName, strip: `${strip} ${stripName}` };
    });
    expect(result.titles).toEqual(['Shown', 'Third']);
    expect(result.header).toBe(true);
    expect(result.buttonName).toContain('Named');
    expect(result.strip).toContain('Named');
});

test('data-hidden: a panel out of the layout and back, panes and phone tabs', async ({ page }) => {
    await open(page);
    const state = () => page.locator('#hide').evaluate(mdi => ({
        panes: mdi.shadowRoot!.querySelectorAll('.pane').length,
        designerShown: !!document.getElementById('hide-b')!.assignedSlot,
        designerInPage: !!document.getElementById('hide-b'),
    }));
    await page.waitForFunction(() => document.getElementById('hide')!.shadowRoot!.querySelectorAll('.pane').length === 1);
    let s = await state();
    expect(s).toMatchObject({ panes: 1, designerShown: false, designerInPage: true });
    await page.locator('#hide-b').evaluate(el => el.removeAttribute('data-hidden'));
    await page.waitForFunction(() => document.getElementById('hide')!.shadowRoot!.querySelectorAll('.pane').length === 2);
    s = await state();
    expect(s.designerShown).toBe(true);
    await page.locator('#hide-b').evaluate(el => el.setAttribute('data-hidden', ''));
    await page.waitForFunction(() => document.getElementById('hide')!.shadowRoot!.querySelectorAll('.pane').length === 1);
    // Control: the first instance, with nothing hidden, still has its three panes.
    expect(await page.locator('#full').evaluate(m => m.shadowRoot!.querySelectorAll('.pane').length)).toBe(3);
    // Phone width: tabs, and the hidden panels aren't among them.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => !!document.getElementById('hide')!.shadowRoot!.querySelector('juel-tab'));
    const titles = await page.locator('#hide').evaluate(mdi =>
        [...mdi.shadowRoot!.querySelectorAll('juel-tab')].map(t => t.getAttribute('title')));
    expect(titles).toEqual(['Writer']);
    // Control: the unhidden instance's tabs are all three.
    expect(await page.locator('#full').evaluate(mdi => mdi.shadowRoot!.querySelectorAll('juel-tab').length)).toBe(3);
});
