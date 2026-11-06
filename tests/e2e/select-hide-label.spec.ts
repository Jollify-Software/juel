// juel-select `hide-label`: the words leave the page, and still name the list. Any page with Juel will do.
import { expect, test } from '@playwright/test';

test('hide-label: no label on the page; the select keeps its accessible name', async ({ page }) => {
    await page.goto('examples/Layout/Mdi/chrome.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const result = await page.evaluate(async () => {
        const make = async (hidden: boolean) => {
            const select = document.createElement('juel-select') as any;
            select.label = 'Page';
            select.hideLabel = hidden;
            document.body.append(select);
            await select.updateComplete;
            const root = select.shadowRoot as ShadowRoot;
            return { label: root.querySelector('label')?.textContent ?? null, name: root.querySelector('select')!.getAttribute('aria-label') };
        };
        return { shown: await make(false), hidden: await make(true) };
    });
    expect(result.shown).toEqual({ label: 'Page', name: null });
    expect(result.hidden).toEqual({ label: null, name: 'Page' });
});
