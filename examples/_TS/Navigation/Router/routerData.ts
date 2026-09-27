import type { JuelRouter } from '../../../../src/Navigation/Router/Router';

export interface DemoUser {
    name: string;
    role: string;
}

export const users: Record<string, DemoUser> = {
    1: { name: 'Ada Lovelace', role: 'Analyst' },
    2: { name: 'Grace Hopper', role: 'Compiler author' },
    3: { name: 'Alan Turing', role: 'Codebreaker' },
};

// Stand-in for fetch() so the page works from a static server.
export function fakeFetchUser(id: string): Promise<DemoUser | null> {
    return new Promise(resolve => setTimeout(() => resolve(users[id] ?? null), 400));
}

export function routerOf(view: HTMLElement): JuelRouter {
    return view.closest('juel-router') as JuelRouter;
}

// These views are shared by routers in different modes, so they build links to
// suit whichever router they're mounted in. A real app only has one mode and
// would just write href="/users/2" (or "#/users/2").
export function href(view: HTMLElement, path: string): string {
    return routerOf(view).mode === 'hash' ? '#' + path : path;
}
