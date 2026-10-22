// juel-card's own box, on examples/Display/Card/card.html.
import { expect, test } from '@playwright/test';

test('card: the box has its border and rounded corners (a typo in the background line used to drop the border)', async ({ page }) => {
    await page.goto('examples/Display/Card/card.html');
    await page.waitForFunction(() => customElements.get('juel-card') && document.querySelector('juel-card')?.shadowRoot?.querySelector('.card'));
    const box = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('juel-card')!.shadowRoot!.querySelector('.card')!);
        return { width: s.borderTopWidth, style: s.borderTopStyle, colour: s.borderTopColor, radius: s.borderTopLeftRadius };
    });
    expect(box).toEqual({ width: '1px', style: 'solid', colour: 'rgb(224, 224, 224)', radius: '8px' });
});

test('card: its box and sections are parts, so a page can stretch the box and hide the header and footer', async ({ page }) => {
    await page.goto('examples/Display/Card/card.html');
    await page.waitForFunction(() => document.querySelector('#tile')?.shadowRoot?.querySelector('[part="card"]'));
    const tile = await page.evaluate(() => {
        const root = document.querySelector('#tile')!.shadowRoot!;
        const style = (part: string) => getComputedStyle(root.querySelector(`[part="${part}"]`)!);
        return {
            parts: [...root.querySelectorAll('[part]')].map(e => e.getAttribute('part')),
            border: style('card').borderTopColor, display: style('card').display,
            header: style('header').display, footer: style('footer').display, width: root.querySelector('[part="card"]')!.getBoundingClientRect().width,
        };
    });
    expect(tile).toEqual({ parts: ['card', 'header', 'image', 'body', 'footer'], border: 'rgb(59, 111, 216)', display: 'flex', header: 'none', footer: 'none', width: 220 });
    // Without ::part rules, a card is as before: header and footer shown.
    const plain = await page.evaluate(() => getComputedStyle(document.querySelector('juel-card')!.shadowRoot!.querySelector('[part="header"]')!).display);
    expect(plain).toBe('flex');
});
