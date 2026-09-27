import { RouteView } from './RouteView';

export class DemoChart extends RouteView {
    protected render() {
        this.innerHTML = `<h3>Chart</h3><p>Defined by this route's <code>load()</code>, on first visit.</p>`;
    }
}

// Deliberately NOT defined when example.js loads: the router example's JS
// route table defines it from a lazy load() function, via
// window.examples.router.defineDemoChart.
export function defineDemoChart() {
    if (!customElements.get('demo-chart')) {
        customElements.define('demo-chart', DemoChart);
    }
}
