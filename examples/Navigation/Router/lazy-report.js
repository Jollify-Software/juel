// Loaded on demand by the router example's `module="./lazy-report.js"` route —
// nothing in this file exists until that route is first visited.

// Simulate a slow network so the router's `navigating` state is visible.
await new Promise(resolve => setTimeout(resolve, 800));

customElements.define('demo-report', class extends HTMLElement {
    connectedCallback() {
        this.className = 'view';
        this.innerHTML = `<h3>Reports</h3><p>This view's module was fetched the first time you opened the route.</p>`;
    }
});
