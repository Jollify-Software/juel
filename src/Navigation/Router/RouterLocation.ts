// Pure URL <-> router-path conversion for juel-router's URL-bound modes. No
// `window`/`location` access — the current URL is always passed in — so it
// can be unit-tested (tests/util/routerLocationTests.ts).
//
// history: the router path is the URL's pathname below `base`, plus search.
//          https://site/app/users/2?tab=1  (base "/app")  ->  /users/2?tab=1
// hash:    the router path is everything after "#", and only hashes starting
//          "#/" count — a plain "#section" stays an ordinary in-page anchor.
//          https://site/page.html#/users/2  ->  /users/2

import { normalizePath } from './RouteMatcher';

export type UrlMode = 'history' | 'hash';

// "" and "/" mean no base; otherwise a leading slash and no trailing one.
export function normalizeBase(base: string): string {
    const normalized = normalizePath(base ?? '');
    return normalized === '/' ? '' : normalized;
}

// The history-mode base a router uses. An explicit `base` (even "") wins;
// otherwise it comes from the page's <base href>, like Blazor and Angular.
// A base href is a URL whose *directory* relative links resolve against, so
// "/app/" and "/app/index.html" both mean "/app", while "/app" (no trailing
// slash) means the site root — the same way the browser resolves
// <a href="users"> under it. A <base> on another origin can't be a route
// prefix and is ignored.
export function resolveBase(explicit: string | null, baseHref: string | null, documentUrl: URL): string {
    if (explicit !== null && explicit !== undefined) return normalizeBase(explicit);
    if (!baseHref) return '';
    let url: URL;
    try {
        url = new URL(baseHref, documentUrl);
    } catch {
        return '';
    }
    if (url.origin !== documentUrl.origin) return '';
    return normalizeBase(url.pathname.slice(0, url.pathname.lastIndexOf('/') + 1));
}

// The router path a URL represents, or null when the URL isn't one of this
// router's (outside `base`, or a non-route hash).
export function pathFromUrl(url: URL, mode: UrlMode, base: string): string | null {
    if (mode === 'hash') {
        if (url.hash === '' || url.hash === '#') return '/';
        return url.hash.startsWith('#/') ? url.hash.slice(1) : null;
    }

    const prefix = normalizeBase(base);
    let pathname = url.pathname;
    if (prefix) {
        if (pathname !== prefix && !pathname.startsWith(prefix + '/')) return null;
        pathname = pathname.slice(prefix.length) || '/';
    }
    return pathname + url.search;
}

// The absolute URL to push for a router path (which may carry ?search and
// #hash). Always same-origin as `current`.
export function urlForPath(to: string, mode: UrlMode, base: string, current: URL): string {
    // Collapse leading slashes/backslashes: "//evil.example" or "\\evil.example"
    // would otherwise parse as a protocol-relative, cross-origin URL.
    const target = '/' + (to ?? '').replace(/^[\/\\]+/, '');

    let url: URL;
    if (mode === 'hash') {
        url = new URL(current.href);
        url.hash = target;
    } else {
        url = new URL(normalizeBase(base) + target, current.origin);
    }

    if (url.origin !== current.origin) {
        throw new Error(`juel-router: refusing to navigate off-origin to "${to}"`);
    }
    return url.href;
}

// What a clicked link should navigate the router to, or null to leave the
// click to the browser (other origin, outside base, in-page anchor, ...).
export function linkTarget(url: URL, mode: UrlMode, base: string, current: URL): string | null {
    if (url.origin !== current.origin) return null;
    const sameDocument = url.pathname === current.pathname && url.search === current.search;

    if (mode === 'hash') {
        if (!sameDocument) return null;
        return url.hash.startsWith('#/') ? url.hash.slice(1) : null;
    }

    // Same document with only a fragment -> an in-page anchor jump.
    if (sameDocument && url.hash) return null;
    const path = pathFromUrl(url, 'history', base);
    return path === null ? null : path + url.hash;
}
