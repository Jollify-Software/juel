import { esc } from '../../../_Utils/esc';
import { DashView } from './DashView';
import { customerName, fakeFetchOrders, href, money, OrderStatus, routerOf } from './data';

const FILTERS: { label: string; status?: OrderStatus }[] = [
    { label: 'All' },
    { label: 'Open', status: 'open' },
    { label: 'Shipped', status: 'shipped' },
    { label: 'Cancelled', status: 'cancelled' },
];

// The status filter lives in the query string, which is the one thing the
// router deliberately doesn't react to: matching and the remount key ignore
// "?…", so a query-only change neither remounts the view nor fires
// route-changed. Nor can the view just listen to the location — the router
// navigates with history.pushState, which fires neither `hashchange` nor
// `popstate`. So this view drives its own filter:
//   · chip click  — preventDefault, navigate() for the URL, then refill
//   · back/forward — popstate, which pushState-made entries do fire
//   · reload / a pasted URL — read at render time
// What that leaves uncovered is somewhere *else* in the app navigating to
// /orders?status=… — this view would not notice. See TODO.md.
export class DashOrderList extends DashView {
    private loadToken = 0;
    private onPopState = () => this.fill();

    protected render() {
        this.crumbs([{ label: 'Orders' }]);
        this.innerHTML = `
            <h1>Orders</h1>
            <div class="toolbar">
                <div class="filters" role="group" aria-label="Filter by status">
                    ${FILTERS.map(f => `<a class="chip" data-status="${f.status ?? ''}"
                        href="${href('/orders' + (f.status ? '?status=' + f.status : ''))}">${f.label}</a>`).join('')}
                </div>
                <span class="count"></span>
            </div>
            <div class="panel" id="order-rows">${this.loading('orders')}</div>
            <p class="hint">
                The filter is a query string, and the router treats a query-only change as the same
                route — no remount, no <code>route-changed</code>. The chips are still real,
                shareable URLs; this view just does the refiltering itself. Back and forward work.
            </p>`;

        this.querySelector('.filters').addEventListener('click', (e: MouseEvent) => {
            const chip = (e.target as HTMLElement).closest('.chip') as HTMLAnchorElement;
            // Leave modifier-clicks to the browser, exactly as the router does.
            if (!chip || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            const status = chip.dataset.status;
            routerOf(this).navigate('/orders' + (status ? '?status=' + status : ''));
            this.fill(status || null);
        });

        this.fill();
        window.addEventListener('popstate', this.onPopState);
    }

    disconnectedCallback() {
        window.removeEventListener('popstate', this.onPopState);
    }

    // `status` is passed when a chip click already knows it (the router hasn't
    // finished writing the URL yet at that point); otherwise it comes from the
    // current path.
    private async fill(status?: OrderStatus | string | null) {
        const raw = status !== undefined ? status : this.query().get('status');
        const effective = FILTERS.some(f => f.status === raw) ? raw as OrderStatus : null;

        this.querySelectorAll('.chip').forEach(chip =>
            chip.classList.toggle('chip-on', (chip as HTMLElement).dataset.status === (effective ?? '')));

        const token = ++this.loadToken;
        const orders = await fakeFetchOrders(effective ? { status: effective } : undefined);
        // A second filter click while this one was in flight wins.
        if (!this.isConnected || token !== this.loadToken) return;

        this.querySelector('.count').textContent =
            `${orders.length} order${orders.length === 1 ? '' : 's'}${effective ? ` · ${effective}` : ''}`;
        this.querySelector('#order-rows').innerHTML = orders.length
            ? `<ul class="list-rows">${orders.map(o => `
                <li>
                    <a href="${href('/orders/' + o.id)}">#${o.id}</a>
                    <span class="recent-who">${esc(customerName(o.customerId))}</span>
                    <span class="recent-date">${esc(o.date)}</span>
                    <span class="status status-${o.status}">${o.status}</span>
                    <span class="recent-total">${money(o.total)}</span>
                </li>`).join('')}</ul>`
            : '<p>No orders with that status.</p>';
    }
}

customElements.define('dash-order-list', DashOrderList);
