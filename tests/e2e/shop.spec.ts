// <juel-cart> and <juel-buy-button> in Chrome, on their example page (examples/Shop/shop.html) with a pretend checkout.
import { expect, Page, test } from '@playwright/test';

const buy = (page: Page, item: string) => page.locator(`juel-buy-button[item="${item}"] button`);
const count = (page: Page) => page.locator('#cart .count');
const panel = (page: Page) => page.locator('#cart .panel');
const line = (page: Page, item: string) => page.locator(`#cart .line[data-item="${item}"]`);
const openBasket = async (page: Page) => { if (!(await panel(page).isVisible())) await page.locator('#cart .toggle').click(); };

let errors: string[];

test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('examples/Shop/shop.html');
    await page.waitForFunction(() => (window as any).exampleReady);
});

test.afterEach(() => {
    expect(errors).toEqual([]);
});

test('stock: the sold lamp says Sold and marks its host; the rest can be added', async ({ page }) => {
    await expect(buy(page, 'p-lamp')).toHaveText('Sold');
    await expect(buy(page, 'p-lamp')).toBeDisabled();
    await expect(page.locator('juel-buy-button[item="p-lamp"]')).toHaveAttribute('sold', '');
    await expect(buy(page, 'p-coat')).toHaveText('Add to basket');
    await expect(count(page)).toBeHidden();
});

test('adding: counts, a one-off goes in once, quantities and the total', async ({ page }) => {
    await buy(page, 'p-coat').click();
    await expect(count(page)).toHaveText('1');
    await expect(buy(page, 'p-coat')).toHaveText('In your basket');
    await expect(buy(page, 'p-coat')).toBeDisabled();
    await buy(page, 'p-plates').click();
    await expect(buy(page, 'p-plates')).toHaveText('Added');
    await openBasket(page);
    await line(page, 'p-plates').locator('.more').click();
    await expect(count(page)).toHaveText('3');
    await expect(line(page, 'p-coat').locator('.more')).toBeDisabled();
    await expect(page.locator('#cart .total strong')).toHaveText('£28.50');
    await line(page, 'p-plates').locator('.more').click();
    await expect(line(page, 'p-plates').locator('.more')).toBeDisabled(); // three sets, all in
    await line(page, 'p-plates').locator('.less').click();
    await line(page, 'p-coat').locator('.remove').click();
    await expect(line(page, 'p-coat')).toHaveCount(0);
    await expect(buy(page, 'p-coat')).toHaveText('Add to basket');
    await expect(count(page)).toHaveText('2');
});

test('a donation: the amount is chosen in the basket, within its limits, and checkout sends it', async ({ page }) => {
    await buy(page, 'p-plates').click();
    await buy(page, 'd-gift').click();
    await expect(panel(page)).toBeVisible(); // Donate opens the basket: the amount is chosen there
    const amount = line(page, 'd-gift').locator('.amount input');
    await expect(amount).toHaveValue('5.00');
    await expect(page.locator('#cart .total strong')).toHaveText('£13.00');
    await amount.fill('0.50');
    await expect(line(page, 'd-gift').locator('.hint')).toHaveText('At least £1.00');
    await expect(page.locator('#cart .total strong')).toHaveText('£8.00 + your donation');
    await expect(page.locator('#cart .checkout')).toBeDisabled();
    await amount.fill('900');
    await expect(line(page, 'd-gift').locator('.hint')).toHaveText('At most £500.00');
    await amount.fill('20');
    await expect(line(page, 'd-gift').locator('.hint')).toHaveCount(0);
    await expect(page.locator('#cart .total strong')).toHaveText('£28.00');
    await page.locator('#cart .checkout').click();
    await page.waitForFunction(() => (window as any).lastCheckoutUrl);
    expect(await page.evaluate(() => (window as any).checkouts)).toEqual([[{ item: 'p-plates', quantity: 1 }, { item: 'd-gift', quantity: 1, amount: 2000 }]]);
});

test('delivery: collect by default, post adds the postage, and checkout is told which', async ({ page }) => {
    await buy(page, 'p-plates').click();
    await openBasket(page);
    await expect(page.locator('#cart .delivery input[value=collect]')).toBeChecked();
    await expect(page.locator('#cart .total strong')).toHaveText('£8.00');
    await page.locator('#cart .delivery input[value=post]').check();
    await expect(page.locator('#cart .total strong')).toHaveText('£11.50');
    await page.locator('#cart .checkout').click();
    await page.waitForFunction(() => (window as any).lastCheckoutUrl);
    expect(await page.evaluate(() => (window as any).checkoutOptions)).toEqual([{ delivery: 'post' }]);
});

test('checkout sends items and quantities only, then goes to the payment page', async ({ page }) => {
    await buy(page, 'p-coat').click();
    await buy(page, 'p-plates').click();
    await openBasket(page);
    await page.locator('#cart .checkout').click();
    await page.waitForFunction(() => (window as any).lastCheckoutUrl);
    expect(await page.evaluate(() => (window as any).checkouts)).toEqual([[{ item: 'p-coat', quantity: 1 }, { item: 'p-plates', quantity: 1 }]]);
    expect(await page.evaluate(() => (window as any).lastCheckoutUrl)).toMatch(/^https:\/\/checkout\.example\.test\/pay/);
    expect(await page.evaluate(() => (window as any).checkoutOptions)).toEqual([{ delivery: 'collect' }]);
});

test('sold at checkout: the basket loses it, says why, and the button says Sold', async ({ page }) => {
    await buy(page, 'p-coat').click();
    await buy(page, 'p-plates').click();
    await page.locator('#sell-out').check();
    await openBasket(page);
    await page.locator('#cart .checkout').click();
    await expect(page.locator('#cart .message')).toHaveText(/just sold/);
    await expect(line(page, 'p-coat')).toHaveCount(0);
    await expect(line(page, 'p-plates')).toHaveCount(1);
    await expect(buy(page, 'p-coat')).toHaveText('Sold');
    expect(await page.evaluate(() => (window as any).lastCheckoutUrl)).toBeUndefined();
});

test('buy now adds it and checks out straight away', async ({ page }) => {
    await expect(buy(page, 'p-books')).toHaveText('Buy now');
    await buy(page, 'p-books').click();
    await page.waitForFunction(() => (window as any).lastCheckoutUrl);
    expect(await page.evaluate(() => (window as any).checkouts)).toEqual([[{ item: 'p-books', quantity: 1 }]]);
});

test('the basket survives a reload; the thank-you page\'s clear empties it', async ({ page }) => {
    await buy(page, 'p-plates').click();
    await buy(page, 'p-plates').click();
    await page.reload();
    await page.waitForFunction(() => (window as any).exampleReady);
    await expect(count(page)).toHaveText('2');
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<juel-cart shop="example-shop" clear></juel-cart>'); });
    await page.reload();
    await page.waitForFunction(() => (window as any).exampleReady);
    await expect(count(page)).toBeHidden();
});

test('the panel: Escape and a click outside close it', async ({ page }) => {
    await page.locator('#cart .toggle').click();
    await expect(panel(page)).toBeVisible();
    await expect(page.locator('#cart .empty')).toHaveText('Your basket is empty.');
    await expect(page.locator('#cart .checkout')).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await page.locator('#cart .toggle').click();
    await page.locator('h1').click();
    await expect(panel(page)).toBeHidden();
});
