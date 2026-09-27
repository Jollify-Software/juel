import { DashView } from './DashView';
import { Customer, fakeFetchCustomers, routerOf } from './data';

export class DashCustomerList extends DashView {
    private all: Customer[] = [];

    protected async render() {
        this.crumbs([{ label: 'Customers' }]);
        this.innerHTML = `<h1>Customers</h1>${this.loading('customers')}`;

        this.all = await fakeFetchCustomers();
        if (!this.isConnected) return;

        this.innerHTML = `
            <h1>Customers</h1>
            <div class="toolbar">
                <input class="filter" type="search" placeholder="Filter by name, company or country"
                    aria-label="Filter customers" />
                <span class="count"></span>
            </div>
            <div class="panel">
                <juel-table selection="single"></juel-table>
            </div>
            <p class="hint">
                Rows live in <code>&lt;juel-table&gt;</code>'s shadow DOM, so there are no links to
                click — the table fires <code>row-activated</code> and this view calls
                <code>router.navigate()</code>. Arrow keys move between rows and Enter opens one, so
                it works without a mouse.
            </p>`;

        const filter = this.querySelector('.filter') as HTMLInputElement;
        filter.addEventListener('input', () => this.fill(filter.value));
        this.fill('');

        // row-activated, not cell-clicked: it fires for Enter/Space as well as
        // for a click, so keyboard users can open a customer too.
        this.querySelector('juel-table').addEventListener('row-activated', (e: CustomEvent) => {
            const id = e.detail.row?.ID;
            if (id != null) routerOf(this).navigate(`/customers/${id}`);
        });
    }

    private fill(term: string) {
        const needle = term.trim().toLowerCase();
        const rows = needle
            ? this.all.filter(c => (c.name + ' ' + c.company + ' ' + c.country).toLowerCase().includes(needle))
            : this.all;
        const table = this.querySelector('juel-table') as HTMLElement & { data: unknown[] };
        table.data = rows.map(c => ({ ID: c.id, Name: c.name, Company: c.company, Country: c.country, Joined: c.joined }));
        this.querySelector('.count').textContent =
            `${rows.length} of ${this.all.length}${needle ? ` matching “${term.trim()}”` : ''}`;
    }
}

customElements.define('dash-customer-list', DashCustomerList);
