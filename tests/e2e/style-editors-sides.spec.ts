// juel-sides-editor, juel-border-editor and juel-shadow-editor kind="text" (night 19 B2–B4), on their
// example pages. Each page applies the editor's { set, clear } to an element and passes the
// declarations back, as an app's style panel would.
// Control: CONTROL=1 sends Escape instead of each Enter/click that should change something (the
// sides and border tests FAIL) and puts the text-shadow editor back in box mode (its test FAILs).
import { expect, test, type Page } from '@playwright/test';

const control = !!process.env.CONTROL;
const declarations = (page: Page) => page.evaluate(() => {
    const text = document.getElementById('css')!.textContent!;
    return Object.fromEntries(text.split('\n').filter(Boolean).map(l => { const [n, ...v] = l.replace(/;$/, '').split(': '); return [n, v.join(': ')]; }));
});
const commit = async (page: Page) => page.keyboard.press(control ? 'Escape' : 'Enter');
const click = async (page: Page, locator: ReturnType<Page['locator']>) => { if (control) await page.keyboard.press('Escape'); else await locator.click(); };

test('sides editor: one side, then all, then auto; the shortest CSS and leftovers cleared', async ({ page }) => {
    await page.goto('examples/Editors/Style/SidesEditor/sides-editor.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const padding = page.locator('#padding');
    await padding.locator('button.place[data-place="top"]').click();
    await expect(padding.locator('button.place[data-place="top"]')).toHaveAttribute('aria-checked', 'true');
    await padding.locator('juel-number.size input#number-input').fill('20px');
    await commit(page);
    expect(await declarations(page)).toEqual({ padding: '20px 24px 12px' });
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#box > div')!).paddingTop)).toBe('20px');
    // A dot marks the top as its own; All shows "mixed".
    await expect(padding.locator('button.place[data-place="top"]')).toHaveAttribute('data-own', '');
    await padding.locator('button.place[data-place="all"]').click();
    await expect(padding.locator('juel-number.size input#number-input')).toHaveAttribute('placeholder', 'mixed');
    await padding.locator('juel-number.size input#number-input').fill('8px');
    await commit(page);
    expect(await declarations(page)).toEqual({ padding: '8px' });
    // Emptying one side writes longhands for the rest and clears the shorthand.
    await padding.locator('button.place[data-place="left"]').click();
    await padding.locator('juel-number.size input#number-input').fill('');
    await commit(page);
    expect(await declarations(page)).toEqual({ 'padding-top': '8px', 'padding-right': '8px', 'padding-bottom': '8px' });
    expect(await page.evaluate(() => (window as any).lastChange.clear)).toEqual(['padding', 'padding-left']);
    // Margin: Auto, and the toggle moves with the arrow keys.
    const margin = page.locator('#margin');
    await click(page, margin.locator('input.auto-switch'));
    expect((await declarations(page)).margin).toBe('auto');
    await margin.locator('button.place[data-place="all"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(margin.locator('button.place[data-place="top"]')).toHaveAttribute('aria-checked', 'true');
});

test('border editor: a side of its own, then all four alike; corners', async ({ page }) => {
    await page.goto('examples/Editors/Style/BorderEditor/border-editor.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const editor = page.locator('#border');
    await expect(editor.locator('.styles button[data-style="solid"]')).toHaveAttribute('aria-checked', 'true');
    await editor.locator('.border-head button.place[data-place="right"]').click();
    await click(page, editor.locator('.styles button[data-style="dashed"]'));
    expect(await declarations(page)).toEqual({
        'border-radius': '12px',
        'border-top': '2px solid #4f46e5', 'border-right': '2px dashed #4f46e5', 'border-bottom': '2px solid #4f46e5', 'border-left': '2px solid #4f46e5',
    });
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('card')!).borderRightStyle)).toBe('dashed');
    await expect(editor.locator('.border-head button.place[data-place="right"]')).toHaveAttribute('data-own', '');
    // Size on the right only.
    await editor.locator('juel-number.border-size input#number-input').fill('6px');
    await commit(page);
    expect((await declarations(page))['border-right']).toBe('6px dashed #4f46e5');
    // All: dotted on every side → one `border`, the per-side ones cleared.
    await editor.locator('.border-head button.place[data-place="all"]').click();
    await click(page, editor.locator('.styles button[data-style="dotted"]'));
    const all = await declarations(page);
    expect(all['border-style'] ?? null).toBeNull();
    expect(Object.keys(all).filter(k => k.startsWith('border-') && k !== 'border-radius')).toEqual(
        // Sizes still differ (6px on the right), so it stays per side, all dotted.
        ['border-top', 'border-right', 'border-bottom', 'border-left']);
    expect(Object.values(all).filter(v => /dotted/.test(v)).length).toBe(4);
    await editor.locator('juel-number.border-size input#number-input').fill('3px');
    await commit(page);
    expect(await declarations(page)).toEqual({ 'border-radius': '12px', border: '3px dotted #4f46e5' });
    // Corners: the top-left one alone.
    const corners = editor.locator('juel-sides-editor.radius');
    await corners.locator('button.place[data-place="top-left"]').click();
    await corners.locator('juel-number.size input#number-input').fill('0px');
    await commit(page);
    expect((await declarations(page))['border-radius']).toBe('0px 12px 12px');
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('card')!).borderTopLeftRadius)).toBe('0px');
    // Clear removes the border, keeping the radius.
    await click(page, editor.locator('juel-button.clear'));
    expect(await declarations(page)).toEqual({ 'border-radius': '0px 12px 12px' });
});

test('shadow editor kind="text": no inset or spread, an Aa preview, edits text-shadow; box mode unchanged', async ({ page }) => {
    await page.goto('examples/Editors/Style/ShadowEditor/shadow-editor.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const text = page.locator('#ed3');
    // The control for this test: the editor back in box mode, so its text-only steps FAIL.
    if (control) await text.evaluate((e: any) => { e.kind = 'box'; return e.updateComplete; });
    await expect(text.locator('label.inset')).toHaveCount(0, { timeout: 3000 });
    await expect(text.locator('.lbl', { hasText: 'Spread' })).toHaveCount(0);
    await expect(text.locator('.text-preview')).toHaveText('Aa');
    await expect(page.locator('#ed1 label.inset')).toHaveCount(1);
    await expect(page.locator('#ed1 .lbl', { hasText: 'Spread' })).toHaveCount(1);
    // Add a second shadow: a stack, written to text-shadow on the headline.
    await text.locator('juel-button[button-label="Add shadow"]').click();
    const value = await text.evaluate((e: any) => e.value);
    expect(value.split(/,(?![^(]*\))/).length).toBe(2);
    expect(value).not.toMatch(/inset/);
    const shown = await page.evaluate(() => getComputedStyle(document.getElementById('headline')!).textShadow);
    expect(shown.split(/,(?![^(]*\))/).length).toBe(2);
    // A box shadow pasted into a text editor loses its inset and spread.
    await text.evaluate((e: any) => { e.value = 'inset 1px 2px 3px 4px red'; e.requestUpdate(); });
    await text.evaluate((e: any) => (e as any).updateComplete);
    expect(await text.evaluate((e: any) => { e.parse(e.value); return e.serialize(); })).toBe('1px 2px 3px red');
});
