import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { NavigationBase } from '../NavigationBase';
import { DomReady } from '../../_Utils/DomReady';
import { buildPath, fillTitle, findRoute, linkCurrent, normalizePath, routeInputs, RouteMatch, RouteParams } from './RouteMatcher';
import { linkTarget, pathFromUrl, resolveBase, urlForPath, UrlMode } from './RouterLocation';
import { RouterEvents } from './RouterEvents';

export interface RouteContext {
    // Where the navigation is going (may carry ?search / #hash) ...
    path: string;
    params: RouteParams;
    rest: string;
    // ... and the path currently shown, or null before anything was.
    from: string | null;
}

// true / undefined: continue. false: stay where you are. A string: go there
// instead.
export type RouteGuardResult = boolean | string | void;
export type RouteGuard = (context: RouteContext) => RouteGuardResult | Promise<RouteGuardResult>;

export interface RouteDefinition {
    // Pattern — see RouteMatcher.ts for the syntax.
    path: string;
    // Tag name of the custom element to mount when the route matches.
    // Optional only for a `redirect` route.
    element?: string;
    // Send this route somewhere else. May reuse the route's own :params and
    // "*" — `{ path: '/people/:id', redirect: '/users/:id' }`.
    redirect?: string;
    // Runs before entering the route; see RouteGuardResult.
    beforeEnter?: RouteGuard;
    // Lazy loading: called (and awaited) before mounting, to define
    // `element` — typically `() => import('./views/Admin')`.
    load?: () => Promise<unknown>;
    // document.title while the route is shown: a string with ":param"
    // placeholders ("User :id"), or a function of the route context.
    title?: string | ((context: RouteContext) => string);
    // Lazy loading without a bundler: URL of an ES module that defines
    // `element`, resolved against the document's base URL.
    module?: string;
}

// The properties the router sets on a mounted element, before it's connected
// — so they're already there when its connectedCallback runs.
export interface RoutedElement extends HTMLElement {
    params?: RouteParams;
    rest?: string;
}

export interface RouteChangedDetail {
    path: string;
    route: RouteDefinition | null;
    element: RoutedElement | null;
    params: RouteParams;
    rest: string;
    // True when no route matched — `element` is then the `not-found` element,
    // or null if none is set.
    notFound: boolean;
}

export interface RouteBlockedDetail {
    path: string;
    route: RouteDefinition;
    from: string | null;
}

export interface RouteErrorDetail {
    path: string;
    route: RouteDefinition | null;
    error: unknown;
}

export interface NavigateOptions {
    // Replace the current history entry instead of pushing a new one.
    replace?: boolean;
}

// history: path is the URL pathname below `base` — needs the server to serve
//          the app's page for every route URL.
// hash:    path lives after "#/" — works on any static host.
// memory:  the URL is never read or written; `path` is the only input.
export type RouterMode = 'history' | 'hash' | 'memory';

// How a transition started, which decides what "commit" and "undo" mean:
// push/replace — navigate(); the URL hasn't changed yet and is only written
//                once the transition is allowed.
// sync         — the path already changed underneath the router (back/forward,
//                a typed URL, `path` set in memory mode, a route-table edit),
//                so a block has to put it back.
type TransitionKind = 'push' | 'replace' | 'sync';

// Why a transition started — decides whether focus and scroll react.
// navigate — navigate(), a link click, or `path` set in a URL mode
// popstate — back/forward
// path     — any other path change (memory-mode `path`, a typed hash URL, a
//            sibling router's navigation)
// refresh  — the route table changed, or the first resolution
type TransitionCause = 'navigate' | 'popstate' | 'path' | 'refresh';

export type FocusOnNavigate = 'view' | 'none';
export type ScrollOnNavigate = 'top' | 'none';
export type AnnounceNavigation = 'title' | 'none';

// Window scroll positions per history entry, for scroll-on-navigate="top".
// Entries are told apart by a key the router puts in history.state.
const scrollPositions = new Map<string, { x: number; y: number }>();
const STATE_KEY = 'juelRouterKey';

function newEntryKey(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function entryKey(): string | null {
    const state = history.state;
    return state && typeof state === 'object' && typeof state[STATE_KEY] === 'string' ? state[STATE_KEY] : null;
}

// The current entry's key, adding one if it has none (e.g. the page's first
// entry). Leaves non-object states alone — they can't carry a key.
function ensureEntryKey(): string | null {
    const existing = entryKey();
    if (existing) return existing;
    const state = history.state;
    if (state !== null && typeof state !== 'object') return null;
    const key = newEntryKey();
    history.replaceState({ ...(state ?? {}), [STATE_KEY]: key }, '');
    return key;
}

// pushState/replaceState don't fire popstate, so a router that changes the URL
// announces it for any other URL-bound routers on the page to resync.
const LOCATION_CHANGED = 'juel-router-location-changed';

const MAX_REDIRECTS = 10;
const DEFINE_TIMEOUT_MS = 3000;
// How long to keep trying to put back a restored scroll position. A view
// that fetches its rows is only its loading state when the restore first
// runs, so the document is too short and the browser clamps the scroll to
// the bottom of what exists — which for a list view is usually 0.
const SCROLL_RESTORE_MS = 1000;

// Loads an ES module by URL for `module` routes. Not `import(url)`: Parcel
// rewrites that into its own require() when bundling juel.js, and hiding it
// from the bundler (`new Function`) would need 'unsafe-eval' under a CSP. A
// module <script>'s load event fires after the module has run. Its own
// errors surface on window rather than here — the router then reports the
// element as never defined.
const modules = new Map<string, Promise<void>>();
function loadModule(url: string): Promise<void> {
    const href = new URL(url, document.baseURI).href;
    let loading = modules.get(href);
    if (!loading) {
        loading = new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = href;
            script.onload = () => resolve();
            script.onerror = () => {
                // Let a later navigation try again.
                modules.delete(href);
                script.remove();
                reject(new Error(`couldn't load module ${href}`));
            };
            document.head.appendChild(script);
        });
        modules.set(href, loading);
    }
    return loading;
}

// Declarative route table entry. Renders nothing — <juel-router> reads its
// attributes, plus the `beforeEnter` / `load` properties if set.
@customElement('juel-route')
export class JuelRoute extends LitElement {
    @property({ type: String }) path = '';
    @property({ type: String }) element = '';
    @property({ type: String }) redirect = '';
    @property({ type: String }) module = '';
    @property({ attribute: false }) beforeEnter?: RouteGuard;
    @property({ attribute: false }) load?: () => Promise<unknown>;

    static styles = css`:host { display: none; }`;

    render() {
        return html``;
    }
}

// Mounts the custom element of whichever route matches `path` as its own
// light-DOM child (the outlet), replacing whatever was mounted before.
//
// Routes come from the `routes` property when it's set, otherwise from
// <juel-route> direct children, in document order; first match wins.
//
// In the URL-bound modes (history, the default, and hash) `path` follows the
// URL: back/forward and navigate() update it, and setting it pushes a history
// entry. Same-origin <a href> clicks inside the router that match a route are
// handled without a page load.
//
// Entering a route can be asynchronous (a guard awaiting an auth check, a
// lazy-loaded view); the current view stays mounted meanwhile and the router
// has the `navigating` attribute.
@customElement('juel-router')
export class JuelRouter extends NavigationBase {
    @property({ type: String }) path = '/';

    @property({ type: String }) mode: RouterMode = 'history';

    // History mode only: the URL prefix the app lives under ("/app" makes
    // https://site/app/users the route "/users"). Unset, it comes from the
    // page's <base href> (as in Blazor/Angular) — see resolveBase; set it
    // (even to "") to override that.
    @property({ type: String }) base: string | null = null;

    // Tag name mounted when no route matches. Left unset, the outlet is
    // simply emptied.
    @property({ type: String, attribute: 'not-found' }) notFound = '';

    // document.title while the not-found view is shown. `not-found` is only a
    // tag name, so there's no route element to carry a title="…" and without
    // this the tab keeps the title of wherever you came from.
    @property({ type: String, attribute: 'not-found-title' }) notFoundTitle = '';

    // JS route table. Takes precedence over <juel-route> children when set.
    @property({ attribute: false }) routes: RouteDefinition[] | null = null;

    // Reflects while a guard or lazy load is in progress.
    @property({ type: Boolean, reflect: true }) navigating = false;

    // "view" (default): after a navigation, focus moves to the new view (made
    // focusable with tabindex="-1" if it isn't already), so keyboard and
    // screen-reader users land on the new content. "none": leave focus alone.
    // Never applies to the first view shown.
    @property({ type: String, attribute: 'focus-on-navigate' }) focusOnNavigate: FocusOnNavigate = 'view';

    // "top": a navigation scrolls the window to the top (or, in history mode,
    // to the #hash target); back/forward restore where you were. "none"
    // (default): the router doesn't touch scrolling — right for a router that
    // isn't the whole page.
    @property({ type: String, attribute: 'scroll-on-navigate' }) scrollOnNavigate: ScrollOnNavigate = 'none';

    // "title" (default): after a navigation the route's resolved title is put
    // into a visually-hidden live region, so a screen reader says where it has
    // landed. Moving focus alone (focus-on-navigate) doesn't do that — the
    // user hears the new view's first content with no indication the page
    // changed. Routes with no `title` announce nothing; "none" turns it off.
    @property({ type: String, attribute: 'announce-navigation' }) announceNavigation: AnnounceNavigation = 'title';

    // What the live region is currently saying.
    @state() private _announcement = '';

    private _mounted: RoutedElement | null = null;
    private _mountedRoute: RouteDefinition | null = null;
    // What's shown now: resolution key (normalized path + route), the path
    // as set, and — in URL modes — the URL it was shown at.
    private _committed: { key: string; path: string; href: string | null } | null = null;
    // Latest transition wins; an older one still awaiting a guard or load
    // sees a different id afterwards and gives up.
    private _transitionId = 0;
    private _pending: { key: string; kind: TransitionKind; promise: Promise<boolean> } | null = null;
    private _observer?: MutationObserver;
    // URL-bound modes only: links anywhere on the page are this router's.
    private _documentObserver?: MutationObserver;
    private _documentBound = false;
    private _connected = false;
    private _domReady = false;
    private readonly _reported = new Set<string>();
    // Set by popstate so the transition it causes knows it was back/forward.
    private _popstate = false;
    // The history entry being shown — whose scroll position to save when
    // back/forward leaves it.
    private _entryKey: string | null = null;
    // history.scrollRestoration before scroll-on-navigate="top" took it over.
    private _savedScrollRestoration: ScrollRestoration | null = null;
    // Bumped by every scroll attempt, so a newer navigation (or a user scroll)
    // abandons an older restore that's still retrying.
    private _scrollAttempt = 0;
    // Links this router set aria-current on, so it only ever removes its own.
    private readonly _currentLinks = new Set<HTMLAnchorElement>();
    private _linksQueued = false;

    static styles = css`
        :host {
            display: block;
        }
        /* A view focused after navigation isn't interactive itself, so a
           focus ring around the whole of it only adds noise. Page styles win
           over ::slotted, so an app can put one back. */
        ::slotted([tabindex="-1"]:focus) {
            outline: none;
        }
        /* Visible to a screen reader, to nothing else. Not display:none and
           not hidden — either would stop it being announced. */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            margin: -1px;
            padding: 0;
            border: 0;
            overflow: hidden;
            clip: rect(0 0 0 0);
            clip-path: inset(50%);
            white-space: nowrap;
        }
    `;

    constructor() {
        super();
        this.ripple = false;
        this.addEventListener('click', this._onClick);
    }

    get currentElement(): RoutedElement | null {
        return this._mounted;
    }

    get currentRoute(): RouteDefinition | null {
        return this._mountedRoute;
    }

    private get _urlMode(): UrlMode {
        return this.mode === 'hash' ? 'hash' : 'history';
    }

    private get _base(): string {
        const baseElement = document.querySelector('base[href]');
        return resolveBase(this.base, baseElement ? baseElement.getAttribute('href') : null, new URL(location.href));
    }

    // Where this router's links are: the whole page when it owns the URL (so
    // an app's nav bar needn't sit inside the router), just its own subtree
    // in memory mode.
    private get _linkScope(): ParentNode {
        return this.mode === 'memory' ? this : document;
    }

    // Go to `to` (a route path, optionally with ?search / #hash). Resolves
    // true once the new view is shown, false if a guard blocked it, a load
    // failed, or a later navigation superseded it.
    navigate(to: string, options: NavigateOptions = {}): Promise<boolean> {
        const kind: TransitionKind = options.replace ? 'replace' : 'push';
        if (!this._connected || !this._domReady) {
            // Nothing to resolve against yet — just record where to start.
            this._writeLocation(to, kind);
            return Promise.resolve(false);
        }
        return this._transition(to, kind, 0, 'navigate');
    }

    connectedCallback() {
        super.connectedCallback();
        this._connected = true;

        window.addEventListener('popstate', this._onPopState);
        window.addEventListener('hashchange', this._syncFromLocation);
        window.addEventListener(LOCATION_CHANGED, this._syncFromLocation);
        // Before the first update, so the initial `path` comes from the URL
        // rather than the default being pushed over it.
        this._syncFromLocation();
        this._entryKey = entryKey();
        this._applyScrollRestoration();
        this._bindDocument();

        // <juel-route> children can be added, removed or edited at any time —
        // including after connection, since the parser may not have reached
        // them yet when a script-loaded router upgrades. Links can come and go
        // too (a view rendering), and need their aria-current set.
        this._observer = new MutationObserver(mutations => {
            if (mutations.some(m => this._affectsRouteTable(m))) {
                this._resolve('refresh');
            }
            if (mutations.some(m => m.type === 'childList' ? m.addedNodes.length > 0 : m.target instanceof HTMLAnchorElement)) {
                this._queueLinkUpdate();
            }
        });
        this._observer.observe(this, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['path', 'element', 'redirect', 'module', 'href', 'target', 'download', 'rel'],
        });

        // Wait for the parser to finish so the first resolution sees every
        // <juel-route>, rather than resolving to "no match" and immediately
        // re-resolving as children arrive.
        DomReady().then(() => {
            this._domReady = true;
            this._resolve('refresh');
        });
    }

    disconnectedCallback() {
        this._connected = false;
        this._transitionId++;
        this._pending = null;
        this.navigating = false;
        window.removeEventListener('popstate', this._onPopState);
        window.removeEventListener('hashchange', this._syncFromLocation);
        window.removeEventListener(LOCATION_CHANGED, this._syncFromLocation);
        this._observer?.disconnect();
        this._observer = undefined;
        this._applyScrollRestoration();
        this._bindDocument();
        this._clearLinks();
        super.disconnectedCallback();
    }

    updated(changedProperties: Map<string | number | symbol, unknown>) {
        super.updated(changedProperties);

        // `navigating` says "a guard or a lazy load is in flight" to CSS;
        // aria-busy says the same thing to assistive tech, which otherwise
        // has no way to tell that the still-mounted old view is stale.
        if (changedProperties.has('navigating')) {
            if (this.navigating) this.setAttribute('aria-busy', 'true');
            else this.removeAttribute('aria-busy');
        }

        const initial = changedProperties.has('path') && changedProperties.get('path') === undefined;
        if (!initial && (changedProperties.has('mode') || changedProperties.has('base'))) {
            this._syncFromLocation();
        }
        if (changedProperties.has('mode') || changedProperties.has('scrollOnNavigate')) {
            this._applyScrollRestoration();
        }
        if (changedProperties.has('mode')) {
            this._bindDocument();
            this._queueLinkUpdate();
        }
        // `path` set directly (not from the URL) in a URL-bound mode: treat it
        // as navigate(). Skipped for the initial value, which came from the
        // URL — or, for a non-route hash, must not overwrite it.
        if (!initial && changedProperties.has('path') && this.mode !== 'memory' && this._connected) {
            const fromUrl = pathFromUrl(new URL(location.href), this._urlMode, this._base);
            if (fromUrl !== this.path) {
                this.navigate(this.path);
                return;
            }
        }

        if (changedProperties.has('path')) {
            // A path change is a navigation — unless it's the first value.
            const cause: TransitionCause = initial ? 'refresh' : this._popstate ? 'popstate' : 'path';
            this._popstate = false;
            this._resolve(cause);
        } else if (['routes', 'notFound', 'mode', 'base'].some(p => changedProperties.has(p))) {
            this._resolve('refresh');
        }
    }

    render() {
        // The live region sits in the shadow root so it can't be styled away
        // or duplicated by the page, and stays out of the outlet (the light
        // DOM), which the router empties on every navigation.
        return html`<slot></slot><div class="sr-only" role="status" aria-live="polite">${this._announcement}</div>`;
    }

    private _syncFromLocation = () => {
        if (!this._connected || this.mode === 'memory') return;
        const path = pathFromUrl(new URL(location.href), this._urlMode, this._base);
        if (path !== null && path !== this.path) {
            this.path = path;
        }
    };

    private _onPopState = () => {
        if (!this._connected || this.mode === 'memory') return;
        // Leaving this._entryKey: remember where it was scrolled to. With
        // scrollRestoration "manual" the browser hasn't scrolled yet.
        if (this.scrollOnNavigate === 'top' && this._entryKey) {
            scrollPositions.set(this._entryKey, { x: scrollX, y: scrollY });
        }
        this._entryKey = entryKey();
        const before = this.path;
        this._popstate = true;
        this._syncFromLocation();
        // No path change (an in-page anchor) — nothing will consume the flag.
        if (this.path === before) this._popstate = false;
    };

    private _onClick = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        // composedPath, so links inside a mounted view's shadow DOM count too.
        const anchor = e.composedPath().find(n => n instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;
        if (!anchor) return;

        const to = this._routeLinkPath(anchor);
        if (to === null) return;
        // Only links to a known route — anything else might be a real page
        // served alongside the app, so let the browser load it.
        if (!findRoute(this._routeTable(), to)) return;

        e.preventDefault();
        this.navigate(to);
    };

    // Page-wide link clicks, for a router that owns the URL. Clicks inside
    // this router already went through _onClick on the way up (and weren't
    // taken); clicks inside some other router reach here only if that one
    // didn't take them — so the innermost router always gets first say.
    private _onDocumentClick = (e: MouseEvent) => {
        if (e.composedPath().includes(this)) return;
        this._onClick(e);
    };

    private _bindDocument() {
        const wanted = this._connected && this.mode !== 'memory';
        if (wanted === this._documentBound) return;
        this._documentBound = wanted;
        if (wanted) {
            document.addEventListener('click', this._onDocumentClick);
            this._documentObserver = new MutationObserver(mutations => {
                if (mutations.some(m => m.type === 'childList'
                    ? Array.from(m.addedNodes).some(n => n instanceof Element && (n.localName === 'a' || n.querySelector('a[href]') !== null))
                    : m.target instanceof HTMLAnchorElement)) {
                    this._queueLinkUpdate();
                }
            });
            this._documentObserver.observe(document, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['href', 'target', 'download', 'rel'],
            });
        } else {
            document.removeEventListener('click', this._onDocumentClick);
            this._documentObserver?.disconnect();
            this._documentObserver = undefined;
        }
    }

    // The router path a link points at, or null if the router would leave the
    // link to the browser (see linkTarget) — regardless of whether a route
    // matches. Shared by click handling and aria-current, so only links the
    // router actually navigates get marked.
    private _routeLinkPath(anchor: HTMLAnchorElement): string | null {
        if (!anchor.hasAttribute('href') || anchor.hasAttribute('download')) return null;
        if (anchor.target && anchor.target !== '_self') return null;
        if (anchor.relList.contains('external')) return null;
        // href="#" / "#section" in history or memory mode is an in-page
        // anchor (or a JS-handled link), never a route.
        if (this.mode !== 'hash' && anchor.getAttribute('href')!.startsWith('#')) return null;
        try {
            return linkTarget(new URL(anchor.href), this._urlMode, this._base, new URL(location.href));
        } catch {
            return null;
        }
    }

    private _queueLinkUpdate() {
        if (this._linksQueued) return;
        this._linksQueued = true;
        queueMicrotask(() => {
            this._linksQueued = false;
            this._updateLinks();
        });
    }

    // aria-current on links to known routes (in _linkScope): "page" for the
    // shown path, "true" for a section containing it. Links inside shadow DOM
    // aren't reachable — a view marks its own.
    private _updateLinks() {
        if (!this._connected || !this._committed) return;
        const table = this._routeTable();
        const current = this.path;
        const marked = new Set<HTMLAnchorElement>();
        this._linkScope.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
            const to = this._routeLinkPath(anchor);
            if (to === null || !findRoute(table, to) || this._claimedByInnerRouter(anchor)) return;
            const state = linkCurrent(to, current);
            if (!state) return;
            if (anchor.getAttribute('aria-current') !== state) anchor.setAttribute('aria-current', state);
            marked.add(anchor);
        });
        // Unmark what this router marked before and no longer should — links
        // that stopped matching, left the scope, or were removed.
        this._currentLinks.forEach(anchor => {
            if (!marked.has(anchor)) anchor.removeAttribute('aria-current');
        });
        this._currentLinks.clear();
        marked.forEach(anchor => this._currentLinks.add(anchor));
    }

    // Whether a router between `anchor` and this one would take the link's
    // click — then it's that router's link to mark, not this one's (the same
    // innermost-first rule clicks follow).
    private _claimedByInnerRouter(anchor: HTMLAnchorElement): boolean {
        for (let router = anchor.closest('juel-router'); router && router !== this; router = router.parentElement?.closest('juel-router') ?? null) {
            if (router instanceof JuelRouter && router._connected) {
                const to = router._routeLinkPath(anchor);
                if (to !== null && findRoute(router._routeTable(), to)) return true;
            }
        }
        return false;
    }

    private _clearLinks() {
        this._currentLinks.forEach(anchor => anchor.removeAttribute('aria-current'));
        this._currentLinks.clear();
    }

    // scroll-on-navigate="top" in a URL mode takes over scroll restoration
    // (the browser's would restore before the new view has rendered); put
    // back whatever was there otherwise.
    private _applyScrollRestoration() {
        const wanted = this._connected && this.scrollOnNavigate === 'top' && this.mode !== 'memory';
        if (wanted && this._savedScrollRestoration === null) {
            this._savedScrollRestoration = history.scrollRestoration;
            history.scrollRestoration = 'manual';
        } else if (!wanted && this._savedScrollRestoration !== null) {
            history.scrollRestoration = this._savedScrollRestoration;
            this._savedScrollRestoration = null;
        }
    }

    // After a new view is shown: title, link state, and — for a navigation,
    // not the first view or a route-table refresh — focus and scroll.
    private _afterCommit(route: RouteDefinition | null, context: RouteContext, element: RoutedElement | null, cause: TransitionCause, firstView: boolean) {
        const title = this._titleFor(route, context);
        if (title !== null) document.title = title;

        this._entryKey = this.mode === 'memory' ? null : entryKey();
        this._updateLinks();

        // Any navigation abandons a restore still retrying for the last one.
        this._scrollAttempt++;

        if (firstView || cause === 'refresh') return;

        if (this.scrollOnNavigate === 'top') {
            const saved = cause === 'popstate' && this._entryKey ? scrollPositions.get(this._entryKey) : undefined;
            const hash = this.mode === 'history' ? location.hash.slice(1) : '';
            if (saved) {
                this._restoreScroll(saved);
            } else {
                // A frame later, so the new view has had a chance to render.
                requestAnimationFrame(() => {
                    const target = hash ? document.getElementById(decodeURIComponent(hash)) : null;
                    if (target) target.scrollIntoView(); else scrollTo(0, 0);
                });
            }
        }

        if (this.focusOnNavigate !== 'none' && element) {
            if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
            element.focus({ preventScroll: true });
        }

        if (this.announceNavigation !== 'none' && title) {
            // Clear first: setting the same text twice running (two routes
            // sharing a title) wouldn't otherwise be a change, so nothing
            // would be announced the second time.
            this._announcement = '';
            this.updateComplete.then(() => { this._announcement = title; });
        }
    }

    // The document title this route wants, or null to leave it alone.
    private _titleFor(route: RouteDefinition | null, context: RouteContext): string | null {
        if (!route) return this.notFoundTitle || null;
        if (!route.title) return null;
        try {
            return typeof route.title === 'function' ? route.title(context) : fillTitle(route.title, context.params);
        } catch (e) {
            console.error(`juel-router: title for route "${route.path}" threw`, e);
            return null;
        }
    }

    // Put back a scroll position saved for this history entry. The obvious
    // "scroll on the next frame" doesn't work for a view that fetches its
    // content: at that point the view is still its loading state, the document
    // is shorter than the saved offset, and the browser clamps the scroll to
    // whatever exists. So keep trying, for as long as the document is still
    // too short to honour the request, and stop the moment the user scrolls
    // themselves or another navigation starts.
    private _restoreScroll(saved: { x: number; y: number }) {
        const attempt = ++this._scrollAttempt;
        const deadline = Date.now() + SCROLL_RESTORE_MS;
        let last = -1;

        const abort = () => { if (this._scrollAttempt === attempt) this._scrollAttempt++; };
        // A real user scroll wins — wheel/touch/keys, not the scrollTo below.
        const options = { passive: true, once: true } as AddEventListenerOptions;
        addEventListener('wheel', abort, options);
        addEventListener('touchstart', abort, options);
        addEventListener('keydown', abort, options);

        const done = () => {
            removeEventListener('wheel', abort);
            removeEventListener('touchstart', abort);
            removeEventListener('keydown', abort);
        };

        const step = () => {
            if (this._scrollAttempt !== attempt || !this._connected) return done();
            if (scrollY !== last && last !== -1) return done();   // the user moved
            scrollTo(saved.x, saved.y);
            last = scrollY;
            // Arrived, or the page simply can't get there (it's as tall as it
            // will ever be and that isn't tall enough) — either way, stop.
            if (Math.abs(scrollY - saved.y) < 1 || Date.now() > deadline) return done();
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    private _affectsRouteTable(m: MutationRecord): boolean {
        if (this.routes) return false;
        const isRoute = (n: Node) => n instanceof Element && n.localName === 'juel-route' && n.parentNode === this;
        if (m.type === 'attributes') return isRoute(m.target);
        if (m.target !== this) return false;
        // A removed node's parentNode is already null, so check by tag name.
        const wasRoute = (n: Node) => n instanceof Element && n.localName === 'juel-route';
        return Array.from(m.addedNodes).some(isRoute) || Array.from(m.removedNodes).some(wasRoute);
    }

    private _routeTable(): RouteDefinition[] {
        const source: RouteDefinition[] = this.routes
            ?? Array.from(this.querySelectorAll<JuelRoute>(':scope > juel-route')).map(r => ({
                // Read attributes rather than properties: the children may not
                // have upgraded yet. (beforeEnter/load are plain properties
                // either way — Lit keeps pre-upgrade values.)
                path: r.getAttribute('path') ?? '',
                element: r.getAttribute('element') || undefined,
                redirect: r.getAttribute('redirect') || undefined,
                module: r.getAttribute('module') || undefined,
                title: r.getAttribute('title') || undefined,
                beforeEnter: r.beforeEnter,
                load: r.load,
            }));

        return source.filter(route => {
            let inputs: ReturnType<typeof routeInputs>;
            try {
                inputs = routeInputs(route.path);
            } catch (e) {
                this._reportOnce(`juel-router: ignoring invalid route — ${(e as Error).message}`);
                return false;
            }
            if (route.redirect) {
                try {
                    const target = routeInputs(route.redirect);
                    const missing = target.params.find(p => !inputs.params.includes(p));
                    if (missing) throw new Error(`redirect "${route.redirect}" uses ":${missing}", which "${route.path}" doesn't capture`);
                    if (target.wildcard && !inputs.wildcard) throw new Error(`redirect "${route.redirect}" uses "*", which "${route.path}" doesn't have`);
                } catch (e) {
                    this._reportOnce(`juel-router: ignoring route "${route.path}" — ${(e as Error).message}`);
                    return false;
                }
                return true;
            }
            if (!route.element) {
                this._reportOnce(`juel-router: ignoring route "${route.path}" — no element`);
                return false;
            }
            return true;
        });
    }

    // The table is re-read on every resolve, so an invalid route would
    // otherwise be reported again on every navigation.
    private _reportOnce(message: string) {
        if (this._reported.has(message)) return;
        this._reported.add(message);
        console.error(message);
    }

    // Re-resolve the current `path` — it, or the route table, changed.
    private _resolve(cause: TransitionCause) {
        if (!this._connected || !this._domReady) return;
        this._transition(this.path, 'sync', 0, cause);
    }

    private _transition(to: string, kind: TransitionKind, redirects: number, cause: TransitionCause): Promise<boolean> {
        const path = normalizePath(to);
        const found = findRoute(this._routeTable(), path);
        const key = found
            ? `${path}\n${found.index}\n${found.route.path}\n${found.route.element}`
            : `${path}\n-\n${this.notFound}`;

        // Already showing it: nothing to enter, though a navigate() may still
        // need to write a different ?search/#hash to the URL.
        if (this._committed && key === this._committed.key) {
            // A sync back to the shown path means a pending sync (e.g. back
            // pressed into a guarded route, then forward again) is moot. A
            // pending navigate() hasn't moved the path, so it carries on.
            if (kind !== 'sync' || this._pending?.kind === 'sync') {
                this._transitionId++;
                this._pending = null;
                this.navigating = false;
            }
            if (kind !== 'sync') this._writeLocation(to, kind);
            this._committed.path = this.path;
            this._committed.href = this.mode === 'memory' ? null : location.href;
            return Promise.resolve(true);
        }

        // The same resolution already in flight (updated() and the route
        // observer can both ask for one change) — don't run guards twice.
        if (this._pending && this._pending.key === key) {
            return this._pending.promise;
        }

        const id = ++this._transitionId;
        // Assigned before _enter runs: with no guard or loader it completes
        // synchronously.
        const pending = { key, kind, promise: null as unknown as Promise<boolean> };
        this._pending = pending;
        const promise = this._enter(id, key, to, path, kind, found, redirects, cause);
        pending.promise = promise;
        promise.then(() => {
            if (this._pending === pending) this._pending = null;
        });
        return promise;
    }

    private async _enter(
        id: number,
        key: string,
        to: string,
        path: string,
        kind: TransitionKind,
        found: { route: RouteDefinition; match: RouteMatch } | null,
        redirects: number,
        cause: TransitionCause
    ): Promise<boolean> {
        const stale = () => id !== this._transitionId;
        const route = found?.route ?? null;
        const match: RouteMatch = found ? found.match : { params: {}, rest: path };
        const context: RouteContext = { path: to, params: match.params, rest: match.rest, from: this._committed?.path ?? null };

        this.navigating = true;
        try {
            let outcome: RouteGuardResult = true;
            if (route?.redirect) {
                outcome = buildPath(route.redirect, match.params, match.rest);
            } else if (route?.beforeEnter) {
                outcome = await route.beforeEnter(context);
                if (stale()) return false;
            }

            if (typeof outcome === 'string') {
                if (redirects >= MAX_REDIRECTS) {
                    throw new Error(`more than ${MAX_REDIRECTS} redirects, starting from "${path}" — redirect loop?`);
                }
                // The URL never showed `to` for a navigate(), so push/replace
                // as asked; after a sync it already does, so replace it.
                const next = this._transition(outcome, kind === 'sync' ? 'replace' : kind, redirects + 1, cause);
                return await next;
            }

            if (outcome === false) {
                this.navigating = false;
                this._revert();
                this.dispatchEvent(new CustomEvent<RouteBlockedDetail>(RouterEvents.RouteBlocked, {
                    detail: { path: to, route: route!, from: context.from },
                }));
                return false;
            }

            const tag = route ? route.element! : this.notFound;
            if (route && (route.load || route.module)) {
                if (route.load) {
                    await route.load();
                } else {
                    await loadModule(route.module!);
                }
                // A module <script> fires load before the module's top-level
                // await settles, and a load() may resolve early too — so wait
                // for the element itself. After a while, give up waiting and
                // mount anyway: it upgrades if it's defined later.
                if (!customElements.get(tag)) {
                    const defined = await Promise.race([
                        customElements.whenDefined(tag).then(() => true),
                        new Promise<boolean>(resolve => setTimeout(() => resolve(false), DEFINE_TIMEOUT_MS)),
                    ]);
                    if (!defined) {
                        this._reportOnce(`juel-router: route "${route.path}" loaded, but nothing defined <${tag}> within ${DEFINE_TIMEOUT_MS}ms`);
                    }
                }
                if (stale()) return false;
            }

            if (kind !== 'sync') this._writeLocation(to, kind);
            this.navigating = false;
            const firstView = this._committed === null;
            this._mount(path, route, tag, match);
            this._committed = {
                key,
                path: this.path,
                href: this.mode === 'memory' ? null : location.href,
            };
            this._afterCommit(route, context, this._mounted, cause, firstView);
            return true;
        } catch (error) {
            if (stale()) return false;
            this.navigating = false;
            console.error(`juel-router: couldn't enter "${to}"`, error);
            this._revert();
            this.dispatchEvent(new CustomEvent<RouteErrorDetail>(RouterEvents.RouteError, {
                detail: { path: to, route, error },
            }));
            return false;
        }
    }

    // Write a navigation's destination: the URL in URL modes, `path` in
    // memory mode.
    private _writeLocation(to: string, kind: TransitionKind) {
        if (this.mode === 'memory') {
            this.path = to;
            return;
        }
        const current = new URL(location.href);
        const href = urlForPath(to, this._urlMode, this._base, current);
        if (href !== current.href) {
            if (kind === 'replace') {
                history.replaceState(history.state, '', href);
            } else {
                const leaving = ensureEntryKey();
                if (leaving && this.scrollOnNavigate === 'top') {
                    scrollPositions.set(leaving, { x: scrollX, y: scrollY });
                }
                history.pushState({ [STATE_KEY]: newEntryKey() }, '', href);
            }
            window.dispatchEvent(new Event(LOCATION_CHANGED));
        }
        this._syncFromLocation();
    }

    // Undo a path/URL that already moved to a navigation that then didn't
    // happen. Back/forward can't be cancelled, so the arrived-at history
    // entry is overwritten with the one still being shown.
    private _revert() {
        if (!this._committed) return;
        if (this.mode === 'memory') {
            if (this.path !== this._committed.path) this.path = this._committed.path;
            return;
        }
        if (this._committed.href && location.href !== this._committed.href) {
            history.replaceState(history.state, '', this._committed.href);
            window.dispatchEvent(new Event(LOCATION_CHANGED));
        }
        this._syncFromLocation();
    }

    private _mount(path: string, route: RouteDefinition | null, tag: string, match: RouteMatch) {
        // A new path always gets a fresh element, even for the same route —
        // so a view that loads data in connectedCallback reloads for /users/2
        // after /users/1 without having to watch its own params.
        this._mounted?.remove();
        this._mounted = null;
        this._mountedRoute = null;

        let element: RoutedElement | null = null;
        if (tag) {
            try {
                element = document.createElement(tag) as RoutedElement;
            } catch (e) {
                console.error(`juel-router: can't create <${tag}>${route ? ` for route "${route.path}"` : ''}`, e);
            }
        }

        if (element) {
            element.params = match.params;
            element.rest = match.rest;
            this._mounted = element;
            this._mountedRoute = route;
            this.appendChild(element);
        }

        const detail: RouteChangedDetail = {
            path,
            route: element ? route : null,
            element,
            params: element ? match.params : {},
            rest: element ? match.rest : '',
            notFound: !route,
        };
        this.dispatchEvent(new CustomEvent<RouteChangedDetail>(RouterEvents.RouteChanged, { detail }));
    }
}
