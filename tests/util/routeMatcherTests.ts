import { buildPath, compileRoute, fillTitle, findRoute, linkCurrent, matchRoute, normalizePath, routeInputs } from '../../src/Navigation/Router/RouteMatcher';

describe('fillTitle', () => {
  test('fills known params', () => {
    expect(fillTitle('User :id — :section', { id: '7', section: 'posts' })).toBe('User 7 — posts');
  });

  test('leaves unknown placeholders and plain text alone', () => {
    expect(fillTitle('Ratio 3:2 for :id', {})).toBe('Ratio 3:2 for :id');
  });

  test('does not re-expand a value containing a placeholder', () => {
    expect(fillTitle(':a', { a: ':b', b: 'x' })).toBe(':b');
  });
});

describe('linkCurrent', () => {
  test('exact match is the page', () => {
    expect(linkCurrent('/users', '/users')).toBe('page');
    expect(linkCurrent('/users/', '/users?tab=1')).toBe('page');
    expect(linkCurrent('/', '/')).toBe('page');
  });

  test('ancestor section is "true"', () => {
    expect(linkCurrent('/users', '/users/2')).toBe('true');
    expect(linkCurrent('/users', '/users/2/posts')).toBe('true');
  });

  test('root is never a section', () => {
    expect(linkCurrent('/', '/users')).toBeNull();
  });

  test('segment boundary respected', () => {
    expect(linkCurrent('/user', '/users')).toBeNull();
  });

  test('unrelated and descendant links are null', () => {
    expect(linkCurrent('/files', '/users')).toBeNull();
    expect(linkCurrent('/users/2', '/users')).toBeNull();
  });
});

describe('buildPath', () => {
  test('static pattern', () => {
    expect(buildPath('/login', {})).toBe('/login');
  });

  test('fills params', () => {
    expect(buildPath('/users/:id/posts/:post', { id: '7', post: '99' })).toBe('/users/7/posts/99');
  });

  test('encodes param values', () => {
    expect(buildPath('/tags/:tag', { tag: 'c# sharp/x' })).toBe('/tags/c%23%20sharp%2Fx');
  });

  test('fills a wildcard from rest', () => {
    expect(buildPath('/new/*', {}, '/a/b')).toBe('/new/a/b');
    expect(buildPath('/new/*', {}, '')).toBe('/new');
  });

  test('round-trips with matchRoute', () => {
    const match = matchRoute('/old/:id/*', '/old/a%20b/x/y')!;
    const built = buildPath('/new/:id/*', match.params, match.rest);
    expect(built).toBe('/new/a%20b/x/y');
    expect(matchRoute('/new/:id/*', built)).toEqual(match);
  });

  test('missing param throws', () => {
    expect(() => buildPath('/users/:id', {})).toThrow(/no value for ":id"/);
  });
});

describe('routeInputs', () => {
  test('lists params and wildcard', () => {
    expect(routeInputs('/a/:x/b/:y/*')).toEqual({ params: ['x', 'y'], wildcard: true });
    expect(routeInputs('/static')).toEqual({ params: [], wildcard: false });
  });
});

describe('normalizePath', () => {
  test.each([
    ['', '/'],
    ['/', '/'],
    ['users', '/users'],
    ['/users/', '/users'],
    ['//users///42//', '/users/42'],
    ['/users?page=2', '/users'],
    ['/users#top', '/users'],
    ['/users/42?x=/y#/z', '/users/42'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });
});

describe('matchRoute — static segments', () => {
  test('root matches root', () => {
    expect(matchRoute('/', '/')).toEqual({ params: {}, rest: '' });
    expect(matchRoute('/', '')).toEqual({ params: {}, rest: '' });
  });

  test('root does not match a deeper path', () => {
    expect(matchRoute('/', '/users')).toBeNull();
  });

  test('exact static match', () => {
    expect(matchRoute('/users/new', '/users/new')).toEqual({ params: {}, rest: '' });
  });

  test('ignores trailing slash, query and hash on the path', () => {
    expect(matchRoute('/users', '/users/')).not.toBeNull();
    expect(matchRoute('/users', '/users?page=2')).not.toBeNull();
    expect(matchRoute('/users', '/users#section')).not.toBeNull();
  });

  test('pattern slashes are normalized too', () => {
    expect(matchRoute('users/', '/users')).not.toBeNull();
  });

  test('is case-sensitive', () => {
    expect(matchRoute('/Users', '/users')).toBeNull();
  });

  test('rejects prefix and extra segments', () => {
    expect(matchRoute('/users', '/users/42')).toBeNull();
    expect(matchRoute('/users/42', '/users')).toBeNull();
  });
});

describe('matchRoute — params', () => {
  test('captures a named param', () => {
    expect(matchRoute('/users/:id', '/users/42')).toEqual({ params: { id: '42' }, rest: '' });
  });

  test('captures several params', () => {
    expect(matchRoute('/users/:userId/posts/:postId', '/users/7/posts/99')).toEqual({
      params: { userId: '7', postId: '99' },
      rest: '',
    });
  });

  test('a param needs a non-empty segment', () => {
    expect(matchRoute('/users/:id', '/users')).toBeNull();
    expect(matchRoute('/users/:id', '/users/')).toBeNull();
  });

  test('decodes percent-encoded values', () => {
    expect(matchRoute('/tags/:tag', '/tags/c%23%20sharp')).toEqual({ params: { tag: 'c# sharp' }, rest: '' });
  });

  test('an encoded slash stays inside one param', () => {
    expect(matchRoute('/files/:name', '/files/a%2Fb')).toEqual({ params: { name: 'a/b' }, rest: '' });
  });

  test('malformed encoding is no match, not a throw', () => {
    expect(matchRoute('/tags/:tag', '/tags/%E0%A4%A')).toBeNull();
  });

  test('static segment after a param still has to match', () => {
    expect(matchRoute('/users/:id/edit', '/users/42/view')).toBeNull();
  });
});

describe('matchRoute — wildcard', () => {
  test('matches zero segments', () => {
    expect(matchRoute('/files/*', '/files')).toEqual({ params: {}, rest: '' });
  });

  test('matches and reports the remaining segments', () => {
    expect(matchRoute('/files/*', '/files/a/b/c.txt')).toEqual({ params: {}, rest: '/a/b/c.txt' });
  });

  test('rest is normalized', () => {
    expect(matchRoute('/files/*', '/files//a/b/?q=1')).toEqual({ params: {}, rest: '/a/b' });
  });

  test('bare catch-all matches everything', () => {
    expect(matchRoute('/*', '/')).toEqual({ params: {}, rest: '' });
    expect(matchRoute('/*', '/anything/at/all')).toEqual({ params: {}, rest: '/anything/at/all' });
  });

  test('combines with params', () => {
    expect(matchRoute('/repo/:name/*', '/repo/juel/src/index.ts')).toEqual({
      params: { name: 'juel' },
      rest: '/src/index.ts',
    });
  });

  test('segments before the wildcard still have to match', () => {
    expect(matchRoute('/files/*', '/images/a')).toBeNull();
  });
});

describe('compileRoute — invalid patterns', () => {
  test('wildcard must be last', () => {
    expect(() => compileRoute('/a/*/b')).toThrow(/last segment/);
  });

  test('param needs a name', () => {
    expect(() => compileRoute('/users/:')).toThrow(/needs a name/);
  });

  test('param names must be unique', () => {
    expect(() => compileRoute('/a/:id/b/:id')).toThrow(/duplicate/);
  });

  test('a compiled route can be matched repeatedly', () => {
    const route = compileRoute('/users/:id');
    expect(matchRoute(route, '/users/1')?.params).toEqual({ id: '1' });
    expect(matchRoute(route, '/users/2')?.params).toEqual({ id: '2' });
  });
});

describe('findRoute', () => {
  const routes = [
    { path: '/', element: 'home-page' },
    { path: '/users/new', element: 'user-create' },
    { path: '/users/:id', element: 'user-detail' },
    { path: '/*', element: 'not-found' },
  ];

  test('returns the matched route, its index and the match', () => {
    expect(findRoute(routes, '/users/42')).toEqual({
      route: routes[2],
      index: 2,
      match: { params: { id: '42' }, rest: '' },
    });
  });

  test('first match in table order wins', () => {
    expect(findRoute(routes, '/users/new')?.route.element).toBe('user-create');
  });

  test('falls through to a trailing catch-all', () => {
    expect(findRoute(routes, '/nope/nothing')?.route.element).toBe('not-found');
  });

  test('null when nothing matches', () => {
    expect(findRoute(routes.slice(0, 3), '/nope')).toBeNull();
    expect(findRoute([], '/')).toBeNull();
  });
});
