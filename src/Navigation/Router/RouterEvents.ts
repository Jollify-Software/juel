export enum RouterEvents {
    // Fired after the outlet's content changes — a different route matched,
    // the same route matched with a different path, or nothing matched.
    RouteChanged = "route-changed",
    // A route's guard returned false; the router stayed where it was.
    RouteBlocked = "route-blocked",
    // Entering a route threw — a guard or lazy load failed, or redirects
    // looped. The router stayed where it was.
    RouteError = "route-error",
    // On `window`, whenever a juel-router writes the URL (pushState and
    // replaceState don't fire popstate). Listen for it plus `popstate` to
    // see every location change, including query-only ones, which don't fire
    // route-changed.
    LocationChanged = "juel-router-location-changed"
}
