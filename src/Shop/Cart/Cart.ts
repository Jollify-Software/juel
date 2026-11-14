// <juel-cart>: a shop's basket. A button with the count, and a panel with the lines (more, fewer, remove), the
// total and Checkout. The basket is kept in the browser (localStorage, per shop), so it survives a reload and the
// shop's other pages; Checkout hands the lines (items and quantities only) to a checkout adapter. See README.md.
//
//   <juel-cart shop="sues-shop" server="https://jollify.app" currency="GBP"></juel-cart>
//   <juel-buy-button item="p-7f3a" name="Blue wool coat" price="12.50" stock="1"></juel-buy-button>
//
// On the thank-you page, `<juel-cart shop="…" clear>` empties the basket once paid.
import { LitElement, PropertyValues, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CartLine, CartStorage, CartStore, DefaultMinAmount, MaxQuantity, amountOk, formatPrice, parsePrice } from './CartStore';
import { CheckoutAdapter, Delivery, jollifyCheckout } from './CheckoutAdapter';

/** Detail of `juel-cart-change`: the basket after a change. */
export interface CartChangeDetail {
    count: number;
    total: number;
    lines: CartLine[];
}

/** Detail of `juel-cart-stock`: how many of each item can be bought (item → count), as last heard. */
export interface CartStockDetail {
    stock: Record<string, number>;
}

/** Detail of `juel-cart-checkout` (cancelable): the payment page about to open. */
export interface CartCheckoutDetail {
    url: string;
}

function browserStorage(): CartStorage {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

const BasketIcon = html`<svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9h18l-2 11H5z"/><path d="M8 9l4-6 4 6"/><path d="M9 13v4M15 13v4"/></svg>`;

@customElement('juel-cart')
export class JuelCart extends LitElement {

    static styles = css`
        :host {
            --cart-accent: #2563eb;
            --cart-on-accent: #fff;
            --cart-background: Canvas;
            --cart-color: CanvasText;
            --cart-border: color-mix(in srgb, currentColor 20%, transparent);
            --cart-radius: 8px;
            display: inline-block;
            position: relative;
            font: inherit;
        }
        button { font: inherit; cursor: pointer; }
        button:disabled { cursor: default; opacity: 0.5; }
        .toggle {
            display: inline-flex; align-items: center; gap: 0.4em; padding: 0.4em 0.8em;
            border: 1px solid var(--cart-border); border-radius: var(--cart-radius);
            background: var(--cart-background); color: var(--cart-color);
        }
        .count {
            min-width: 1.4em; padding: 0 0.35em; border-radius: 999px; text-align: center;
            background: var(--cart-accent); color: var(--cart-on-accent); font-size: 0.85em;
        }
        .count[hidden] { display: none; }
        .panel {
            position: absolute; inset-inline-end: 0; top: calc(100% + 6px); z-index: 1000;
            width: min(22rem, calc(100vw - 2rem)); box-sizing: border-box; padding: 0.8em;
            border: 1px solid var(--cart-border); border-radius: var(--cart-radius);
            background: var(--cart-background); color: var(--cart-color);
            box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
        }
        .panel[hidden] { display: none; }
        .lines { list-style: none; margin: 0 0 0.8em; padding: 0; display: grid; gap: 0.5em; }
        .line { display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 0.5em; }
        .name { overflow-wrap: anywhere; }
        .qty { display: inline-flex; align-items: center; gap: 0.25em; }
        .qty button, .remove {
            width: 1.8em; height: 1.8em; padding: 0; border: 1px solid var(--cart-border); border-radius: 50%;
            background: transparent; color: inherit; line-height: 1;
        }
        .qty output { min-width: 1.5em; text-align: center; }
        .price { text-align: end; white-space: nowrap; }
        .any { font-style: italic; opacity: 0.8; }
        .total { display: flex; justify-content: space-between; gap: 0.5em; margin: 0 0 0.8em; }
        .empty { margin: 0 0 0.8em; opacity: 0.8; }
        .message { margin: 0 0 0.8em; color: #b91c1c; }
        .amount { display: inline-flex; align-items: center; gap: 0.25em; }
        .amount input { width: 5.5em; font: inherit; padding: 0.2em 0.3em; border: 1px solid var(--cart-border); border-radius: 4px; }
        .hint { grid-column: 1 / -1; margin: 0; font-size: 0.85em; color: #b91c1c; }
        .delivery { border: 0; margin: 0 0 0.8em; padding: 0; display: grid; gap: 0.3em; }
        .delivery label { display: flex; align-items: center; gap: 0.4em; }
        .checkout {
            width: 100%; padding: 0.6em; border: 0; border-radius: var(--cart-radius);
            background: var(--cart-accent); color: var(--cart-on-accent); font-weight: 600;
        }
    `;

    /** The shop's id on the checkout server; also keeps this shop's basket apart from another's. */
    @property() shop = '';
    /** The checkout server's origin, for the Jollify adapter (e.g. `https://jollify.app`). */
    @property() server = '';
    /** The prices' currency (ISO 4217). */
    @property() currency = 'GBP';
    /** Empty the basket when the page loads: the thank-you page after paying. */
    @property({ type: Boolean }) clear = false;
    /** The panel is showing. */
    @property({ type: Boolean, reflect: true }) open = false;
    /** A flat postage price ("3.50"): the basket then offers Collect or Post. None: collection only, no choice. */
    @property() postage = '';
    /** Words. */
    @property() label = 'Basket';
    @property({ attribute: 'checkout-label' }) checkoutLabel = 'Checkout';
    @property({ attribute: 'empty-label' }) emptyLabel = 'Your basket is empty.';
    @property({ attribute: 'total-label' }) totalLabel = 'Total';
    @property({ attribute: 'any-amount-label' }) anyAmountLabel = 'your donation';
    @property({ attribute: 'busy-label' }) busyLabel = 'One moment…';
    @property({ attribute: 'not-set-up-label' }) notSetUpLabel = 'This shop isn’t taking payments yet.';
    @property({ attribute: 'sold-out-label' }) soldOutLabel = 'Some things have just sold, so your basket has changed.';
    @property({ attribute: 'amount-label' }) amountLabel = 'How much?';
    @property({ attribute: 'at-least-label' }) atLeastLabel = 'At least';
    @property({ attribute: 'at-most-label' }) atMostLabel = 'At most';
    @property({ attribute: 'collect-label' }) collectLabel = 'Collect from the shop';
    @property({ attribute: 'post-label' }) postLabel = 'Post it to me';

    /** Set from script to use another checkout (a test, Snipcart); otherwise Jollify's, from `server` and `shop`. */
    adapter?: CheckoutAdapter;

    @state() private busy = false;
    @state() private message = '';
    @state() private version = 0;
    /** Collect or post, when the shop offers postage. */
    @state() delivery: Delivery = 'collect';

    private basket?: CartStore;
    private stockNow: Record<string, number> = {};
    private unsubscribe?: () => void;
    private readonly onStorage = (e: StorageEvent) => {
        if (this.basket && e.key === this.basket.key) { this.basket.load(); this.changed(); }
    };
    private readonly onDocumentClick = (e: MouseEvent) => {
        // A buy button's click can open the basket (a donation's amount is chosen there): that isn't "outside".
        const path = e.composedPath();
        if (this.open && !path.includes(this) && !path.some(t => (t as Element).tagName === 'JUEL-BUY-BUTTON')) this.open = false;
    };
    private readonly onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.open) {
            this.open = false;
            this.renderRoot.querySelector<HTMLButtonElement>('.toggle')?.focus();
        }
    };

    /** The postage in minor units, or null when the shop doesn't post. */
    get postageAmount(): number | null {
        const p = parsePrice(this.postage);
        return p === null || Number.isNaN(p) ? null : p;
    }

    /** The basket's total as the page knows it, with postage when it's posted. */
    get total(): number {
        const postage = this.postageAmount;
        return this.store.total + (postage !== null && this.delivery === 'post' ? postage : 0);
    }

    /** The basket. */
    get store(): CartStore {
        if (!this.basket) this.useStore();
        return this.basket!;
    }

    private useStore() {
        this.unsubscribe?.();
        this.basket = new CartStore(`juel-cart:${this.shop || location.pathname}`, browserStorage());
        this.unsubscribe = this.basket.subscribe(() => this.changed());
    }

    private get checkoutAdapter(): CheckoutAdapter | undefined {
        return this.adapter ?? (this.server && this.shop ? jollifyCheckout(this.server, this.shop) : undefined);
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('storage', this.onStorage);
        document.addEventListener('click', this.onDocumentClick);
        this.addEventListener('keydown', this.onKey);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('storage', this.onStorage);
        document.removeEventListener('click', this.onDocumentClick);
        this.removeEventListener('keydown', this.onKey);
    }

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has('shop') && (this.basket || changed.get('shop') !== undefined)) this.useStore();
    }

    protected firstUpdated() {
        if (this.clear) this.store.clear();
        this.changed();
        void this.refreshStock();
    }

    /** Asks the checkout how many of each thing are left, and brings the basket and the buy buttons into line. */
    async refreshStock(): Promise<void> {
        const stock = await this.checkoutAdapter?.stock?.();
        if (stock) this.takeStock(stock);
    }

    /** How many of `item` can be bought, when known. */
    stockOf(item: string): number | undefined {
        return this.stockNow[item];
    }

    quantityOf(item: string): number {
        return this.store.quantityOf(item);
    }

    /** Adds a thing; returns how many are in the basket now. */
    add(thing: Omit<CartLine, 'quantity' | 'max'> & { max?: number }, quantity = 1): number {
        this.message = '';
        const max = thing.max ?? this.stockNow[thing.item];
        return this.store.add({ ...thing, ...(max === undefined ? {} : { max }) }, quantity);
    }

    /** Hands the basket to the checkout and, when it answers with a payment page, goes there. */
    async checkout(): Promise<void> {
        if (this.busy || !this.store.count) return;
        if (!this.store.ready) { this.open = true; return; }
        const adapter = this.checkoutAdapter;
        if (!adapter) { this.message = this.notSetUpLabel; this.open = true; return; }
        this.busy = true;
        this.message = '';
        try {
            const options = this.postageAmount !== null ? { delivery: this.delivery } : undefined;
            const result = await adapter.checkout(this.store.checkoutLines(), options);
            if ('url' in result) {
                const go = this.dispatchEvent(new CustomEvent<CartCheckoutDetail>('juel-cart-checkout',
                    { detail: { url: result.url }, bubbles: true, composed: true, cancelable: true }));
                if (go) location.assign(result.url);
                return;
            }
            const lowered = result.stock ? this.takeStock(result.stock) : [];
            this.message = lowered.length ? this.soldOutLabel : result.error;
            this.open = true;
        } finally {
            this.busy = false;
        }
    }

    private takeStock(stock: Record<string, number>): string[] {
        this.stockNow = { ...this.stockNow, ...stock };
        const lowered = this.store.setStock(stock);
        this.dispatchEvent(new CustomEvent<CartStockDetail>('juel-cart-stock', { detail: { stock: { ...this.stockNow } }, bubbles: true, composed: true }));
        this.version++;
        return lowered;
    }

    private changed() {
        this.version++;
        const store = this.store;
        this.dispatchEvent(new CustomEvent<CartChangeDetail>('juel-cart-change',
            { detail: { count: store.count, total: store.total, lines: [...store.lines] }, bubbles: true, composed: true }));
    }

    private cap(line: CartLine) {
        return Math.min(line.unit === null ? 1 : MaxQuantity, line.max ?? MaxQuantity);
    }

    private renderAmount(line: CartLine, money: (minor: number) => string) {
        const least = line.minAmount ?? DefaultMinAmount;
        const typed = line.amount;
        const hint = typed === undefined || amountOk(line) ? ''
            : typed < least ? `${this.atLeastLabel} ${money(least)}` : `${this.atMostLabel} ${money(line.maxAmount!)}`;
        return html`
            <label class="amount">${this.amountLabel}
                <input type="text" inputmode="decimal" autocomplete="off" aria-invalid=${hint ? 'true' : 'false'}
                    value=${typed === undefined ? '' : (typed / 100).toFixed(2)}
                    @input=${(e: Event) => this.store.setAmount(line.item, parsePrice((e.target as HTMLInputElement).value))}>
            </label><span></span>
            ${hint ? html`<p class="hint" role="alert">${hint}</p>` : nothing}`;
    }

    render() {
        const store = this.store;
        const lines = store.lines;
        const count = store.count;
        const money = (minor: number) => formatPrice(minor, this.currency, document.documentElement.lang || undefined);
        const postage = this.postageAmount;
        return html`
            <button class="toggle" part="toggle" aria-expanded=${this.open ? 'true' : 'false'} aria-controls="panel"
                @click=${() => { this.open = !this.open; }}>
                <slot name="icon">${BasketIcon}</slot><span class="label">${this.label}</span>
                <span class="count" part="count" ?hidden=${!count} aria-label=${`${count} in the basket`}>${count}</span>
            </button>
            <div id="panel" class="panel" part="panel" role="dialog" aria-label=${this.label} ?hidden=${!this.open}>
                ${lines.length ? html`
                    <ul class="lines">${lines.map(line => html`
                        <li class="line" data-item=${line.item}>
                            <span class="name">${line.name}</span>
                            ${line.unit === null ? this.renderAmount(line, money) : html`
                                <span class="qty">
                                    <button class="less" aria-label=${`One fewer: ${line.name}`}
                                        @click=${() => store.setQuantity(line.item, line.quantity - 1)}>−</button>
                                    <output aria-label="How many">${line.quantity}</output>
                                    <button class="more" aria-label=${`One more: ${line.name}`} ?disabled=${line.quantity >= this.cap(line)}
                                        @click=${() => store.setQuantity(line.item, line.quantity + 1)}>+</button>
                                </span>
                                <span class="price">${money(line.unit * line.quantity)}</span>`}
                            <button class="remove" aria-label=${`Remove: ${line.name}`} @click=${() => store.remove(line.item)}>×</button>
                        </li>`)}
                    </ul>
                    ${postage !== null ? html`
                        <fieldset class="delivery">
                            <label><input type="radio" name="delivery" value="collect" .checked=${this.delivery === 'collect'}
                                @change=${() => { this.delivery = 'collect'; }}>${this.collectLabel}</label>
                            <label><input type="radio" name="delivery" value="post" .checked=${this.delivery === 'post'}
                                @change=${() => { this.delivery = 'post'; }}>${this.postLabel} (${money(postage)})</label>
                        </fieldset>` : nothing}
                    <div class="total"><span>${this.totalLabel}</span>
                        <strong>${money(this.total)}${store.hasAnyAmount ? ` + ${this.anyAmountLabel}` : ''}</strong></div>`
                    : html`<p class="empty">${this.emptyLabel}</p>`}
                ${this.message ? html`<p class="message" role="alert">${this.message}</p>` : nothing}
                <button class="checkout" part="checkout" ?disabled=${!store.ready || this.busy} @click=${() => this.checkout()}>
                    ${this.busy ? this.busyLabel : this.checkoutLabel}</button>
            </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'juel-cart': JuelCart;
    }
}
