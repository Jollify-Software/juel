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

// A modal inside a host with light text and no theme tokens (a dark slide, say) drew that light
// text on its white fallback. Its text and box are a pair: the theme's, or --modal-color with --modal-background.
test('text and box are a pair, not the host colour on a white box', async ({ page }) => {
    const seen = await page.evaluate(async () => {
        const host = document.createElement('div');
        host.style.color = 'rgb(255, 255, 255)';
        host.innerHTML = '<juel-modal label="Pair"><p>Readable</p></juel-modal>';
        document.body.append(host);
        const m = host.querySelector('juel-modal') as any;
        await customElements.whenDefined('juel-modal');
        await m.updateComplete;
        await m.open();
        const d = m.shadowRoot.querySelector('dialog');
        const plain = [getComputedStyle(d).color, getComputedStyle(d).backgroundColor];
        host.style.setProperty('--modal-background', 'rgb(20, 30, 40)');
        host.style.setProperty('--modal-color', 'rgb(250, 250, 250)');
        const set = [getComputedStyle(d).color, getComputedStyle(d).backgroundColor];
        m.close();
        return { plain, set };
    });
    // The example page's own theme may set the tokens: the point is the text isn't the host's white on white.
    expect(seen.plain[0]).not.toBe(seen.plain[1]);
    expect(seen.plain[0]).not.toBe('rgb(255, 255, 255)');
    expect(seen.set).toEqual(['rgb(250, 250, 250)', 'rgb(20, 30, 40)']);
});
