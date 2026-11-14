import { isPaymentUrl, jollifyCheckout } from '../../src/Shop/Cart/CheckoutAdapter';

type Call = { url: string; init?: RequestInit };

function fakeFetch(status: number, body: unknown, calls: Call[] = []) {
    return async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return { ok: status >= 200 && status < 300, status, json: async () => body };
    };
}

describe('jollifyCheckout', () => {
    test('posts items and quantities to the shop\'s checkout and returns the payment page', async () => {
        const calls: Call[] = [];
        const adapter = jollifyCheckout('https://jollify.app/', 'sue shop', fakeFetch(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_1' }, calls));
        await expect(adapter.checkout([{ item: 'p-coat', quantity: 1 }])).resolves.toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
        expect(calls[0].url).toBe('https://jollify.app/api/shop/sue%20shop/checkout');
        expect(calls[0].init?.method).toBe('POST');
        expect(JSON.parse(String(calls[0].init?.body))).toEqual({ lines: [{ item: 'p-coat', quantity: 1 }] });
    });

    test('delivery goes with the lines only when the shop offers postage', async () => {
        const calls: Call[] = [];
        const adapter = jollifyCheckout('https://x', 's', fakeFetch(200, { url: 'https://checkout.stripe.com/x' }, calls));
        await adapter.checkout([{ item: 'd', quantity: 1, amount: 500 }], { delivery: 'post' });
        await adapter.checkout([{ item: 'a', quantity: 1 }]);
        expect(JSON.parse(String(calls[0].init?.body))).toEqual({ lines: [{ item: 'd', quantity: 1, amount: 500 }], delivery: 'post' });
        expect(JSON.parse(String(calls[1].init?.body))).toEqual({ lines: [{ item: 'a', quantity: 1 }] });
    });

    test('409: the server\'s words and the stock left', async () => {
        const adapter = jollifyCheckout('https://jollify.app', 's', fakeFetch(409, { error: 'Sold out', stock: { 'p-coat': 0, bad: -1, worse: 'x' } }));
        await expect(adapter.checkout([{ item: 'p-coat', quantity: 1 }])).resolves.toEqual({ error: 'Sold out', stock: { 'p-coat': 0 } });
    });

    test('other failures: the server\'s words, or a plain try-again; never throws', async () => {
        await expect(jollifyCheckout('https://x', 's', fakeFetch(400, { error: 'This shop is closed' })).checkout([]))
            .resolves.toEqual({ error: 'This shop is closed' });
        const plain = await jollifyCheckout('https://x', 's', fakeFetch(500, {})).checkout([]);
        expect('error' in plain && plain.error).toMatch(/try again/);
        const offline = await jollifyCheckout('https://x', 's', async () => { throw new Error('offline'); }).checkout([]);
        expect('error' in offline && offline.error).toMatch(/try again/);
    });

    test('a payment page that isn\'t https (or localhost) is not followed', async () => {
        const result = await jollifyCheckout('https://x', 's', fakeFetch(200, { url: 'javascript:alert(1)' })).checkout([]);
        expect('url' in result).toBe(false);
    });

    test('stock: the counts, or null when the server can\'t say', async () => {
        const calls: Call[] = [];
        await expect(jollifyCheckout('https://x', 's', fakeFetch(200, { stock: { a: 2, b: 0 } }, calls)).stock!()).resolves.toEqual({ a: 2, b: 0 });
        expect(calls[0].url).toBe('https://x/api/shop/s/stock');
        await expect(jollifyCheckout('https://x', 's', fakeFetch(503, {})).stock!()).resolves.toBeNull();
        await expect(jollifyCheckout('https://x', 's', async () => { throw new Error('offline'); }).stock!()).resolves.toBeNull();
    });
});

test('isPaymentUrl: https anywhere, http only on this machine', () => {
    expect(isPaymentUrl('https://checkout.stripe.com/x')).toBe(true);
    expect(isPaymentUrl('http://localhost:5000/pay')).toBe(true);
    expect(isPaymentUrl('http://127.0.0.1/pay')).toBe(true);
    expect(isPaymentUrl('http://evil.example/pay')).toBe(false);
    expect(isPaymentUrl('javascript:alert(1)')).toBe(false);
    expect(isPaymentUrl('not a url')).toBe(false);
});
