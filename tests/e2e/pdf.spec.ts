// <juel-pdf> on examples/Display/Pdf/pdf.html (pdf.js from dist/pdfjs, which `npm run test:browser` copies):
// pages draw, turn and clamp; `deferred` holds the load back; a missing file and a file that isn't a PDF say so;
// views go out as `juel-view-change` and come back with setView; the still is the drawn page.
import { expect, test, type Page } from '@playwright/test';

const Url = 'examples/Display/Pdf/pdf.html';

/** The colour in the middle of the element's drawn page. */
const middle = (page: Page, id: string) => page.evaluate(id => {
    const canvas = document.getElementById(id)!.shadowRoot!.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const [r, g, b] = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 4), 1, 1).data;
    return [r, g, b];
}, id);

const loaded = (page: Page, id: string) => page.evaluate(id => (document.getElementById(id) as any).loaded, id);

/** Red, blue, green: the sample's three pages. */
const near = (rgb: number[], want: number[]) => rgb.every((v, i) => Math.abs(v - want[i]) < 30);
const Red = [192, 57, 43], Blue = [36, 113, 163], Green = [30, 132, 73];

test('pdf: draws the first page, turns pages, clamps, and fires juel-pdf-page', async ({ page }) => {
    await page.goto(Url);
    expect(await loaded(page, 'controls')).toBe(true);
    expect(await page.evaluate(() => (document.getElementById('controls') as any).pageCount)).toBe(3);
    expect(near(await middle(page, 'controls'), Red)).toBe(true);
    await page.evaluate(() => {
        (window as any).turns = [];
        document.addEventListener('juel-pdf-page', e => (window as any).turns.push((e as CustomEvent).detail.page));
    });
    expect(await page.evaluate(() => (document.getElementById('controls') as any).next())).toBe(true);
    await page.waitForFunction(() => document.getElementById('controls')!.getAttribute('page') === '2');
    await expect.poll(async () => near(await middle(page, 'controls'), Blue)).toBe(true);
    await page.evaluate(() => (document.getElementById('controls') as any).goTo(99));
    await page.waitForFunction(() => document.getElementById('controls')!.getAttribute('page') === '3');
    await expect.poll(async () => near(await middle(page, 'controls'), Green)).toBe(true);
    expect(await page.evaluate(() => (document.getElementById('controls') as any).next())).toBe(false);
    expect(await page.evaluate(() => (window as any).turns)).toEqual([2, 3]);
    // The controls' count and buttons.
    const count = page.locator('#controls').locator('.count');
    await expect(count).toHaveText('3 / 3');
    await page.locator('#controls').getByRole('button', { name: 'Previous page' }).click();
    await expect(count).toHaveText('2 / 3');
});

test('pdf: page="2" starts there; fit="width" fills the width', async ({ page }) => {
    await page.goto(Url);
    expect(await loaded(page, 'width')).toBe(true);
    expect(near(await middle(page, 'width'), Blue)).toBe(true);
    const [canvasWidth, boxWidth] = await page.evaluate(() => {
        const el = document.getElementById('width')!;
        const scroller = el.shadowRoot!.querySelector('.scroller') as HTMLElement;
        return [parseFloat(el.shadowRoot!.querySelector('canvas')!.style.width), scroller.clientWidth];
    });
    expect(Math.abs(canvasWidth - boxWidth)).toBeLessThan(2);
});

test('pdf: deferred loads nothing until it is taken away, and keeps its page when it comes back', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', r => requests.push(r.url()));
    await page.goto(Url);
    await loaded(page, 'controls');
    expect(await page.evaluate(() => document.getElementById('deferred')!.shadowRoot!.querySelector('canvas')!.width)).toBe(0);
    await page.click('#show');
    expect(await loaded(page, 'deferred')).toBe(true);
    expect(near(await middle(page, 'deferred'), Red)).toBe(true);
    await page.evaluate(() => document.getElementById('deferred')!.setAttribute('deferred', ''));
    await page.waitForTimeout(100);
    // Held back again: the document is let go, its last page stays on show.
    expect(near(await middle(page, 'deferred'), Red)).toBe(true);
    expect(requests.some(u => u.endsWith('/dist/pdfjs/pdf.min.mjs'))).toBe(true);
    expect(requests.filter(u => u.endsWith('/dist/pdfjs/pdf.min.mjs'))).toHaveLength(1);
});

test('pdf: a missing file and a file that is not a PDF say so', async ({ page }) => {
    await page.goto(Url);
    expect(await loaded(page, 'missing')).toBe(false);
    expect(await loaded(page, 'notpdf')).toBe(false);
    await expect(page.locator('#missing').locator('.message')).toContainText("A missing report wasn't found.");
    await expect(page.locator('#notpdf').locator('.message')).toContainText("couldn't be read as a PDF");
});

test('pdf: zoom and scroll go out as juel-view-change; setView puts them back quietly; the still is the page', async ({ page }) => {
    await page.goto(Url);
    await loaded(page, 'controls');
    await page.evaluate(() => {
        (window as any).views = [];
        document.addEventListener('juel-view-change', e => (window as any).views.push((e as CustomEvent).detail));
    });
    await page.locator('#controls').locator('.scroller').focus();
    await page.keyboard.press('+');
    await expect.poll(() => page.evaluate(() => (window as any).views.length)).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as any).views.at(-1).zoom)).toBeCloseTo(1.25, 2);
    await page.evaluate(() => { (window as any).views = []; });
    await page.evaluate(() => (document.getElementById('controls') as any).setView({ page: 3, zoom: 2, x: 0.5, y: 0.5 }));
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => (window as any).views.length)).toBe(0);
    const view = await page.evaluate(() => (document.getElementById('controls') as any).getView());
    expect(view.page).toBe(3);
    expect(view.zoom).toBe(2);
    expect(view.y).toBeGreaterThan(0.3);
    const still = await page.evaluate(() => (document.getElementById('controls') as any).still);
    expect(still.startsWith('data:image/png;base64,')).toBe(true);
});

test('pdf: the file viewer shows a PDF with <juel-pdf> where the page says where pdf.js is', async ({ page }) => {
    await page.goto(Url);
    await page.evaluate(async () => {
        const { MemoryFileStorage } = (window as any).juel.files;
        const storage = new MemoryFileStorage();
        const blob = await (await fetch('../../_Assets/sample.pdf')).blob();
        await storage.write('Reports/q3.pdf', new Blob([blob], { type: 'application/pdf' }));
        const record = await storage.stat('Reports/q3.pdf');
        const viewer = document.createElement('juel-file-viewer') as any;
        document.body.appendChild(viewer);
        await viewer.show(storage, [record], 0);
    });
    const pdf = page.locator('juel-file-viewer juel-pdf');
    await expect(pdf).toHaveAttribute('controls', '');
    await expect(pdf.locator('.count')).toHaveText('1 / 3');
    await expect(page.locator('juel-file-viewer iframe')).toHaveCount(0);
});
