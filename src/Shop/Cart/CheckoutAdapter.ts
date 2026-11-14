// Where `<juel-cart>` sends a checkout. The basket owns the look; an adapter owns the money. The first adapter is
// Jollify's server (SHOP-PLAN §5): it prices the lines from the shop's catalogue, holds the stock, and answers with
// a Stripe Checkout page on the seller's own account. Others (Snipcart) can follow as adapters.
import type { CheckoutLine } from './CartStore';

/** A checkout's answer: the payment page to go to, or why not (with the stock now, when that was the reason). */
export type CheckoutResult = { url: string } | { error: string; stock?: Record<string, number> };

/** How the buyer gets their things, when the shop offers postage: collect (no address asked) or post. */
export type Delivery = 'collect' | 'post';

export interface CheckoutOptions {
    /** Only when the shop offers postage; otherwise the shop's own way (collection). */
    delivery?: Delivery;
}

export interface CheckoutAdapter {
    /** Starts paying for `lines`. Never throws: a failure is `{ error }`. */
    checkout(lines: CheckoutLine[], options?: CheckoutOptions): Promise<CheckoutResult>;
    /** How many of each item can be bought now (item → count), when the adapter knows; null when it can't say. */
    stock?(): Promise<Record<string, number> | null>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

const Unavailable = 'The shop can’t take payments just now. Please try again in a few minutes.';

function stockOf(value: unknown): Record<string, number> | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const out: Record<string, number> = {};
    for (const [item, count] of Object.entries(value as Record<string, unknown>)) {
        if (typeof count === 'number' && Number.isFinite(count) && count >= 0) out[item] = Math.floor(count);
    }
    return out;
}

/**
 * The Jollify server's checkout for shop `shop` at `server` (its origin, e.g. `https://jollify.app`). The contract
 * (the server half is SHOP-PLAN SP2):
 *
 *   POST {server}/api/shop/{shop}/checkout   { lines: [{ item, quantity, amount? }], delivery? }
 *     amount: a donation's, in minor units (the server checks it against the item's least and most);
 *     delivery: 'collect' | 'post', when the shop offers postage (post asks for the address, collect doesn't)
 *     200 { url }                    the Stripe Checkout page
 *     409 { error, stock }           some things sold out or ran short; `stock` is item → count left
 *     4xx/5xx { error? }             anything else; `error` is shown when it's there
 *   GET  {server}/api/shop/{shop}/stock      200 { stock: { item: count } }
 *
 * Only an `https:` (or `http:` on localhost) URL is followed.
 */
export function jollifyCheckout(server: string, shop: string, fetchFn: FetchLike = (u, i) => fetch(u, i)): CheckoutAdapter {
    const base = `${server.replace(/\/+$/, '')}/api/shop/${encodeURIComponent(shop)}`;
    return {
        async checkout(lines, options) {
            try {
                const response = await fetchFn(`${base}/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(options?.delivery ? { lines, delivery: options.delivery } : { lines }),
                });
                const body = await response.json().catch(() => ({})) as { url?: unknown; error?: unknown; stock?: unknown };
                if (response.ok && typeof body.url === 'string' && isPaymentUrl(body.url)) return { url: body.url };
                const error = typeof body.error === 'string' && body.error ? body.error : Unavailable;
                return response.status === 409 ? { error, stock: stockOf(body.stock) } : { error };
            } catch {
                return { error: Unavailable };
            }
        },
        async stock() {
            try {
                const response = await fetchFn(`${base}/stock`);
                if (!response.ok) return null;
                const body = await response.json() as { stock?: unknown };
                return stockOf(body.stock) ?? null;
            } catch {
                return null;
            }
        },
    };
}

/** A payment page we'll send a buyer to: https, or http on this machine (test mode). */
export function isPaymentUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'));
    } catch {
        return false;
    }
}
