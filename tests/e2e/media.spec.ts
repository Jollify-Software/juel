// juel-media background video, on examples/Display/Media/random.html: leaving the page stops its
// download (beforeunload as a navigation starts, pagehide as the fallback), and a return from the
// back/forward cache plays it again; a player with controls is left alone.
import { expect, test } from '@playwright/test';

const src = (page, selector = 'juel-media[background]') => page.evaluate(s => document.querySelector(s)!.shadowRoot!.querySelector('video')!.getAttribute('src'), selector);
const fire = (page, type: string, persisted?: boolean) => page.evaluate(([t, p]) =>
    window.dispatchEvent(p === undefined ? new Event(t as string) : new PageTransitionEvent(t as string, { persisted: p as boolean })), [type, persisted]);

test('media: a background video stops downloading on beforeunload and plays again on a bfcache return', async ({ page }) => {
    await page.goto('examples/Display/Media/random.html');
    await page.waitForFunction(() => document.querySelector('juel-media')?.shadowRoot?.querySelector('video'));
    const picked = await src(page);
    expect(picked).toMatch(/_Assets\/(ocean|island|water|moai|beach|sea)\.mp4$/);
    await fire(page, 'beforeunload');
    expect(await src(page)).toBeNull();
    await fire(page, 'pageshow', false);
    expect(await src(page)).toBeNull();
    await fire(page, 'pageshow', true);
    expect(await src(page)).toBe(picked);
    await fire(page, 'pagehide');
    expect(await src(page)).toBeNull();
});

test('media: a video with controls keeps its src when the page is left', async ({ page }) => {
    await page.goto('examples/Display/Media/random.html');
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<juel-media id="player" src="../../_Assets/sea.mp4"></juel-media>'));
    await page.waitForFunction(() => document.querySelector('#player')?.shadowRoot?.querySelector('video'));
    await fire(page, 'beforeunload');
    expect(await src(page, '#player')).toBe('../../_Assets/sea.mp4');
});
