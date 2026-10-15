// The IFileStorage contract (tests/shared/storageContract.ts) against
// BrowserFileStorage in Chrome, plus the browser-only checks in
// tests/browser/files-contract.ts.
import { expect, test } from '@playwright/test';

test('BrowserFileStorage passes the IFileStorage contract', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('tests/browser/files-contract.html');
    const results: { name: string; error?: string }[] = await page.waitForFunction(() => (window as any).contractResults, null, { timeout: 45_000 }).then(h => h.jsonValue());
    expect(errors).toEqual([]);
    expect(results.length).toBeGreaterThan(9);
    expect(results.filter(r => r.error)).toEqual([]);
});
