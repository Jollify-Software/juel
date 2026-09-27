// Loaded on demand by dashboard.html's `module="./dashboard-reports.js"` route
// — nothing in this file exists until Reports is first opened. A module= route
// has to be a separate file next to the page (it can't come from example.js),
// so this one is hand-written JS rather than TypeScript.

// Stand in for a slow chunk download, so the router's `navigating` attribute
// (the progress bar at the top of the shell) is actually visible.
await new Promise(resolve => setTimeout(resolve, 900));

const ROWS = [
    ['Q1 revenue by region', 'Finance', '2026-04-02'],
    ['Churn cohort analysis', 'Growth', '2026-05-18'],
    ['Despatch times vs carrier', 'Operations', '2026-06-30'],
    ['Top 20 accounts', 'Sales', '2026-08-11'],
];

customElements.define('dash-reports', class extends HTMLElement {
    connectedCallback() {
        this.className = 'view';
        this.dispatchEvent(new CustomEvent('dash-crumbs', {
            detail: [{ label: 'Reports' }], bubbles: true, composed: true,
        }));
        this.innerHTML = `
            <h1>Reports</h1>
            <p class="hint">
                This view's module was fetched the first time you opened the route — watch the
                progress bar at the top of the shell on a first visit, and note that the sidebar and
                the previous view stay put while it loads.
            </p>
            <div class="panels">
                <section class="panel">
                    <h2>Orders by month</h2>
                    <div class="chart-box">
                        <juel-chart type="bar" labels="Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep">
                            <juel-chart-series label="Orders" color="#007bff"
                                data="14, 18, 21, 16, 19, 17, 15, 20, 10"></juel-chart-series>
                        </juel-chart>
                    </div>
                </section>
                <section class="panel">
                    <h2>Saved reports</h2>
                    <ul class="list-rows">
                        ${ROWS.map(([name, owner, run]) => `
                            <li>
                                <span>${name}</span>
                                <span class="recent-who">${owner}</span>
                                <span class="recent-date">last run ${run}</span>
                            </li>`).join('')}
                    </ul>
                </section>
            </div>`;
    }
});
