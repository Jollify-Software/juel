import { esc } from '../../../_Utils/esc';
import { DashView } from './DashView';
import { customerName, fakeFetchSummary, href, money } from './data';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export class DashOverview extends DashView {
    protected async render() {
        this.crumbs([{ label: 'Overview' }]);
        this.innerHTML = this.loading('overview');

        const summary = await fakeFetchSummary();
        // The route may have changed while loading — this element is then
        // detached and rendering into it is wasted work.
        if (!this.isConnected) return;

        const labels = summary.months
            .map(m => MONTH_NAMES[Number(m.slice(5)) - 1]).join(', ');
        const revenue = summary.revenueByMonth.join(', ');
        const { open, shipped, cancelled } = summary.statusCounts;

        this.innerHTML = `
            <h1>Overview</h1>
            <div class="tiles">
                ${tile('Revenue', money(summary.revenue), 'excluding cancelled')}
                ${tile('Open orders', String(summary.openOrders), 'awaiting despatch')}
                ${tile('Customers', String(summary.customers), 'all active')}
                ${tile('Average order', money(summary.averageOrder), 'per completed order')}
            </div>
            <div class="panels">
                <section class="panel">
                    <h2>Revenue by month</h2>
                    <div class="chart-box">
                        <juel-chart type="line" labels="${esc(labels)}">
                            <juel-chart-series label="Revenue" color="#007bff" data="${esc(revenue)}"></juel-chart-series>
                        </juel-chart>
                    </div>
                </section>
                <section class="panel">
                    <h2>Orders by status</h2>
                    <div class="chart-box">
                        <juel-chart type="doughnut">
                            <juel-chart-series label="Open" color="#007bff" data="${open}"></juel-chart-series>
                            <juel-chart-series label="Shipped" color="#28a745" data="${shipped}"></juel-chart-series>
                            <juel-chart-series label="Cancelled" color="#dc3545" data="${cancelled}"></juel-chart-series>
                        </juel-chart>
                    </div>
                </section>
            </div>
            <section class="panel">
                <h2>Recent orders</h2>
                <ul class="recent">
                    ${summary.recent.map(o => `
                        <li>
                            <a href="${href('/orders/' + o.id)}">#${o.id}</a>
                            <span class="recent-who">${esc(customerName(o.customerId))}</span>
                            <span class="status status-${o.status}">${o.status}</span>
                            <span class="recent-total">${money(o.total)}</span>
                        </li>`).join('')}
                </ul>
                <p><a href="${href('/orders')}">All orders &rarr;</a></p>
            </section>`;
    }
}

function tile(label: string, value: string, note: string): string {
    return `<div class="tile">
        <span class="tile-label">${esc(label)}</span>
        <strong class="tile-value">${esc(value)}</strong>
        <span class="tile-note">${esc(note)}</span>
    </div>`;
}

customElements.define('dash-overview', DashOverview);
