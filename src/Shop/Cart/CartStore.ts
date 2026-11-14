// The basket's contents, apart from how it looks: lines, quantities, stock, the total, and keeping them in the
// browser (localStorage) so a basket survives a reload or another page of the same shop. Prices are whole minor
// units (pence), never floats. A line with no price is "any amount" (a donation): the buyer types the amount in the
// basket (between the item's least and most), it counts once, and checkout can't start until it's filled in.
//
// The total is only the page's: the checkout server prices every line from its own catalogue (SHOP-PLAN §2), apart
// from a donation's amount, which it checks against the item's limits.

/** One line of the basket. `unit` is the price in minor units, or null for "any amount". */
export interface CartLine {
    item: string;
    name: string;
    unit: number | null;
    quantity: number;
    /** How many can be bought, when known (the shop's stock). */
    max?: number;
    /** Any amount only: what the buyer chose, in minor units, and the least and most allowed. */
    amount?: number;
    minAmount?: number;
    maxAmount?: number;
}

/** What a checkout is given: which items and how many, nothing else. */
export interface CheckoutLine {
    item: string;
    quantity: number;
    /** Any amount only: what the buyer chose, in minor units. */
    amount?: number;
}

/** The least a donation can be when its item doesn't say: 1.00 of the currency. */
export const DefaultMinAmount = 100;

/** The part of `Storage` the basket uses; `null` keeps it in memory only. */
export type CartStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;

/** The most of one thing a basket holds, whatever the stock says. */
export const MaxQuantity = 99;
/** The most lines a basket holds. */
export const MaxLines = 50;

/**
 * A price as written in a page ("12.50", "£12.50", "12", "1,250.00") in minor units: 1250. Null for no price or
 * "any" (any amount). NaN when it isn't a price. Two decimal places at most; the currency's own minor unit is the
 * server's business, as it prices from the catalogue.
 */
export function parsePrice(text: string | null | undefined): number | null {
    const t = (text ?? '').trim();
    if (!t || /^any( amount)?$/i.test(t)) return null;
    const m = /^[^\d-]*(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?\s*$/.exec(t);
    if (!m) return NaN;
    const whole = Number(m[1].replace(/,/g, ''));
    const fraction = m[2] ? Number(m[2].padEnd(2, '0')) : 0;
    return whole * 100 + fraction;
}

/** Minor units as money in `currency` (an ISO code), in the page's language. */
export function formatPrice(minor: number, currency = 'GBP', locale?: string): string {
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
    } catch {
        return (minor / 100).toFixed(2);
    }
}

function clampQuantity(line: Pick<CartLine, 'unit' | 'max'>, quantity: number): number {
    if (!Number.isFinite(quantity)) return 0;
    const cap = Math.min(line.unit === null ? 1 : MaxQuantity, line.max ?? MaxQuantity);
    return Math.max(0, Math.min(Math.floor(quantity), cap));
}

function isLine(value: unknown): value is CartLine {
    const v = value as CartLine;
    return !!v && typeof v.item === 'string' && v.item.length > 0 && typeof v.name === 'string'
        && (v.unit === null || (Number.isInteger(v.unit) && v.unit >= 0))
        && Number.isInteger(v.quantity) && v.quantity > 0
        && (v.max === undefined || (Number.isInteger(v.max) && v.max >= 0))
        && [v.amount, v.minAmount, v.maxAmount].every(n => n === undefined || (Number.isInteger(n) && n >= 0));
}

/** Whether a donation's amount is filled in and inside its limits. */
export function amountOk(line: Pick<CartLine, 'amount' | 'minAmount' | 'maxAmount'>): boolean {
    const a = line.amount;
    return a !== undefined && Number.isInteger(a) && a >= (line.minAmount ?? DefaultMinAmount)
        && (line.maxAmount === undefined || a <= line.maxAmount);
}

/** A basket kept under `key` in `storage`. Every change is saved and told to the subscribers. */
export class CartStore {
    private items: CartLine[] = [];
    private readonly listeners = new Set<() => void>();

    constructor(readonly key: string, private readonly storage: CartStorage = null) {
        this.load();
    }

    /** Reads the basket again from storage (another tab changed it). */
    load(): void {
        let lines: CartLine[] = [];
        try {
            const raw = this.storage?.getItem(this.key);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.v === 1 && Array.isArray(parsed.lines)) lines = parsed.lines.filter(isLine).slice(0, MaxLines);
        } catch {
            lines = [];
        }
        this.items = lines.map(l => ({ ...l, quantity: clampQuantity(l, l.quantity) })).filter(l => l.quantity > 0);
    }

    get lines(): readonly CartLine[] {
        return this.items.map(l => ({ ...l }));
    }

    /** How many things, counting quantities. */
    get count(): number {
        return this.items.reduce((n, l) => n + l.quantity, 0);
    }

    /** The priced lines' total, in minor units. */
    get total(): number {
        return this.items.reduce((n, l) => n + (l.unit ?? (amountOk(l) ? l.amount! : 0)) * l.quantity, 0);
    }

    /** Whether an "any amount" line (a donation) has no allowed amount yet, so the total isn't the whole of it. */
    get hasAnyAmount(): boolean {
        return this.items.some(l => l.unit === null && !amountOk(l));
    }

    /** Whether checkout can start: something in the basket, and every donation's amount filled in and allowed. */
    get ready(): boolean {
        return this.items.length > 0 && this.items.every(l => l.unit !== null || amountOk(l));
    }

    /** Sets a donation's amount (minor units; null or NaN clears it). Kept as typed: `ready` says whether it's allowed. */
    setAmount(item: string, amount: number | null): void {
        const line = this.items.find(l => l.item === item && l.unit === null);
        if (!line) return;
        if (amount === null || !Number.isInteger(amount) || amount < 0) delete line.amount;
        else line.amount = amount;
        this.changed();
    }

    quantityOf(item: string): number {
        return this.items.find(l => l.item === item)?.quantity ?? 0;
    }

    /** Adds `quantity` of a thing (capped by its stock); returns how many are in the basket now. */
    add(thing: Omit<CartLine, 'quantity'>, quantity = 1): number {
        const line = this.items.find(l => l.item === thing.item);
        if (line) {
            line.name = thing.name;
            line.unit = thing.unit;
            if (thing.max !== undefined) line.max = thing.max;
            if (thing.minAmount !== undefined) line.minAmount = thing.minAmount;
            if (thing.maxAmount !== undefined) line.maxAmount = thing.maxAmount;
            if (line.amount === undefined && thing.amount !== undefined) line.amount = thing.amount;
            line.quantity = clampQuantity(line, line.quantity + quantity);
        } else {
            if (this.items.length >= MaxLines) return 0;
            const fresh: CartLine = { ...thing, quantity: 0 };
            fresh.quantity = clampQuantity(fresh, quantity);
            if (fresh.quantity > 0) this.items.push(fresh);
        }
        this.items = this.items.filter(l => l.quantity > 0);
        this.changed();
        return this.quantityOf(thing.item);
    }

    /** Sets a line's quantity (capped by its stock); 0 removes it. */
    setQuantity(item: string, quantity: number): void {
        const line = this.items.find(l => l.item === item);
        if (!line) return;
        line.quantity = clampQuantity(line, quantity);
        this.items = this.items.filter(l => l.quantity > 0);
        this.changed();
    }

    remove(item: string): void {
        this.setQuantity(item, 0);
    }

    clear(): void {
        if (!this.items.length) return;
        this.items = [];
        this.changed();
    }

    /**
     * The shop's stock (item → how many can be bought). Each line takes its `max` from it, and a line over its stock
     * comes down (to nothing when it's sold). Returns the items whose quantity went down. Items not named keep theirs.
     */
    setStock(stock: Record<string, number>): string[] {
        const lowered: string[] = [];
        for (const line of this.items) {
            const left = stock[line.item];
            if (typeof left !== 'number' || !Number.isFinite(left)) continue;
            line.max = Math.max(0, Math.floor(left));
            const quantity = clampQuantity(line, line.quantity);
            if (quantity < line.quantity) lowered.push(line.item);
            line.quantity = quantity;
        }
        this.items = this.items.filter(l => l.quantity > 0);
        if (lowered.length) this.changed();
        return lowered;
    }

    /** What checkout is given: items and quantities only. */
    checkoutLines(): CheckoutLine[] {
        return this.items.map(l => l.unit === null && amountOk(l)
            ? { item: l.item, quantity: l.quantity, amount: l.amount! }
            : { item: l.item, quantity: l.quantity });
    }

    /** Calls `listener` after every change; returns the way to stop. */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private changed(): void {
        try {
            if (this.items.length) this.storage?.setItem(this.key, JSON.stringify({ v: 1, lines: this.items }));
            else this.storage?.removeItem(this.key);
        } catch {
            // Storage full or blocked (a private window): the basket still works for this page.
        }
        for (const listener of this.listeners) listener();
    }
}
