// <juel-buy-button>: puts one thing in the page's `<juel-cart>`. "Add to basket"; "Sold" when none are left (and
// the host gets a `sold` attribute, so a theme can grey the card out); "In your basket" when the basket already
// holds all there are. `buy-now` adds it and goes straight to checkout. A price of "any" is any amount (a donation).
//
//   <juel-buy-button item="p-7f3a" name="Blue wool coat" price="12.50" stock="1"></juel-buy-button>
//
// The stock in the attribute is the page's (as published); the cart's live stock, when the checkout server tells
// it, wins. The price is only shown and kept in the basket: the checkout server prices from its own catalogue.
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { parsePrice } from '../Cart/CartStore';
import type { CartChangeDetail, CartStockDetail, JuelCart } from '../Cart/Cart';

@customElement('juel-buy-button')
export class JuelBuyButton extends LitElement {

    static styles = css`
        :host { display: inline-block; }
        button {
            font: inherit; cursor: pointer; padding: 0.5em 1em; border: 0; border-radius: var(--cart-radius, 8px);
            background: var(--cart-accent, #2563eb); color: var(--cart-on-accent, #fff); font-weight: 600;
        }
        button:disabled { cursor: default; opacity: 0.55; }
        :host([sold]) button {
            background: transparent; color: inherit; opacity: 1;
            border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
        }
    `;

    /** The item's id in the shop's catalogue (never changes, so a renamed item keeps its sales). */
    @property() item = '';
    /** Its name in the basket. */
    @property() name = '';
    /** Its price as written ("12.50"), or "any" for any amount. */
    @property() price = '';
    /** How many there are, as published. */
    @property({ type: Number }) stock?: number;
    /** Any amount only: the amount filled in to start with ("5"), and the least and most allowed ("1", "500"). */
    @property() amount = '';
    @property({ attribute: 'min-amount' }) minAmount = '';
    @property({ attribute: 'max-amount' }) maxAmount = '';
    /** A selector for the cart, when the page has more than one; otherwise the page's first `<juel-cart>`. */
    @property() cart = '';
    /** Add it and go straight to checkout. */
    @property({ type: Boolean, attribute: 'buy-now' }) buyNow = false;
    /** None left: set by the button, for styling. */
    @property({ type: Boolean, reflect: true }) sold = false;
    /** Words. */
    @property() label = 'Add to basket';
    @property({ attribute: 'buy-now-label' }) buyNowLabel = 'Buy now';
    @property({ attribute: 'sold-label' }) soldLabel = 'Sold';
    @property({ attribute: 'added-label' }) addedLabel = 'Added';
    @property({ attribute: 'full-label' }) fullLabel = 'In your basket';

    @state() private liveStock?: number;
    @state() private inBasket = 0;
    @state() private added = false;
    private addedTimer?: number;

    private readonly onChange = (e: Event) => {
        const lines = (e as CustomEvent<CartChangeDetail>).detail?.lines;
        if (Array.isArray(lines) && this.ownCart(e)) this.inBasket = lines.find(l => l.item === this.item)?.quantity ?? 0;
    };
    private readonly onStock = (e: Event) => {
        const stock = (e as CustomEvent<CartStockDetail>).detail?.stock;
        if (stock && this.ownCart(e) && typeof stock[this.item] === 'number') this.liveStock = stock[this.item];
    };

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('juel-cart-change', this.onChange);
        document.addEventListener('juel-cart-stock', this.onStock);
        void customElements.whenDefined('juel-cart').then(() => this.sync());
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('juel-cart-change', this.onChange);
        document.removeEventListener('juel-cart-stock', this.onStock);
        clearTimeout(this.addedTimer);
    }

    /** The cart this button fills. */
    findCart(): JuelCart | null {
        return (this.cart ? document.querySelector(this.cart) : document.querySelector('juel-cart')) as JuelCart | null;
    }

    private ownCart(e: Event): boolean {
        return e.composedPath().includes(this.findCart() as EventTarget);
    }

    private sync() {
        const cart = this.findCart();
        if (!cart) return;
        this.inBasket = cart.quantityOf(this.item);
        const live = cart.stockOf(this.item);
        if (live !== undefined) this.liveStock = live;
    }

    /** How many can still be bought, when known. */
    get left(): number | undefined {
        return this.liveStock ?? (Number.isFinite(this.stock) ? this.stock : undefined);
    }

    protected willUpdate() {
        this.sold = this.left === 0;
    }

    private async press() {
        const cart = this.findCart();
        const unit = parsePrice(this.price);
        if (!cart || !this.item || Number.isNaN(unit)) return;
        const left = this.left;
        const name = this.name || this.textContent?.trim() || this.item;
        const money = (text: string) => { const v = parsePrice(text); return v === null || Number.isNaN(v) ? undefined : v; };
        const anyAmount = unit === null ? Object.fromEntries(Object.entries({
            amount: money(this.amount), minAmount: money(this.minAmount), maxAmount: money(this.maxAmount),
        }).filter(([, v]) => v !== undefined)) : {};
        this.inBasket = cart.add({ item: this.item, name, unit, ...anyAmount, ...(left === undefined ? {} : { max: left }) });
        if (unit === null && !this.buyNow) cart.open = true; // the amount is chosen in the basket
        if (this.buyNow) { await cart.checkout(); return; }
        this.added = true;
        clearTimeout(this.addedTimer);
        this.addedTimer = window.setTimeout(() => { this.added = false; }, 1500);
    }

    render() {
        const unit = parsePrice(this.price);
        const left = this.left;
        const full = left !== undefined && left > 0 && this.inBasket >= left;
        const words = this.sold ? this.soldLabel : full ? this.fullLabel : this.added ? this.addedLabel
            : this.buyNow ? this.buyNowLabel : this.label;
        return html`<button part="button" ?disabled=${this.sold || full || !this.item || Number.isNaN(unit)}
            @click=${() => this.press()}>${words}</button>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'juel-buy-button': JuelBuyButton;
    }
}
