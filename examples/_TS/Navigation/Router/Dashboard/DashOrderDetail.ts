import { esc } from '../../../_Utils/esc';
import { DashView } from './DashView';
import { customerName, fakeFetchOrder, href, money } from './data';

export class DashOrderDetail extends DashView {
    protected async render() {
        const id = String(this.params.id);
        this.crumbs([{ label: 'Orders', path: '/orders' }, { label: '#' + id }]);
        this.innerHTML = `<h1>Order #${esc(id)}</h1>${this.loading('order')}`;

        const order = await fakeFetchOrder(id);
        if (!this.isConnected) return;

        if (!order) {
            this.innerHTML = `
                <h1>No order #${esc(id)}</h1>
                <p><a href="${href('/orders')}">&larr; All orders</a></p>`;
            return;
        }

        this.innerHTML = `
            <h1>Order #${order.id} <span class="status status-${order.status}">${order.status}</span></h1>
            <div class="panel">
                <dl class="fields">
                    <dt>Customer</dt>
                    <dd><a href="${href('/customers/' + order.customerId)}">${esc(customerName(order.customerId))}</a></dd>
                    <dt>Placed</dt><dd>${esc(order.date)}</dd>
                    <dt>Items</dt><dd>${order.items}</dd>
                    <dt>Total</dt><dd>${money(order.total)}</dd>
                </dl>
            </div>
            <p class="hint">
                The customer link crosses into another section, so the sidebar's
                <b>Customers</b> entry takes over <code>aria-current</code> — the router marks links
                page-wide, not just its own.
            </p>
            <p><a href="${href('/orders')}">&larr; All orders</a></p>`;
    }
}

customElements.define('dash-order-detail', DashOrderDetail);
