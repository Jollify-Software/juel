// Juel's opt-in look (src/_Modules/Theme/ThemeLook.ts), on its example page
// (examples/Theme/look.html): off by default, light and dark when opted in.
import { expect, Page, test } from '@playwright/test';

const background = (page: Page, id: string) => page.locator(`#${id}`).evaluate(el =>
    getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor);

const menuBackground = (page: Page) => page.locator('#menu').evaluate(el =>
    getComputedStyle(el.shadowRoot!.querySelector('[part="content"]')!).backgroundColor);

const toolbarBackground = (page: Page) => page.locator('#toolbar').evaluate(el => getComputedStyle(el).backgroundColor);

const modalBackground = (page: Page) => page.locator('#modal').evaluate(el =>
    getComputedStyle(el.shadowRoot!.querySelector('dialog')!).backgroundColor);

const inner = (page: Page, id: string, selector: string, prop = 'backgroundColor') => page.locator(`#${id}`).evaluate(
    (el, [selector, prop]) => (getComputedStyle(el.shadowRoot!.querySelector(selector)!) as any)[prop], [selector, prop]);

// The other app-facing components: text and number inputs, a tab, an mdi pane title.
const others = async (page: Page) => ({
    text: await inner(page, 'text', 'input'),
    number: await inner(page, 'number', 'input'),
    tab: await inner(page, 'tabs', '.tab:not([selected])'),
    selectedTab: await inner(page, 'tabs', '.tab[selected]'),
    pane: await inner(page, 'mdi', '.pane-title'),
    gutter: await page.locator('#mdi').evaluate(el => {
        const g = el.shadowRoot?.querySelector('.gutter') ?? el.querySelector('.gutter');
        return g ? getComputedStyle(g).backgroundColor : 'no gutter';
    }),
});

async function open(page: Page, query = '') {
    await page.goto(`examples/Theme/look.html${query}`);
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.locator('#light').evaluate(el => (el as any).updateComplete);
}

test('without the opt-in, buttons keep their colours, in either colour scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const before = { light: await background(page, 'light'), primary: await background(page, 'primary'), menu: await menuBackground(page), toolbar: await toolbarBackground(page), modal: await modalBackground(page), others: await others(page) };
    expect(before.menu).toBe('rgb(255, 255, 255)');
    expect(before.others.gutter).toBe('rgb(238, 238, 238)');
    expect(await page.locator('#juel-look-tokens').count()).toBe(0);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await background(page, 'light')).toBe(before.light);
    expect(await background(page, 'primary')).toBe(before.primary);
    expect(await menuBackground(page)).toBe(before.menu);
    expect(await toolbarBackground(page)).toBe(before.toolbar);
    expect(await modalBackground(page)).toBe(before.modal);
    expect(await others(page)).toEqual(before.others);
    // Choosing light or dark without the look changes nothing either.
    await page.click('#to-dark');
    expect(await background(page, 'light')).toBe(before.light);
});

test('opted in: the tokens, light and dark, following the system unless chosen', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const plain = await background(page, 'light');
    await open(page, '?look');
    const light = await background(page, 'light');
    expect(light).toBe('rgb(247, 247, 248)');
    expect(light).not.toBe(plain);
    expect(await background(page, 'primary')).toBe('rgb(244, 128, 60)');
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await background(page, 'light')).toBe('rgb(38, 39, 43)');
    expect(await menuBackground(page)).toBe('rgb(30, 31, 34)');
    expect(await toolbarBackground(page)).toBe('rgb(30, 31, 34)');
    expect(await modalBackground(page)).toBe('rgb(30, 31, 34)');
    // Tabs fade their background (a 0.2s transition), so wait for it to settle.
    await expect.poll(() => others(page)).toEqual({ text: 'rgb(30, 31, 34)', number: 'rgb(30, 31, 34)', tab: 'rgb(38, 39, 43)', selectedTab: 'rgb(44, 63, 102)', pane: 'rgb(38, 39, 43)', gutter: 'rgb(20, 21, 23)' });
    await page.click('#to-light');
    expect(await background(page, 'light')).toBe('rgb(247, 247, 248)');
    await page.click('#to-system');
    expect(await background(page, 'light')).toBe('rgb(38, 39, 43)');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.click('#to-dark');
    expect(await background(page, 'light')).toBe('rgb(38, 39, 43)');
    // And off again: back to how it looked before.
    await page.click('#to-system');
    await page.click('#look');
    expect(await background(page, 'light')).toBe(plain);
});

test('a focused juel-text: its ring follows the look\'s accent only when opted in', async ({ page }) => {
    const ring = async () => { await page.locator('#text input').focus(); return inner(page, 'text', 'input', 'outlineColor'); };
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const plain = await ring();
    expect(plain).not.toBe('rgb(244, 128, 60)');
    await open(page, '?look');
    expect(await ring()).toBe('rgb(244, 128, 60)');
});

test('a checked juel-check: accent fill and a dark tick only when opted in', async ({ page }) => {
    const check = () => page.locator('#check').evaluate(el => {
        const input = el.shadowRoot!.querySelector('input')!;
        return { fill: getComputedStyle(input).backgroundColor, tick: getComputedStyle(input, '::after').backgroundColor };
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const plain = await check();
    expect(plain.fill).not.toBe('rgb(244, 128, 60)');
    expect(plain.tick).toBe('rgb(255, 255, 255)');
    await open(page, '?look');
    // The box fades its colours (a 0.2s transition), so wait for it to settle.
    await expect.poll(check).toEqual({ fill: 'rgb(244, 128, 60)', tick: 'rgb(31, 19, 0)' });
});

test('a button\'s wrapper ring matches its own border only when opted in', async ({ page }) => {
    const rings = () => page.evaluate(() => ['light', 'primary'].map(id => {
        const root = document.getElementById(id)!.shadowRoot!;
        return [getComputedStyle(root.querySelector('.input-group')!).borderTopColor,
            getComputedStyle(root.querySelector('button')!).borderTopColor];
    }));
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    // Today: the darkened Bootstrap colours, not the button's border.
    expect(await rings()).toEqual([['rgb(188, 198, 207)', 'rgb(248, 249, 250)'], ['rgb(0, 74, 153)', 'rgb(0, 123, 255)']]);
    await open(page, '?look');
    expect(await rings()).toEqual([['rgb(217, 219, 224)', 'rgb(217, 219, 224)'], ['rgb(244, 128, 60)', 'rgb(244, 128, 60)']]);
});

test('juel-file-manager takes the look colours only when opted in', async ({ page }) => {
    const files = () => page.locator('#files').evaluate(el => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, accent: s.getPropertyValue('--_accent').trim() };
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    // Today: its own dark colours (ThemeModule's init() sets data-theme="dark" from the system).
    expect(await files()).toEqual({ background: 'rgb(31, 31, 31)', accent: '#5aa9f0' });
    await open(page, '?look');
    expect(await files()).toEqual({ background: 'rgb(30, 31, 34)', accent: '#F4803C' });
    await open(page, '?look&theme=light');
    expect(await files()).toEqual({ background: 'rgb(255, 255, 255)', accent: '#F4803C' });
});

test('juel-file-picker: its panel and Open button take the look colours only when opted in', async ({ page }) => {
    const panel = async () => {
        await page.locator('#picker').evaluate(el => { (el as any).pick(); });
        const colours = {
            background: await page.locator('#picker .panel').evaluate(el => getComputedStyle(el).backgroundColor),
            open: await page.locator('#picker footer .primary').evaluate(el => getComputedStyle(el).backgroundColor),
        };
        await page.keyboard.press('Escape');
        return colours;
    };
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    expect(await panel()).toEqual({ background: 'rgb(31, 31, 31)', open: 'rgb(15, 108, 189)' });
    await open(page, '?look');
    expect(await panel()).toEqual({ background: 'rgb(30, 31, 34)', open: 'rgb(244, 128, 60)' });
});
