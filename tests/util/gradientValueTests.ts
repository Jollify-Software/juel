import {
  GradientLayer,
  parseLayeredGradient,
  splitTopLevel,
  stringifyLayeredGradient,
  layerToString,
  insertStop,
  defaultGradientLayer,
} from '../../src/Editors/Style/GradientEditor/GradientValue';

const g = (v: string) => parseLayeredGradient(v)!;
const first = (v: string) => g(v).layers[0] as GradientLayer;
const roundtrip = (v: string) => stringifyLayeredGradient(g(v));

describe('splitTopLevel', () => {
  test('respects parens', () => {
    expect(splitTopLevel('linear-gradient(red, blue), url(a,b)', ',')).toEqual([
      'linear-gradient(red, blue)',
      'url(a,b)',
    ]);
  });
  test('whitespace split respects parens', () => {
    expect(splitTopLevel('color-mix(in srgb, red, blue) 40%', ' ')).toEqual([
      'color-mix(in srgb, red, blue)',
      '40%',
    ]);
  });
});

describe('parse linear', () => {
  test('angle + two stops', () => {
    const l = first('linear-gradient(45deg, red 0%, blue 100%)');
    expect(l.kind).toBe('linear');
    expect(l.angle).toBe('45deg');
    expect(l.stops).toEqual([
      { kind: 'stop', color: 'red', pos: '0%' },
      { kind: 'stop', color: 'blue', pos: '100%' },
    ]);
  });
  test('to side/corner', () => {
    expect(first('linear-gradient(to top right, red, blue)').angle).toBe('to top right');
  });
  test('no config', () => {
    const l = first('linear-gradient(red, blue)');
    expect(l.angle).toBeUndefined();
    expect(l.stops.length).toBe(2);
  });
  test('interpolation hint between stops', () => {
    const l = first('linear-gradient(red, 30%, blue)');
    expect(l.stops[1]).toEqual({ kind: 'hint', hint: '30%' });
  });
  test('double-position stop', () => {
    const l = first('linear-gradient(red 20% 40%, blue)');
    expect(l.stops[0]).toEqual({ kind: 'stop', color: 'red', pos: '20%', pos2: '40%' });
  });
  test('function colours survive', () => {
    const l = first('linear-gradient(90deg, rgb(255 0 0 / .5) 10%, color-mix(in oklch, red, blue) 90%)');
    expect(l.stops[0].kind === 'stop' && l.stops[0].color).toBe('rgb(255 0 0 / .5)');
    expect(l.stops[1].kind === 'stop' && l.stops[1].color).toBe('color-mix(in oklch, red, blue)');
  });
  test('colour interpolation method', () => {
    expect(first('linear-gradient(90deg in oklch, red, blue)').interpolation).toBe('in oklch');
  });
});

describe('parse radial', () => {
  test('shape + size + position', () => {
    const l = first('radial-gradient(circle farthest-corner at 30% 40%, red, blue)');
    expect(l).toMatchObject({ kind: 'radial', shape: 'circle', size: 'farthest-corner', position: '30% 40%' });
  });
  test('explicit size', () => {
    expect(first('radial-gradient(50px 80px at center, red, blue)').size).toBe('50px 80px');
  });
  test('bare ellipse', () => {
    const l = first('radial-gradient(ellipse, red, blue)');
    expect(l.shape).toBe('ellipse');
    expect(l.stops.length).toBe(2);
  });
});

describe('parse conic', () => {
  test('from + at', () => {
    const l = first('conic-gradient(from 45deg at 50% 50%, red, blue)');
    expect(l).toMatchObject({ kind: 'conic', from: '45deg', position: '50% 50%' });
  });
  test('angular stops', () => {
    const l = first('conic-gradient(red 0deg, blue 180deg, red 360deg)');
    expect(l.stops[1]).toEqual({ kind: 'stop', color: 'blue', pos: '180deg' });
  });
});

describe('repeating + layers', () => {
  test('repeating flag', () => {
    const l = first('repeating-linear-gradient(45deg, red 0 10px, blue 10px 20px)');
    expect(l.repeating).toBe(true);
  });
  test('layer stack', () => {
    const m = g('linear-gradient(red, transparent), radial-gradient(circle, blue, transparent)');
    expect(m.layers.map((l) => (l as GradientLayer).kind)).toEqual(['linear', 'radial']);
  });
  test('non-gradient layers dropped', () => {
    const m = g('linear-gradient(red, blue), url(x.png)');
    expect(m.layers.length).toBe(1);
  });
});

describe('solid layer detection', () => {
  test('2 equal stops, no geometry -> solid', () => {
    expect(g('linear-gradient(#333, #333)').layers[0]).toEqual({ type: 'solid', color: '#333' });
  });
  test('solid serialises back to the linear-gradient trick', () => {
    expect(layerToString({ type: 'solid', color: 'red' })).toBe('linear-gradient(red, red)');
  });
});

describe('round-trips', () => {
  test.each([
    'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)',
    'linear-gradient(to top right, red, blue)',
    'radial-gradient(circle farthest-corner at 30% 40%, red 0%, blue 100%)',
    'conic-gradient(from 0deg at center, red, blue, red)',
    'repeating-linear-gradient(45deg, red 0%, blue 10%)',
    'linear-gradient(red, blue), radial-gradient(ellipse at center, green, transparent)',
  ])('%s', (v) => {
    expect(roundtrip(v)).toBe(v);
  });
});

describe('insertStop', () => {
  test('keeps stops ordered by position', () => {
    const l = defaultGradientLayer('linear'); // 0% and 100%
    const idx = insertStop(l, 40, 'red');
    expect(idx).toBe(1);
    expect(l.stops.map((s) => (s.kind === 'stop' ? s.pos : s.hint))).toEqual(['0%', '40%', '100%']);
  });
  test('clamps out-of-range', () => {
    const l = defaultGradientLayer('linear');
    insertStop(l, 150, 'red');
    expect((l.stops[l.stops.length - 1] as { pos: string }).pos).toBe('100%');
  });
});

describe('edge cases', () => {
  test('none / empty', () => {
    expect(parseLayeredGradient('none')).toBeNull();
    expect(parseLayeredGradient('')).toBeNull();
    expect(parseLayeredGradient(null)).toBeNull();
  });
  test('garbage', () => {
    expect(parseLayeredGradient('rgb(1,2,3)')).toBeNull();
  });
});
