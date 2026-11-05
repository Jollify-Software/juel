// The one-row slider in juel-number and the editors built on it, on their example pages.
import { expect, test, type Locator, type Page } from '@playwright/test';

/** Drags a range input to a fraction of its width, as a mouse does. */
async function dragSlider(page: Page, slider: Locator, fraction: number, release = true) {
    await slider.scrollIntoViewIfNeeded();
    const box = (await slider.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * fraction, box.y + box.height / 2, { steps: 4 });
    if (release) await page.mouse.up();
}

const css = (page: Page) => page.locator('#css').textContent();

test.describe('juel-number slider', () => {
    test('a slider, a number and a unit on one row; moving reports live, letting go commits once', async ({ page }) => {
        await page.goto('examples/Editors/Number/number.html');
        await page.waitForFunction(() => (window as any).exampleReady);
        const field = page.locator('#sliding');
        const row = field.locator('.slider-row');
        await expect(row.locator('input[type=range]')).toBeVisible();
        const slider = await row.locator('input[type=range]').boundingBox();
        const text = await row.locator('input#number-input').boundingBox();
        expect(Math.abs((slider!.y + slider!.height / 2) - (text!.y + text!.height / 2))).toBeLessThan(6);
        await page.evaluate(() => { (window as any).events = []; const f = document.querySelector('#sliding')!; for (const t of ['value-changed', 'value-committed']) f.addEventListener(t, (e: any) => (window as any).events.push([t, e.detail.text])); });
        await dragSlider(page, row.locator('input[type=range]'), 0.75, false);
        const live = await page.evaluate(() => (window as any).events.slice());
        expect(live.length).toBeGreaterThan(0);
        expect(live.every((e: string[]) => e[0] === 'value-changed')).toBe(true);
        await page.mouse.up();
        const all: string[][] = await page.evaluate(() => (window as any).events);
        expect(all.filter(e => e[0] === 'value-committed')).toHaveLength(1);
        expect(await row.locator('input#number-input').inputValue()).toBe(String(parseFloat(all.at(-1)![1])));
    });

    test('a value typed past the ends is kept, the thumb resting at the end', async ({ page }) => {
        await page.goto('examples/Editors/Number/number.html');
        await page.waitForFunction(() => (window as any).exampleReady);
        const field = page.locator('#sliding');
        await field.locator('input#number-input').fill('500');
        await field.locator('input#number-input').press('Enter');
        await expect(field.locator('input#number-input')).toHaveValue('500');
        await expect(field.locator('input[type=range]')).toHaveValue('100');
    });

    test('changing the unit keeps the size when it knows both units, else stays in range', async ({ page }) => {
        await page.goto('examples/Editors/Number/number.html');
        await page.waitForFunction(() => (window as any).exampleReady);
        const field = page.locator('#sliding');
        await field.locator('input#number-input').fill('32');
        await field.locator('input#number-input').press('Enter');
        await field.locator('select').selectOption('em');
        await expect(field.locator('input#number-input')).toHaveValue('2');
        await field.locator('select').selectOption('vw');
        await expect(field.locator('input#number-input')).toHaveValue('2');
        await field.locator('input#number-input').fill('90');
        await field.locator('input#number-input').press('Enter');
        await field.locator('select').selectOption('em');
        await expect(field.locator('input#number-input')).toHaveValue('10');
    });
});

test.describe('juel-transform-editor', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('examples/Editors/Style/TransformEditor/transform-editor.html');
        await page.waitForFunction(() => (window as any).exampleReady);
    });
    const part = (page: Page, name: string) => page.locator(`#editor .row[data-part="${name}"]`);

    test('move, rotate and scale are the individual properties; skew goes in transform', async ({ page }) => {
        await part(page, 'x').locator('input#number-input').fill('2');
        await part(page, 'x').locator('input#number-input').press('Enter');
        await part(page, 'rotate').locator('input#number-input').fill('15');
        await part(page, 'rotate').locator('input#number-input').press('Enter');
        await part(page, 'scale').locator('input#number-input').fill('1.5');
        await part(page, 'scale').locator('input#number-input').press('Enter');
        await part(page, 'skewX').locator('input#number-input').fill('5');
        await part(page, 'skewX').locator('input#number-input').press('Enter');
        const text = await css(page);
        expect(text).toContain('translate: 2vw;');
        expect(text).toContain('rotate: 15deg;');
        expect(text).toContain('scale: 1.5;');
        expect(text).toContain('transform: skewX(5deg);');
        expect(await page.evaluate(() => getComputedStyle(document.getElementById('box')!).rotate)).toBe('15deg');
    });

    test('a slider moves the box live and commits once', async ({ page }) => {
        await dragSlider(page, part(page, 'rotate').locator('input[type=range]'), 0.75, false);
        expect(await css(page)).toMatch(/rotate: \d+deg;/);
        expect(await page.locator('#log').textContent()).toBe('');
        await page.mouse.up();
        await expect(page.locator('#log')).toHaveText('committed');
    });

    test('a formula shows as text with a clear button, not a slider, and is not lost', async ({ page }) => {
        await page.evaluate(() => { const e = document.getElementById('editor') as any; e.declarations = { rotate: 'calc(var(--progress) * 1turn)' }; return e.updateComplete; });
        await expect(part(page, 'rotate').locator('.formula')).toHaveText('calc(var(--progress) * 1turn)');
        await expect(part(page, 'rotate').locator('input[type=range]')).toHaveCount(0);
        await part(page, 'rotate').locator('juel-button.clear').click();
        expect(await css(page)).not.toContain('rotate');
    });

    test('anything else in transform stays, in a box of its own', async ({ page }) => {
        await page.evaluate(() => { const e = document.getElementById('editor') as any; e.declarations = { transform: 'matrix(1, 0, 0, 1, 5, 5)' }; return e.updateComplete; });
        await expect(part(page, 'other').locator('input')).toHaveValue('matrix(1, 0, 0, 1, 5, 5)');
        await part(page, 'skewY').locator('input#number-input').fill('3');
        await part(page, 'skewY').locator('input#number-input').press('Enter');
        expect(await css(page)).toContain('transform: matrix(1, 0, 0, 1, 5, 5) skewY(3deg);');
    });

    test('the calculator asks the page', async ({ page }) => {
        await part(page, 'rotate').locator('juel-button.formula-button').click();
        await expect(page.locator('#log')).toHaveText('formula for rotate');
        await expect(part(page, 'x').locator('juel-button.formula-button')).toHaveCount(0);
    });

    test('origin: a dot, a drag outside the element, and the arrow keys', async ({ page }) => {
        await part(page, 'origin').locator('juel-button.origin-button').click();
        const picker = page.locator('#editor juel-point-selector');
        await picker.locator('.preset[title="100% 0%"]').click();
        expect(await css(page)).toContain('transform-origin: 100% 0%;');
        await picker.locator('.field').scrollIntoViewIfNeeded();
        const field = (await picker.locator('.field').boundingBox())!;
        await page.mouse.move(field.x + field.width / 2, field.y + field.height / 2);
        await page.mouse.down();
        await page.mouse.move(field.x + field.width / 2, field.y + 2, { steps: 3 });
        await page.mouse.up();
        const text = (await css(page))!;
        const y = Number(/transform-origin: 50% (-?\d+)%/.exec(text)![1]);
        expect(y).toBeLessThan(-80);
        await picker.locator('.field').press('ArrowRight');
        expect(await css(page)).toContain('transform-origin: 51%');
        await part(page, 'origin').locator('juel-button.clear-origin').click();
        expect(await css(page)).not.toContain('transform-origin');
    });
});

test.describe('juel-border-image-editor', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('examples/Editors/Style/BorderImageEditor/border-image-editor.html');
        await page.waitForFunction(() => (window as any).exampleReady);
    });
    const kind = (page: Page, value: string) => page.locator(`#editor juel-segmented.kind juel-button[data-value="${value}"]`);

    test('a picture: longhands that show in the preview; slice, edges and fill', async ({ page }) => {
        await kind(page, 'picture').click();
        const text = await css(page);
        expect(text).toContain('border-style: solid;');
        expect(text).toContain('border-image-slice: 33%;');
        expect(text).toContain('border-image-repeat: round;');
        expect(text).not.toMatch(/^border:/m);
        const preview = page.locator('#editor .preview');
        expect(await preview.evaluate(el => getComputedStyle(el).borderImageSource)).toContain('data:image/svg');
        await page.locator('#editor juel-number.slice input#number-input').fill('10');
        await page.locator('#editor juel-number.slice input#number-input').press('Enter');
        await page.locator('#editor juel-segmented.repeat juel-button[data-value="stretch"]').click();
        await page.locator('#editor .fill-middle').check();
        const after = await css(page);
        expect(after).toContain('border-image-slice: 10% fill;');
        expect(after).toContain('border-image-repeat: stretch;');
    });

    test('a slice for one side only', async ({ page }) => {
        await kind(page, 'picture').click();
        await page.locator('#editor button.place[data-place="top"]').click();
        await page.locator('#editor juel-number.slice input#number-input').fill('5');
        await page.locator('#editor juel-number.slice input#number-input').press('Enter');
        expect(await css(page)).toContain('border-image-slice: 5% 33% 33%;');
    });

    test('a gradient needs no picture and no slice; clear takes it all off', async ({ page }) => {
        await kind(page, 'gradient').click();
        const text = await css(page);
        expect(text).toContain('border-image-source: linear-gradient(');
        expect(text).toContain('border-image-slice: 1;');
        await expect(page.locator('#editor juel-number.slice')).toHaveCount(0);
        await page.evaluate(() => (document.getElementById('editor') as any).clear());
        await expect(page.locator('#css')).toHaveText('');
    });
});

test.describe('diagram editor outline', () => {
    const open = async (page: Page, value: unknown) => {
        await page.goto('examples/Visualization/Diagram/diagram-editor.html');
        await page.waitForFunction(() => customElements.get('juel-diagram-editor'));
        await page.evaluate(v => { const e = document.querySelector('#editor') as any; e.value = v; return e.updateComplete; }, value);
    };
    const org = { type: 'org', nodes: [{ id: 'a', text: 'Head' }, { id: 'b', text: 'B', parent: 'a' }, { id: 'c', text: 'C', parent: 'a' }, { id: 'd', text: 'D', parent: 'a' }] };
    const order = (page: Page) => page.evaluate(() => (document.querySelector('#editor') as any).diagram.nodes.map((n: any) => `${n.text}${n.parent ? `<${n.parent}` : ''}`).join(' '));
    const button = (page: Page, label: string) => page.locator(`#editor juel-button[button-label="${label}"]`);

    test('the arrows stay on through a move, and are off only when there is nowhere to go', async ({ page }) => {
        await open(page, org);
        await page.locator('#editor .row[data-id="d"] juel-text.text input').click();
        await expect(button(page, 'Move down')).toHaveAttribute('disabled', '');
        await button(page, 'Move up').click();
        await expect(page.locator('#editor .row[data-id="d"]')).toHaveAttribute('data-selected', '');
        await expect(button(page, 'Move up')).not.toHaveAttribute('disabled', '');
        await expect(button(page, 'Move down')).not.toHaveAttribute('disabled', '');
        await button(page, 'Move up').click();
        await expect(button(page, 'Move up')).toHaveAttribute('disabled', '');
        expect(await order(page)).toBe('Head D<a B<a C<a');
    });

    test('a value the owner hands back unchanged keeps the selection and undo', async ({ page }) => {
        await open(page, org);
        await page.locator('#editor .row[data-id="c"] juel-text.text input').click();
        await button(page, 'Move up').click();
        await expect(button(page, 'Undo')).not.toHaveAttribute('disabled', '');
        await page.evaluate(() => { const e = document.querySelector('#editor') as any; e.value = e.value; return e.updateComplete; });
        await expect(button(page, 'Undo')).not.toHaveAttribute('disabled', '');
        await expect(page.locator('#editor .row[data-id="c"]')).toHaveAttribute('data-selected', '');
    });

    test('dragging a grip moves the row, showing where, as one undo step', async ({ page }) => {
        await open(page, org);
        const from = (await page.locator('#editor .row[data-id="b"] .grip').boundingBox())!;
        const to = (await page.locator('#editor .row[data-id="d"]').boundingBox())!;
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(to.x + 20, to.y + to.height - 3, { steps: 5 });
        await expect(page.locator('#editor .row[data-id="d"]')).toHaveAttribute('data-drop', 'after');
        await expect(page.locator('#editor .row[data-id="b"]')).toHaveAttribute('data-dragging', '');
        await page.mouse.up();
        expect(await order(page)).toBe('Head C<a D<a B<a');
        await expect(page.locator('#editor .row[data-drop]')).toHaveCount(0);
        await button(page, 'Undo').click();
        expect(await order(page)).toBe('Head B<a C<a D<a');
    });

    test('a grip can\'t put someone under themselves', async ({ page }) => {
        await open(page, { type: 'org', nodes: [{ id: 'a', text: 'Head' }, { id: 'b', text: 'B', parent: 'a' }, { id: 'c', text: 'C', parent: 'b' }] });
        const from = (await page.locator('#editor .row[data-id="b"] .grip').boundingBox())!;
        const to = (await page.locator('#editor .row[data-id="c"]').boundingBox())!;
        await page.mouse.move(from.x + 3, from.y + 3);
        await page.mouse.down();
        await page.mouse.move(to.x + 20, to.y + to.height - 3, { steps: 5 });
        await expect(page.locator('#editor .row[data-drop]')).toHaveCount(0);
        await page.mouse.up();
        expect(await order(page)).toBe('Head B<a C<b');
    });

    test('Add and the bins use the shared look', async ({ page }) => {
        await open(page, org);
        await expect(page.locator('#editor .outline juel-button.add')).toHaveAttribute('action', 'add');
        await expect(page.locator('#editor .outline juel-button.add')).toHaveAttribute('label', 'Add');
        await expect(button(page, 'Remove').first()).toHaveAttribute('action', 'remove');
    });
});
