// Entry point for examples/example.js — custom elements and helpers used by the
// example pages. Build with `npm run examples` from the repo root.
//
// Like src/, each examples folder gets a barrel Import.ts, at the same path
// under _TS/ as the page(s) it serves under examples/.
import { routerExamples } from './Navigation/Router/Import';

// Anything a page's inline script needs to reach (rather than just use as a
// custom element) hangs off window.examples.
const examples = {
    router: routerExamples,
};

declare global {
    interface Window {
        examples: typeof examples;
    }
}

window.examples = examples;
