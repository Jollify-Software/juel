import { linkTarget, normalizeBase, pathFromUrl, resolveBase, urlForPath } from '../../src/Navigation/Router/RouterLocation';

const u = (href: string) => new URL(href);

describe('resolveBase', () => {
  const doc = u('https://x.test/app/users/2');

  test('explicit base wins, even empty', () => {
    expect(resolveBase('/admin/', '/app/', doc)).toBe('/admin');
    expect(resolveBase('', '/app/', doc)).toBe('');
  });

  test('no explicit base and no <base> → none', () => {
    expect(resolveBase(null, null, doc)).toBe('');
  });

  test('<base href> directory', () => {
    expect(resolveBase(null, '/app/', doc)).toBe('/app');
    expect(resolveBase(null, '/', doc)).toBe('');
    expect(resolveBase(null, 'https://x.test/app/', doc)).toBe('/app');
  });

  test('<base href> with a file name uses its directory', () => {
    expect(resolveBase(null, '/app/index.html', doc)).toBe('/app');
  });

  test('<base href> without trailing slash is the parent directory', () => {
    expect(resolveBase(null, '/app', doc)).toBe('');
    expect(resolveBase(null, '/tools/app', doc)).toBe('/tools');
  });

  test('relative <base href> resolves against the document', () => {
    expect(resolveBase(null, 'sub/', u('https://x.test/app/index.html'))).toBe('/app/sub');
  });

  test('cross-origin <base href> is ignored', () => {
    expect(resolveBase(null, 'https://cdn.test/app/', doc)).toBe('');
  });
});

describe('normalizeBase', () => {
  test.each([
    ['', ''],
    ['/', ''],
    ['app', '/app'],
    ['/app/', '/app'],
    ['//app//admin/', '/app/admin'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeBase(input)).toBe(expected);
  });
});

describe('pathFromUrl — history', () => {
  test('pathname plus search, hash dropped', () => {
    expect(pathFromUrl(u('https://x.test/users/2?tab=1#top'), 'history', '')).toBe('/users/2?tab=1');
  });

  test('root', () => {
    expect(pathFromUrl(u('https://x.test/'), 'history', '')).toBe('/');
  });

  test('strips base', () => {
    expect(pathFromUrl(u('https://x.test/app/users'), 'history', '/app')).toBe('/users');
    expect(pathFromUrl(u('https://x.test/app/'), 'history', '/app')).toBe('/');
    expect(pathFromUrl(u('https://x.test/app'), 'history', '/app/')).toBe('/');
  });

  test('outside base is null', () => {
    expect(pathFromUrl(u('https://x.test/other'), 'history', '/app')).toBeNull();
    // "/application" is not below "/app"
    expect(pathFromUrl(u('https://x.test/application'), 'history', '/app')).toBeNull();
  });
});

describe('pathFromUrl — hash', () => {
  test('route hash', () => {
    expect(pathFromUrl(u('https://x.test/page.html#/users/2'), 'hash', '')).toBe('/users/2');
  });

  test('no hash or empty hash is root', () => {
    expect(pathFromUrl(u('https://x.test/page.html'), 'hash', '')).toBe('/');
    expect(pathFromUrl(u('https://x.test/page.html#'), 'hash', '')).toBe('/');
  });

  test('plain anchor hash is not a route', () => {
    expect(pathFromUrl(u('https://x.test/page.html#section'), 'hash', '')).toBeNull();
  });

  test('base is irrelevant', () => {
    expect(pathFromUrl(u('https://x.test/anything#/a'), 'hash', '/app')).toBe('/a');
  });
});

describe('urlForPath', () => {
  const current = u('https://x.test/app/users?x=1#top');

  test('history, no base', () => {
    expect(urlForPath('/users/2', 'history', '', current)).toBe('https://x.test/users/2');
  });

  test('history, with base, keeps search and hash', () => {
    expect(urlForPath('/users/2?tab=1#bio', 'history', '/app', current)).toBe('https://x.test/app/users/2?tab=1#bio');
  });

  test('history, relative-looking path gets a leading slash', () => {
    expect(urlForPath('users', 'history', '/app', current)).toBe('https://x.test/app/users');
    expect(urlForPath('', 'history', '/app', current)).toBe('https://x.test/app/');
  });

  test('protocol-relative-looking paths stay same-origin', () => {
    expect(urlForPath('//evil.example/x', 'history', '', current)).toBe('https://x.test/evil.example/x');
    expect(urlForPath('\\\\evil.example/x', 'history', '', current)).toBe('https://x.test/evil.example/x');
  });

  test('hash keeps the document URL and replaces the hash', () => {
    expect(urlForPath('/users/2', 'hash', '', current)).toBe('https://x.test/app/users?x=1#/users/2');
  });

  test('round-trips through pathFromUrl', () => {
    for (const mode of ['history', 'hash'] as const) {
      const href = urlForPath('/a/b?c=d', mode, '/app', current);
      expect(pathFromUrl(u(href), mode, '/app')).toBe('/a/b?c=d');
    }
  });
});

describe('linkTarget — history', () => {
  const current = u('https://x.test/app/users');

  test('same-origin link below base', () => {
    expect(linkTarget(u('https://x.test/app/users/2?tab=1'), 'history', '/app', current)).toBe('/users/2?tab=1');
  });

  test('keeps a hash on a different path', () => {
    expect(linkTarget(u('https://x.test/app/help#faq'), 'history', '/app', current)).toBe('/help#faq');
  });

  test('other origin is left alone', () => {
    expect(linkTarget(u('https://other.test/app/users'), 'history', '/app', current)).toBeNull();
  });

  test('outside base is left alone', () => {
    expect(linkTarget(u('https://x.test/docs'), 'history', '/app', current)).toBeNull();
  });

  test('in-page anchor on the current document is left alone', () => {
    expect(linkTarget(u('https://x.test/app/users#list'), 'history', '/app', current)).toBeNull();
  });

  test('link to the current path with no hash is still a route link', () => {
    expect(linkTarget(u('https://x.test/app/users'), 'history', '/app', current)).toBe('/users');
  });
});

describe('linkTarget — hash', () => {
  const current = u('https://x.test/page.html#/users');

  test('route hash on the same document', () => {
    expect(linkTarget(u('https://x.test/page.html#/users/2'), 'hash', '', current)).toBe('/users/2');
  });

  test('plain anchor is left alone', () => {
    expect(linkTarget(u('https://x.test/page.html#section'), 'hash', '', current)).toBeNull();
  });

  test('a different document is left alone', () => {
    expect(linkTarget(u('https://x.test/other.html#/users'), 'hash', '', current)).toBeNull();
  });
});
