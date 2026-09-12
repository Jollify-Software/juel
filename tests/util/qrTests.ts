import { toQrMatrix } from '../../src/Utilities/Qr/QrMatrix';

describe('toQrMatrix', () => {
  test('short text → version 1, 21×21 grid plus the quiet-zone margin', () => {
    const m = toQrMatrix('hi', { ecl: 'M', margin: 4 });
    expect(m.version).toBe(1);
    expect(m.size).toBe(21 + 8);
    expect(m.modules.length).toBe(m.size);
    expect(m.modules.every((row) => row.length === m.size)).toBe(true);
  });

  test('the margin is a quiet border and its width is configurable', () => {
    const m = toQrMatrix('hi', { margin: 2 });
    expect(m.size).toBe(21 + 4);
    for (let i = 0; i < m.size; i++) {
      expect(m.modules[0][i]).toBe(false); // top quiet rows
      expect(m.modules[1][i]).toBe(false);
      expect(m.modules[i][0]).toBe(false); // left quiet cols
      expect(m.modules[i][1]).toBe(false);
    }
  });

  test('finder patterns sit at three corners', () => {
    const m = toQrMatrix('finder', { margin: 0 });
    const n = m.size;
    for (const [or, oc] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
      expect(m.modules[or][oc]).toBe(true); // outer ring corner is dark
      expect(m.modules[or + 1][oc + 1]).toBe(false); // white ring inside it
      expect(m.modules[or + 3][oc + 3]).toBe(true); // 3×3 dark centre
    }
  });

  test('a longer payload bumps the version (size = version*4 + 17 + 2*margin)', () => {
    const big = toQrMatrix('x'.repeat(120), { ecl: 'M', margin: 4 });
    expect(big.version).toBeGreaterThan(1);
    expect(big.size).toBe(big.version * 4 + 17 + 8);
  });

  test('stronger ECC never needs a smaller version for the same text', () => {
    const text = 'https://example.test/deck?role=control&room=demo';
    const low = toQrMatrix(text, { ecl: 'L', margin: 0 });
    const high = toQrMatrix(text, { ecl: 'H', margin: 0 });
    expect(high.version).toBeGreaterThanOrEqual(low.version);
  });

  test('empty / whitespace input throws', () => {
    expect(() => toQrMatrix('   ')).toThrow();
    expect(() => toQrMatrix('')).toThrow();
  });
});
