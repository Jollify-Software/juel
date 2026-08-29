import {
  parseShadowList,
  stringifyShadowList,
  shadowToString,
  defaultShadow,
  splitAlpha,
  withAlpha,
  num,
} from '../../src/Editors/Style/ShadowEditor/ShadowValue';

const p = (v: string) => parseShadowList(v)!;
const rt = (v: string) => stringifyShadowList(p(v));

describe('parseShadowList', () => {
  test('x y only', () => {
    expect(p('2px 4px').shadows[0]).toEqual({
      inset: false, x: '2px', y: '4px', blur: '0', spread: '0', color: '',
    });
  });
  test('x y blur spread color', () => {
    expect(p('1px 2px 3px 4px rgba(0,0,0,.5)').shadows[0]).toEqual({
      inset: false, x: '1px', y: '2px', blur: '3px', spread: '4px', color: 'rgba(0,0,0,.5)',
    });
  });
  test('inset in any position', () => {
    expect(p('inset 0 0 5px red').shadows[0].inset).toBe(true);
    expect(p('0 0 5px red inset').shadows[0].inset).toBe(true);
  });
  test('negative offsets', () => {
    const s = p('-3px -6px 8px #333').shadows[0];
    expect([s.x, s.y]).toEqual(['-3px', '-6px']);
  });
  test('colour before lengths', () => {
    expect(p('red 1px 2px').shadows[0].color).toBe('red');
  });
  test('function colour with commas survives', () => {
    const s = p('0 1px 2px hsl(0, 50%, 40%)').shadows[0];
    expect(s.color).toBe('hsl(0, 50%, 40%)');
  });
  test('list of shadows', () => {
    const m = p('0 1px 2px red, inset 0 0 4px blue');
    expect(m.shadows.length).toBe(2);
    expect(m.shadows[1].inset).toBe(true);
  });
  test('none / empty / junk', () => {
    expect(parseShadowList('none')).toBeNull();
    expect(parseShadowList('')).toBeNull();
    expect(parseShadowList('red')).toBeNull(); // no lengths
  });
});

describe('stringifyShadowList', () => {
  test('omits blur/spread when zero', () => {
    expect(shadowToString({ inset: false, x: '2px', y: '4px', blur: '0px', spread: '0px', color: 'red' }))
      .toBe('2px 4px red');
  });
  test('keeps blur when spread is set', () => {
    expect(shadowToString({ inset: false, x: '0px', y: '0px', blur: '0px', spread: '3px', color: '' }))
      .toBe('0px 0px 0px 3px');
  });
  test('inset first', () => {
    expect(shadowToString({ inset: true, x: '0px', y: '0px', blur: '5px', spread: '0px', color: '#000' }))
      .toBe('inset 0px 0px 5px #000');
  });
  test('empty list -> none', () => {
    expect(stringifyShadowList({ shadows: [] })).toBe('none');
  });
});

describe('round-trips (canonical forms)', () => {
  test.each([
    '0px 4px 12px rgba(0, 0, 0, 0.25)',
    'inset 0px 0px 8px 2px #333333',
    '2px 2px red',
    '0px 1px 2px rgba(0, 0, 0, 0.2), 0px 8px 24px rgba(0, 0, 0, 0.15)',
  ])('%s', (v) => {
    expect(rt(v)).toBe(v);
  });
  test('normalises away a redundant zero blur', () => {
    expect(rt('2px 2px 0px red')).toBe('2px 2px red');
  });
});

describe('alpha helpers', () => {
  test('splitAlpha on rgba', () => {
    expect(splitAlpha('rgba(10, 20, 30, 0.4)')).toEqual({ base: 'rgb(10, 20, 30)', alpha: 0.4 });
  });
  test('splitAlpha on #rrggbbaa', () => {
    const r = splitAlpha('#11223380');
    expect(r.base).toBe('#112233');
    expect(r.alpha).toBeCloseTo(0.502, 2);
  });
  test('splitAlpha on opaque', () => {
    expect(splitAlpha('#abcdef')).toEqual({ base: '#abcdef', alpha: 1 });
  });
  test('withAlpha builds rgba from hex', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });
  test('withAlpha builds rgba from rgb', () => {
    expect(withAlpha('rgb(0, 128, 255)', 0.25)).toBe('rgba(0, 128, 255, 0.25)');
  });
  test('round-trips through split/with', () => {
    const { base, alpha } = splitAlpha('rgba(200, 100, 50, 0.6)');
    expect(withAlpha(base, alpha)).toBe('rgba(200, 100, 50, 0.6)');
  });
});

describe('num', () => {
  test('parses leading number, tolerates junk', () => {
    expect(num('12px')).toBe(12);
    expect(num('-4.5rem')).toBe(-4.5);
    expect(num('0')).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num('auto')).toBe(0);
  });
});

test('defaultShadow is sane', () => {
  const d = defaultShadow();
  expect(d.inset).toBe(false);
  expect(shadowToString(d)).toBe('0px 4px 12px rgba(0, 0, 0, 0.25)');
});
