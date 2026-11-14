import { CartStore, MaxLines, MaxQuantity, formatPrice, parsePrice } from '../../src/Shop/Cart/CartStore';

function memoryStorage() {
    const data = new Map<string, string>();
    return {
        data,
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => { data.set(k, v); },
        removeItem: (k: string) => { data.delete(k); },
    };
}

const coat = { item: 'p-coat', name: 'Blue wool coat', unit: 1250 };
const plates = { item: 'p-plates', name: 'Six plates', unit: 800 };
const donation = { item: 'd-1', name: 'A donation', unit: null };

describe('parsePrice', () => {
    test('prices in minor units, whatever the page wrote', () => {
        expect(parsePrice('12.50')).toBe(1250);
        expect(parsePrice('£12.50')).toBe(1250);
        expect(parsePrice('12')).toBe(1200);
        expect(parsePrice('12.5')).toBe(1250);
        expect(parsePrice('1,250.00')).toBe(125000);
        expect(parsePrice(' 0.99 ')).toBe(99);
    });
    test('no price, or "any", is any amount; nonsense is NaN', () => {
        expect(parsePrice('')).toBeNull();
        expect(parsePrice(undefined)).toBeNull();
        expect(parsePrice('any')).toBeNull();
        expect(parsePrice('Any amount')).toBeNull();
        expect(parsePrice('twelve')).toBeNaN();
        expect(parsePrice('12.505')).toBeNaN();
        expect(parsePrice('-3')).toBeNaN();
    });
});

test('formatPrice shows money in the currency', () => {
    expect(formatPrice(1250, 'GBP', 'en-GB')).toBe('£12.50');
    expect(formatPrice(800, 'EUR', 'en-GB')).toBe('€8.00');
    expect(formatPrice(1250, 'NOT-A-CODE', 'en-GB')).toBe('12.50');
});

describe('CartStore', () => {
    test('adds, counts and totals; the same thing twice is one line', () => {
        const store = new CartStore('k');
        expect(store.add(coat)).toBe(1);
        expect(store.add(plates, 2)).toBe(2);
        expect(store.add(coat)).toBe(2);
        expect(store.lines.map(l => [l.item, l.quantity])).toEqual([['p-coat', 2], ['p-plates', 2]]);
        expect(store.count).toBe(4);
        expect(store.total).toBe(2 * 1250 + 2 * 800);
        expect(store.checkoutLines()).toEqual([{ item: 'p-coat', quantity: 2 }, { item: 'p-plates', quantity: 2 }]);
    });

    test('checkout is given items and quantities only, never prices or names', () => {
        const store = new CartStore('k');
        store.add(coat);
        expect(Object.keys(store.checkoutLines()[0]).sort()).toEqual(['item', 'quantity']);
    });

    test('stock caps a line: a one-off goes in once', () => {
        const store = new CartStore('k');
        expect(store.add({ ...coat, max: 1 })).toBe(1);
        expect(store.add({ ...coat, max: 1 })).toBe(1);
        store.setQuantity('p-coat', 5);
        expect(store.quantityOf('p-coat')).toBe(1);
        expect(store.add({ ...plates, max: 0 })).toBe(0);
        expect(store.lines.map(l => l.item)).toEqual(['p-coat']);
    });

    test('any amount: chosen in the basket, within its limits; checkout waits for it and is given it', () => {
        const store = new CartStore('k');
        store.add(coat);
        store.add({ ...donation, minAmount: 100, maxAmount: 50000 });
        expect(store.ready).toBe(false);
        expect(store.hasAnyAmount).toBe(true);
        store.setAmount('d-1', 50);              // under the least
        expect(store.ready).toBe(false);
        expect(store.total).toBe(1250);
        store.setAmount('d-1', 60000);           // over the most
        expect(store.ready).toBe(false);
        store.setAmount('d-1', 2000);
        expect(store.ready).toBe(true);
        expect(store.hasAnyAmount).toBe(false);
        expect(store.total).toBe(1250 + 2000);
        expect(store.checkoutLines()).toEqual([{ item: 'p-coat', quantity: 1 }, { item: 'd-1', quantity: 1, amount: 2000 }]);
        store.setAmount('d-1', NaN);
        expect(store.ready).toBe(false);
        store.setAmount('p-coat', 5);            // only an any-amount line takes an amount
        expect(store.lines.find(l => l.item === 'p-coat')!.amount).toBeUndefined();
    });

    test('any amount: a suggested amount fills it in, and the least is £1 when the item doesn\'t say', () => {
        const store = new CartStore('k');
        store.add({ ...donation, amount: 500 });
        expect(store.ready).toBe(true);
        store.setAmount('d-1', 99);
        expect(store.ready).toBe(false);
        store.add({ ...donation, amount: 500 }); // adding again keeps what the buyer typed
        expect(store.lines[0].amount).toBe(99);
    });

    test('any amount: once, adds nothing to the total until chosen, and is flagged', () => {
        const store = new CartStore('k');
        store.add(coat);
        expect(store.add(donation, 3)).toBe(1);
        store.setQuantity('d-1', 2);
        expect(store.quantityOf('d-1')).toBe(1);
        expect(store.total).toBe(1250);
        expect(store.hasAnyAmount).toBe(true);
    });

    test('setQuantity 0 and remove take a line out; clear empties it', () => {
        const store = new CartStore('k');
        store.add(coat); store.add(plates);
        store.setQuantity('p-coat', 0);
        store.remove('p-plates');
        expect(store.count).toBe(0);
        store.add(coat);
        store.clear();
        expect(store.lines).toEqual([]);
    });

    test('setStock brings lines down to what is left, and says which', () => {
        const store = new CartStore('k');
        store.add(coat, 3); store.add(plates, 2); store.add(donation);
        expect(store.setStock({ 'p-coat': 1, 'p-plates': 0, 'unknown': 4 })).toEqual(['p-coat', 'p-plates']);
        expect(store.lines.map(l => [l.item, l.quantity, l.max])).toEqual([['p-coat', 1, 1], ['d-1', 1, undefined]]);
        expect(store.setStock({ 'p-coat': 5 })).toEqual([]);
        expect(store.add(coat, 10)).toBe(5);
    });

    test('limits: quantity and lines', () => {
        const store = new CartStore('k');
        expect(store.add(coat, 1000)).toBe(MaxQuantity);
        for (let i = 0; i < MaxLines + 5; i++) store.add({ item: `i${i}`, name: `${i}`, unit: 1 });
        expect(store.lines.length).toBe(MaxLines);
    });

    test('kept in storage and read back; another basket key is another basket', () => {
        const storage = memoryStorage();
        const a = new CartStore('juel-cart:sue', storage);
        a.add(coat); a.add(donation);
        expect(new CartStore('juel-cart:sue', storage).lines).toEqual(a.lines);
        expect(new CartStore('juel-cart:other', storage).lines).toEqual([]);
        a.clear();
        expect(storage.data.has('juel-cart:sue')).toBe(false);
    });

    test('a damaged or foreign stored basket is ignored line by line', () => {
        const storage = memoryStorage();
        storage.setItem('k', 'not json');
        expect(new CartStore('k', storage).lines).toEqual([]);
        storage.setItem('k', JSON.stringify({ v: 1, lines: [
            { item: 'ok', name: 'Fine', unit: 100, quantity: 2 },
            { item: '', name: 'No id', unit: 100, quantity: 1 },
            { item: 'neg', name: 'Negative', unit: -5, quantity: 1 },
            { item: 'frac', name: 'Fraction', unit: 1.5, quantity: 1 },
            { item: 'big', name: 'Too many', unit: 100, quantity: 5000 },
            { item: 'any', name: 'Donation twice', unit: null, quantity: 2 },
        ] }));
        expect(new CartStore('k', storage).lines.map(l => [l.item, l.quantity])).toEqual([['ok', 2], ['big', MaxQuantity], ['any', 1]]);
        storage.setItem('k', JSON.stringify({ v: 2, lines: [{ item: 'x', name: 'x', unit: 1, quantity: 1 }] }));
        expect(new CartStore('k', storage).lines).toEqual([]);
    });

    test('storage that throws (a private window) leaves the basket working', () => {
        const store = new CartStore('k', {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); },
            removeItem: () => { throw new Error('blocked'); },
        });
        expect(store.add(coat)).toBe(1);
        expect(store.count).toBe(1);
    });

    test('subscribers hear every change, and can stop', () => {
        const store = new CartStore('k');
        let heard = 0;
        const stop = store.subscribe(() => { heard++; });
        store.add(coat); store.setQuantity('p-coat', 2); store.remove('p-coat');
        expect(heard).toBe(3);
        stop();
        store.add(coat);
        expect(heard).toBe(3);
    });
});
