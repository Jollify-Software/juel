// juel-shape, on examples/Display/Shape/shape.html.
import { expect, test } from '@playwright/test';

test('shape: changing type, direction and regular after the first paint repaints it', async ({ page }) => {
    await page.goto('examples/Display/Shape/shape.html');
    await page.waitForFunction(() => customElements.get('juel-shape'));
    const state = await page.evaluate(async () => {
        const el = document.createElement('juel-shape') as any;
        el.type = 'circle';
        document.body.append(el);
        await el.updateComplete;
        el.type = 'star-8';
        el.direction = 'ne';
        el.regular = true;
        await el.updateComplete;
        const layer = el.shadowRoot.querySelector('.svg-container');
        return {
            classes: layer.className,
            clip: getComputedStyle(layer).clipPath.startsWith('polygon('),
            regular: el.classList.contains('juel-shape--regular'),
        };
    });
    expect(state.classes).toContain('filled');
    expect(state.classes).toContain('ne');
    expect(state.clip).toBe(true);
    expect(state.regular).toBe(true);
    const off = await page.evaluate(async () => {
        const el = document.querySelector('body > juel-shape:last-child') as any;
        el.regular = false;
        await el.updateComplete;
        return el.classList.contains('juel-shape--regular');
    });
    expect(off).toBe(false);
});
