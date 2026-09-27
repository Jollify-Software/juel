// Pure path matching for juel-router — no DOM, no History API, so it can be
// unit-tested in isolation (tests/util/routeMatcherTests.ts).
//
// Pattern syntax:
//   /users            static segment
//   /users/:id        named param, matches exactly one non-empty segment
//   /files/*          trailing wildcard, matches zero or more segments
//
// Matching is case-sensitive. Leading/trailing/duplicate slashes, a query
// string and a hash fragment are all ignored on the path being matched, so
// "/users/", "users" and "/users?page=2" all match "/users".

export type RouteParams = Record<string, string>;

export interface RouteMatch {
    // Decoded values of every :param segment, keyed by name.
    params: RouteParams;
    // For a wildcard pattern, the segments the `*` consumed, as a normalized
    // path ("/a/b", or "" when it consumed nothing). Always "" otherwise.
    rest: string;
}

type Segment =
    | { kind: 'static'; value: string }
    | { kind: 'param'; name: string }
    | { kind: 'wildcard' };

export interface CompiledRoute {
    pattern: string;
    segments: Segment[];
}

function splitPath(path: string): string[] {
    const end = path.search(/[?#]/);
    const pathname = end === -1 ? path : path.slice(0, end);
    return pathname.split('/').filter(s => s.length > 0);
}

// Canonical form of a path: leading slash, no trailing/duplicate slashes, no
// query or hash. "" and "/" both normalize to "/".
export function normalizePath(path: string): string {
    return '/' + splitPath(path ?? '').join('/');
}

export function compileRoute(pattern: string): CompiledRoute {
    const parts = splitPath(pattern ?? '');
    const names = new Set<string>();
    const segments = parts.map((part, i): Segment => {
        if (part === '*') {
            if (i !== parts.length - 1) {
                throw new Error(`Route "${pattern}": "*" is only allowed as the last segment`);
            }
            return { kind: 'wildcard' };
        }
        if (part.startsWith(':')) {
            const name = part.slice(1);
            if (!name) {
                throw new Error(`Route "${pattern}": a ":" param needs a name`);
            }
            if (names.has(name)) {
                throw new Error(`Route "${pattern}": duplicate param ":${name}"`);
            }
            names.add(name);
            return { kind: 'param', name };
        }
        return { kind: 'static', value: part };
    });
    return { pattern, segments };
}

function decodeSegment(segment: string): string | null {
    try {
        return decodeURIComponent(segment);
    } catch {
        // Malformed percent-encoding ("%E0%A4%A") — treat as no match rather
        // than throwing out of a navigation.
        return null;
    }
}

export function matchRoute(route: CompiledRoute | string, path: string): RouteMatch | null {
    const compiled = typeof route === 'string' ? compileRoute(route) : route;
    const parts = splitPath(path ?? '');
    const params: RouteParams = {};

    for (let i = 0; i < compiled.segments.length; i++) {
        const segment = compiled.segments[i];
        if (segment.kind === 'wildcard') {
            return { params, rest: parts.length > i ? '/' + parts.slice(i).join('/') : '' };
        }
        if (i >= parts.length) return null;
        if (segment.kind === 'static') {
            if (parts[i] !== segment.value) return null;
        } else {
            const value = decodeSegment(parts[i]);
            if (value === null) return null;
            params[segment.name] = value;
        }
    }

    return parts.length === compiled.segments.length ? { params, rest: '' } : null;
}

// Names of a pattern's :params, and whether it ends in a wildcard — used to
// check a redirect target only uses what its route actually captures.
export function routeInputs(route: CompiledRoute | string): { params: string[]; wildcard: boolean } {
    const compiled = typeof route === 'string' ? compileRoute(route) : route;
    return {
        params: compiled.segments.flatMap(s => s.kind === 'param' ? [s.name] : []),
        wildcard: compiled.segments.some(s => s.kind === 'wildcard'),
    };
}

// Fill a pattern back in: ":name" from `params` (URI-encoded), a trailing "*"
// from `rest`. The inverse of matchRoute — used for redirects like
// "/people/:id" -> "/users/:id".
export function buildPath(pattern: string, params: RouteParams, rest = ''): string {
    const compiled = compileRoute(pattern);
    const parts = compiled.segments.map(segment => {
        if (segment.kind === 'static') return segment.value;
        if (segment.kind === 'wildcard') return rest.replace(/^\/+/, '');
        if (params[segment.name] === undefined) {
            throw new Error(`Route "${pattern}": no value for ":${segment.name}"`);
        }
        return encodeURIComponent(params[segment.name]);
    });
    return normalizePath(parts.join('/'));
}

// A route title with ":name" placeholders filled from params — "User :id".
// Unknown placeholders are left as written.
export function fillTitle(template: string, params: RouteParams): string {
    return template.replace(/:([A-Za-z0-9_$]+)/g, (token, name) => params[name] ?? token);
}

// How a link to `linkPath` relates to the current path, as an aria-current
// value: "page" for the current page itself, "true" for a section containing
// it (a /users link while on /users/2), null otherwise. The root link is
// never a section — every path is "inside" "/".
export function linkCurrent(linkPath: string, currentPath: string): 'page' | 'true' | null {
    const link = normalizePath(linkPath);
    const current = normalizePath(currentPath);
    if (link === current) return 'page';
    if (link !== '/' && current.startsWith(link + '/')) return 'true';
    return null;
}

// First route in table order wins — the same rule as Express, so a catch-all
// ("/*") belongs at the end of the table.
export function findRoute<R extends { path: string }>(
    routes: readonly R[],
    path: string
): { route: R; index: number; match: RouteMatch } | null {
    for (let index = 0; index < routes.length; index++) {
        const match = matchRoute(routes[index].path, path);
        if (match) return { route: routes[index], index, match };
    }
    return null;
}
