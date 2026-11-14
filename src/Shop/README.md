# Shop

A basket for a shop's pages: `<juel-cart>` and `<juel-buy-button>`. Built for Jollify's Shop website template
(`jollify/SHOP-PLAN.md`), but nothing here knows Jollify except the default checkout adapter.

```html
<juel-cart shop="sues-shop" server="https://jollify.app" currency="GBP"></juel-cart>

<juel-buy-button item="p-7f3a" name="Blue wool coat" price="12.50" stock="1"></juel-buy-button>
<juel-buy-button item="d-1" name="A donation" price="any" label="Donate"></juel-buy-button>
```

- **The basket lives in the browser** (`localStorage`, one per `shop`), so it survives a reload and the shop's other
  pages, and other tabs follow (`storage` events). Prices are whole minor units (pence) in `CartStore`.
- **The page's prices are only shown.** Checkout sends items and quantities, nothing else. The checkout server
  prices them from its own catalogue (a page can be changed by anyone).
- **Stock:** `stock` on a buy button is the page's, as published. When the checkout adapter can say what's left
  (`stock()`), the cart asks as it loads and after a refused checkout, and every buy button follows (`juel-cart-stock`).
  None left: the button says Sold and its host gets `sold`, so a theme can grey out the card
  (`.product:has(juel-buy-button[sold])`).
- **Any amount** (`price="any"`): a donation. One per basket. The buyer types the amount **in the basket** (Stripe's
  own "customer chooses" price can't share a session with other things): `amount` fills it in to start with, and
  `min-amount` / `max-amount` set the limits (£1 at least when not given). Checkout waits until it's allowed, and
  sends it as the line's `amount`. The checkout server checks it against the same limits. It's the one figure a
  server takes from the page.
- **Collect or post** (`postage="3.50"` on the cart): the basket offers "Collect from the shop" (the default) or
  "Post it to me (£3.50)", adds the postage to the total when posted, and tells checkout which (`delivery`). The
  choice is in the basket, not on the payment page, so a buyer who collects isn't asked for an address. With no
  `postage`, there's no choice and no `delivery`.
- **The thank-you page:** `<juel-cart shop="…" clear>` empties the basket as the page loads.
- **Back without paying:** the payment page sends a buyer who cancels back to the Shop page with
  `?jollify_cancel=<hold>`. The cart takes it out of the address, tells the adapter (`cancel(hold)`, so the checkout's
  stock is free at once), refreshes the stock and opens the basket, still holding their things.

## Checkout adapters

`<juel-cart>` hands checkout to an adapter (`CheckoutAdapter`): `checkout(lines)` answers `{ url }` (the payment page
to go to) or `{ error, stock? }`, and never throws. `stock()` is optional. Set one from script (`cart.adapter = …`)
for tests or another provider. Without one, `server` + `shop` make Jollify's (`jollifyCheckout`):

```
POST {server}/api/shop/{shop}/checkout   { lines: [{ item, quantity, amount? }], delivery? }
  200 { url }              the Stripe Checkout page (https, or http on localhost)
  409 { error, stock }     things sold out or ran short; stock = item → count left
  other { error? }         shown to the buyer, or a plain "try again later"
GET  {server}/api/shop/{shop}/stock      200 { stock: { item: count } }
```

Before going to the payment page, the cart fires a cancelable `juel-cart-checkout` (`detail.url`). Cancel it to
handle the page yourself (a test, a pop-up).

## Events

| Event | Detail | When |
|---|---|---|
| `juel-cart-change` | `{ count, total, lines }` | after any change, and once as the cart loads |
| `juel-cart-stock` | `{ stock }` | when the adapter said what's left |
| `juel-cart-checkout` | `{ url }` (cancelable) | just before going to the payment page |

## Styling

Tokens on `<juel-cart>` (and read by buy buttons): `--cart-accent`, `--cart-on-accent`, `--cart-background`,
`--cart-color`, `--cart-border`, `--cart-radius`. Parts: `toggle`, `count`, `panel`, `checkout` (cart), `button`
(buy button). Every word is an attribute (`label`, `checkout-label`, `sold-label`, …).

Tests: `tests/Shop/` (the store and the adapter, Jest) and `tests/e2e/shop.spec.ts` (the example page,
`examples/Shop/shop.html`, with a fake checkout).
