import {
  clampFraction,
  formatPosition,
  parsePosition,
} from '../../src/Editors/PositionEditor/PositionValue';

const BOX = { width: 200, height: 100 };

describe('parsePosition', () => {
  test('keywords', () => {
    expect(parsePosition('left top', BOX)).toEqual({ fx: 0, fy: 0 });
    expect(parsePosition('center', BOX)).toEqual({ fx: 0.5, fy: 0.5 });
    expect(parsePosition('right bottom', BOX)).toEqual({ fx: 1, fy: 1 });
  });

  test('keyword order can be y then x', () => {
    expect(parsePosition('top left', BOX)).toEqual({ fx: 0, fy: 0 });
  });

  test('lone vertical keyword leaves x centred', () => {
    expect(parsePosition('bottom', BOX)).toEqual({ fx: 0.5, fy: 1 });
  });

  test('percentages', () => {
    expect(parsePosition('25% 75%', BOX)).toEqual({ fx: 0.25, fy: 0.75 });
  });

  test('pixels are divided by the reference box', () => {
    expect(parsePosition('50px 50px', BOX)).toEqual({ fx: 0.25, fy: 0.5 });
  });

  test('single percentage sets x, y stays centred', () => {
    expect(parsePosition('10%', BOX)).toEqual({ fx: 0.1, fy: 0.5 });
  });

  test('rejects junk and 3+ token forms', () => {
    expect(parsePosition('', BOX)).toBeNull();
    expect(parsePosition('   ', BOX)).toBeNull();
    expect(parsePosition('nope nope', BOX)).toBeNull();
    expect(parsePosition('right 10px bottom 20%', BOX)).toBeNull();
  });
});

describe('formatPosition', () => {
  const at = { fx: 0.333333, fy: 0.5 };

  test('percent with default precision', () => {
    expect(formatPosition(at, { unit: 'percent', box: BOX })).toBe('33.33% 50%');
  });

  test('percent precision override', () => {
    expect(formatPosition(at, { unit: 'percent', box: BOX, precision: 0 })).toBe('33% 50%');
  });

  test('px multiplies by the box', () => {
    expect(formatPosition({ fx: 0.25, fy: 0.5 }, { unit: 'px', box: BOX })).toBe('50px 50px');
  });

  test('keyword snaps near anchors and collapses center center', () => {
    expect(formatPosition({ fx: 0.5, fy: 0.5 }, { unit: 'keyword', box: BOX })).toBe('center');
    expect(formatPosition({ fx: 0, fy: 1 }, { unit: 'keyword', box: BOX })).toBe('left bottom');
  });

  test('keyword falls back to % on an axis that is not near an anchor', () => {
    expect(formatPosition({ fx: 0.31, fy: 0 }, { unit: 'keyword', box: BOX })).toBe('31% top');
  });

  test('round-trips a percentage value', () => {
    const f = parsePosition('40% 60%', BOX)!;
    expect(formatPosition(f, { unit: 'percent', box: BOX })).toBe('40% 60%');
  });
});

describe('clampFraction', () => {
  test('clamps outside [0,1]', () => {
    expect(clampFraction({ fx: -0.2, fy: 1.5 })).toEqual({ fx: 0, fy: 1 });
    expect(clampFraction({ fx: 0.3, fy: 0.7 })).toEqual({ fx: 0.3, fy: 0.7 });
  });
});
