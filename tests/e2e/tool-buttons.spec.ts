// Plain tool buttons with Lucide icons (src/_Modules/Icons/Lucide.ts) and the
// pressed state (juel-button `pressed` / `toggle`), on examples/Buttons/Button/tool-buttons.html.
import { expect, Page, test } from '@playwright/test';

const inner = (page: Page, id: string) => page.locator(`#${id}`).evaluate(el => {
    const button = el.shadowRoot!.querySelector('button')!;
    const icon = button.querySelector('.icon') as HTMLElement | null;
    const style = getComputedStyle(button);
    return {
        pressed: button.getAttribute('aria-pressed'),
        background: style.backgroundColor,
        mask: icon ? getComputedStyle(icon).maskImage || (getComputedStyle(icon) as any).webkitMaskImage : null,
        iconWidth: icon ? icon.getBoundingClientRect().width : 0,
    };
});

async function open(page: Page, query = '') {
    await page.goto(`examples/Buttons/Button/tool-buttons.html${query}`);
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.locator('#bold').evaluate(el => (el as any).updateComplete);
}

test('a Lucide glyph shows as the icon', async ({ page }) => {
    await open(page);
    const bold = await inner(page, 'bold');
    expect(bold.mask).toMatch(/^url\("?data:image\/svg/);
    expect(bold.iconWidth).toBe(16);
    // An unknown glyph name has no icon image.
    await page.locator('#link').evaluate(el => { (el as any).glyph = 'lucide-no-such-icon'; return (el as any).updateComplete; });
    expect((await inner(page, 'link')).mask).toBe('none');
});

test('caret: a chevron after the content, only when asked for', async ({ page }) => {
    await open(page);
    const caret = (id: string) => page.locator(`#${id}`).evaluate(el => {
        const c = el.shadowRoot!.querySelector('button .caret') as HTMLElement | null;
        return c ? { mask: getComputedStyle(c).maskImage || (getComputedStyle(c) as any).webkitMaskImage, width: c.getBoundingClientRect().width } : null;
    });
    const insert = await caret('insert');
    expect(insert?.mask).toMatch(/^url\("?data:image\/svg/);
    expect(insert?.width).toBe(12);
    expect(await caret('image')).toBeNull();
});

test('pressed: aria-pressed and a fill; toggle says false when off, a plain button says nothing', async ({ page }) => {
    await open(page);
    const off = await inner(page, 'bold');
    expect(off.pressed).toBe('false');
    expect(off.background).toBe('rgba(0, 0, 0, 0)');
    expect((await inner(page, 'italic')).pressed).toBe('true');
    expect((await inner(page, 'link')).pressed).toBeNull();
    await page.locator('#bold').click();
    await page.mouse.move(0, 0);
    const on = await inner(page, 'bold');
    expect(on.pressed).toBe('true');
    expect(on.background).not.toBe('rgba(0, 0, 0, 0)');
    await expect(page.locator('#bold')).toHaveAttribute('pressed', '');
});
