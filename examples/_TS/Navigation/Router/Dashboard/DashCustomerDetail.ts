import { esc } from '../../../_Utils/esc';
import { DashView } from './DashView';
import { Customer, fakeFetchCustomer, fakeFetchOrders, href, money, Order, routerOf } from './data';

// Tabs are *flat* routes, not nested ones: the route is
// `/customers/:id/*` and this view picks its tab from `rest`. See the
// "Questions it should answer" note in TODO.md — trying it this way is how the
// example answers whether step 7 (nested routes) is needed.
const TABS = ['profile', 'orders', 'notes'];

export class DashCustomerDetail extends DashView {
    protected async render() {
        const id = String(this.params.id);
        const tab = (this.rest || '').replace(/^\//, '') || 'profile';
        const index = Math.max(0, TABS.indexOf(tab));

        this.crumbs([{ label: 'Customers', path: '/customers' }, { label: 'Customer ' + id }]);
        this.innerHTML = `<h1>Customer ${esc(id)}</h1>${this.loading('customer')}`;

        const [customer, orders] = await Promise.all([
            fakeFetchCustomer(id),
            fakeFetchOrders({ customerId: Number(id) }),
        ]);
        if (!this.isConnected) return;

        if (!customer) {
            // An in-view "not found", distinct from the router's not-found
            // route: the path is a known route, the record isn't there.
            this.innerHTML = `
                <h1>No customer ${esc(id)}</h1>
                <p>There's no customer with that id. It may have been deleted.</p>
                <p><a href="${href('/customers')}">&larr; All customers</a></p>`;
            return;
        }

        this.crumbs([{ label: 'Customers', path: '/customers' }, { label: customer.name }]);
        this.innerHTML = `
            <h1>${esc(customer.name)}</h1>
            <p class="subtitle">${esc(customer.company)} · ${esc(customer.country)} · joined ${esc(customer.joined)}</p>
            <div class="panel tabs-panel">
                <juel-tabs selectedIndex="${index}">
                    <juel-tab title="Profile">${profile(customer)}</juel-tab>
                    <juel-tab title="Orders (${orders.length})">${orderList(orders)}</juel-tab>
                    <juel-tab title="Notes"><p>${esc(customer.notes)}</p></juel-tab>
                </juel-tabs>
            </div>
            <p><a href="${href('/customers')}">&larr; All customers</a></p>`;

        const tabs = this.querySelector('juel-tabs');
        // Each tab is its own URL, so it's linkable and survives a reload.
        tabs.addEventListener('tab-changed', (e: CustomEvent) => {
            if (!this.isConnected) return;
            routerOf(this).navigate(`/customers/${id}/${TABS[e.detail.index]}`, { replace: true });
        });
    }
}

function profile(c: Customer): string {
    return `<dl class="fields">
        <dt>Name</dt><dd>${esc(c.name)}</dd>
        <dt>Company</dt><dd>${esc(c.company)}</dd>
        <dt>Email</dt><dd>${esc(c.email)}</dd>
        <dt>Country</dt><dd>${esc(c.country)}</dd>
        <dt>Customer since</dt><dd>${esc(c.joined)}</dd>
    </dl>`;
}

function orderList(orders: Order[]): string {
    if (!orders.length) return '<p>No orders yet.</p>';
    return `<ul class="recent">${orders.map(o => `
        <li>
            <a href="${href('/orders/' + o.id)}">#${o.id}</a>
            <span class="recent-who">${esc(o.date)}</span>
            <span class="status status-${o.status}">${o.status}</span>
            <span class="recent-total">${money(o.total)}</span>
        </li>`).join('')}</ul>`;
}

customElements.define('dash-customer-detail', DashCustomerDetail);
