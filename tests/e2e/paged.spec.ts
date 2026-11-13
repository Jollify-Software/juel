// <juel-paged> on examples/Display/Paged/paged.html: a Word document Slipway read (memo.docx: a page break, a header
// with its page number) and a long table split over pages with its header row repeated; the same interface as
// <juel-pdf> (page, next/previous, getView/setView, the juel-pdf-* events); a held-back one lays nothing out.
import { expect, test, type Page } from '@playwright/test';

const Url = 'examples/Display/Paged/paged.html';
const laidOut = (page: Page, id: string) => page.evaluate(id => (document.getElementById(id) as any).loaded, id);
/** The text of page `n` of element `id` (the pages are in its shadow root), a line per paragraph or cell. */
const pageText = (page: Page, id: string, n: number) => page.evaluate(([id, n]) => {
    const p = document.getElementById(id as string)!.shadowRoot!.querySelectorAll('.page')[(n as number) - 1];
    return p ? [...p.querySelectorAll('p, h1, h2, h3, td')].map(e => e.textContent?.trim() ?? '').join('\n') : '';
}, [id, n] as const);

test('paged: a Word document is two pages at its page break, its header numbering each', async ({ page }) => {
    await page.goto(Url);
    expect(await laidOut(page, 'memo')).toBe(true);
    expect(await page.evaluate(() => (document.getElementById('memo') as any).pageCount)).toBe(2);
    const first = await pageText(page, 'memo', 1);
    expect(first).toContain('Quarterly sales memo, page 1');
    expect(first).toContain('Review the South pipeline');
    expect(first).not.toContain('The second page starts here');
    const second = await pageText(page, 'memo', 2);
    expect(second).toContain('Quarterly sales memo, page 2');
    expect(second).toContain('The second page starts here');
    expect(second).toContain('Added later.');
    // Only the current page shows.
    expect(await page.evaluate(() => [...document.getElementById('memo')!.shadowRoot!.querySelectorAll('.page')].map(p => (p as HTMLElement).hidden))).toEqual([false, true]);
});

test('paged: a long table splits between rows, its header row on every page, page numbers in the footer', async ({ page }) => {
    await page.goto(Url);
    expect(await laidOut(page, 'long')).toBe(true);
    const count = await page.evaluate(() => (document.getElementById('long') as any).pageCount);
    expect(count).toBeGreaterThan(2);
    const rowsSeen: number[] = [];
    for (let n = 1; n <= count; n++) {
        const text = await pageText(page, 'long', n);
        expect(text).toContain(`Page ${n} of ${count}`);
        if (n > 1 && /^Row \d/m.test(text)) expect(text).toMatch(/^Row\nValue$/m);
        for (const m of text.matchAll(/^Row (\d+)$/gm)) rowsSeen.push(Number(m[1]));
    }
    // Every row once, in order: none lost or doubled at a split.
    expect(rowsSeen).toEqual(Array.from({ length: 80 }, (_, i) => i + 1));
    expect(await pageText(page, 'long', count)).toContain('After the table.');
});

test('paged: next, previous, clamping and the juel-pdf-page event, as <juel-pdf>', async ({ page }) => {
    await page.goto(Url);
    await laidOut(page, 'memo');
    await page.evaluate(() => {
        (window as any).turns = [];
        document.addEventListener('juel-pdf-page', e => (window as any).turns.push((e as CustomEvent).detail.page));
    });
    expect(await page.evaluate(() => (document.getElementById('memo') as any).next())).toBe(true);
    expect(await page.evaluate(() => (document.getElementById('memo') as any).next())).toBe(false);
    await page.evaluate(() => (document.getElementById('memo') as any).goTo(9));
    await page.waitForFunction(() => document.getElementById('memo')!.getAttribute('page') === '2');
    expect(await page.evaluate(() => (document.getElementById('memo') as any).previous())).toBe(true);
    expect(await page.evaluate(() => (window as any).turns)).toEqual([2, 1]);
    await page.evaluate(() => (document.getElementById('memo') as any).setView({ page: 2, zoom: 2, y: 0.5 }));
    const view = await page.evaluate(() => (document.getElementById('memo') as any).getView());
    expect([view.page, view.zoom, view.y > 0.3]).toEqual([2, 2, true]);
});

test('paged: held back, nothing is laid out until it is taken away', async ({ page }) => {
    await page.goto(Url);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend',
        '<juel-paged id="held" deferred alt="Held" style="height:200px"><template><p>One</p></template></juel-paged>'));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (document.getElementById('held') as any).pageCount)).toBe(0);
    await expect(page.locator('#held').locator('.placeholder')).toContainText('Held');
    await page.evaluate(() => document.getElementById('held')!.removeAttribute('deferred'));
    expect(await laidOut(page, 'held')).toBe(true);
    expect(await pageText(page, 'held', 1)).toContain('One');
});
