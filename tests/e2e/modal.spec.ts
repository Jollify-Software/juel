// <juel-modal> in Chrome, on its example page (examples/Dialog/Modal/modal.html).
import { expect, test } from '@playwright/test';

let errors: string[];

test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('examples/Dialog/Modal/modal.html');
    await page.waitForFunction(() => customElements.get('juel-modal') !== undefined);
});

test.afterEach(() => {
    expect(errors).toEqual([]);
});

// Closed, then shown again before the `close` event's task runs (the Jollify app's Insert wizard
// does this: a step's Cancel reopens the gallery). That `close` is stale: the modal stays open
// and says so, with no `modal-closed`.
test('closed then reopened at once: the stale close event is ignored', async ({ page }) => {
    const seen = await page.evaluate(async () => {
        const m = document.querySelector('#link-modal') as any;
        await m.open();
        let closed = 0;
        m.addEventListener('modal-closed', () => closed++);
        m.close('x');
        await m.open();
        await new Promise(r => setTimeout(r, 200));
        return { opened: m.opened, native: m.shadowRoot.querySelector('dialog').open, closed };
    });
    expect(seen).toEqual({ opened: true, native: true, closed: 0 });
});

test('a plain close still closes and reports its value', async ({ page }) => {
    const seen = await page.evaluate(async () => {
        const m = document.querySelector('#link-modal') as any;
        await m.open();
        const value = new Promise(r => m.addEventListener('modal-closed', (e: CustomEvent) => r(e.detail.returnValue), { once: true }));
        m.close('done');
        return { value: await value, opened: m.opened, native: m.shadowRoot.querySelector('dialog').open };
    });
    expect(seen).toEqual({ value: 'done', opened: false, native: false });
});
