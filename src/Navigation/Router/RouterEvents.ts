export enum RouterEvents {
    // Fired after the outlet's content changes — a different route matched,
    // the same route matched with a different path, or nothing matched.
    RouteChanged = "route-changed",
    // A route's guard returned false; the router stayed where it was.
    RouteBlocked = "route-blocked",
    // Entering a route threw — a guard or lazy load failed, or redirects
    // looped. The router stayed where it was.
    RouteError = "route-error"
}
