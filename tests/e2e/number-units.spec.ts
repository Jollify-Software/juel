// juel-number with units, on examples/Editors/Number/number.html.
import { expect, test } from '@playwright/test';

test('number: without units it is still a type="number" input', async ({ page }) => {
    await page.goto('examples/Editors/Number/number.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await expect(page.locator('juel-number[label="Quantity"] input')).toHaveAttribute('type', 'number');
    await expect(page.locator('juel-number[label="Quantity"] select')).toHaveCount(0);
});

test('number with units: typed text, the arrows, the unit menu, empty', async ({ page }) => {
    await page.goto('examples/Editors/Number/number.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const box = page.locator('#size input');
    const changed = page.locator('#changed'), committed = page.locator('#committed');
    await expect(box).toHaveAttribute('placeholder', 'theme');
    await expect(box).toHaveValue('');
    await expect(committed).toHaveText('');
    await box.fill('2em');
    await expect(changed).toHaveText('{"value":2,"unit":"em","text":"2em"}');
    await expect(committed).toHaveText('');
    await box.press('Enter');
    await expect(committed).toHaveText('{"value":2,"unit":"em","text":"2em"}');
    await expect(box).toHaveValue('2');
    await expect(page.locator('#size select')).toHaveValue('em');
    await box.press('ArrowUp');
    await expect(committed).toHaveText('{"value":3,"unit":"em","text":"3em"}');
    await box.press('Shift+ArrowDown');
    await expect(committed).toHaveText('{"value":-7,"unit":"em","text":"-7em"}');
    await page.locator('#size select').selectOption('px');
    await expect(committed).toHaveText('{"value":-7,"unit":"px","text":"-7px"}');
    await box.fill('');
    await box.press('Enter');
    await expect(committed).toHaveText('{"value":null,"unit":"px","text":""}');
});

test('number with units: an owner echoing each live value back into .text still gets the commit', async ({ page }) => {
    await page.goto('examples/Editors/Number/number.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    // As an app does: every live change re-renders it with the value it now holds.
    await page.evaluate(() => {
        const size = document.querySelector('#size') as any;
        size.addEventListener('value-changed', (e: CustomEvent) => { size.text = e.detail.text; });
    });
    const box = page.locator('#size input'), committed = page.locator('#committed');
    await box.fill('3rem');
    await expect(committed).toHaveText('');
    await box.press('Enter');
    await expect(committed).toHaveText('{"value":3,"unit":"rem","text":"3rem"}');
});
