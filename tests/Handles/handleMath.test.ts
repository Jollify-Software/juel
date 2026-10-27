import { angleAt, dragAngle, formatAngle, normaliseAngle, parseAngle } from '../../src/Editors/Handles/handleMath';

describe('handleMath', () => {
    const c = { x: 100, y: 100 };
    test('angleAt: clockwise from the x axis, screen y down', () => {
        expect(angleAt(c, { x: 200, y: 100 })).toBe(0);
        expect(angleAt(c, { x: 100, y: 200 })).toBe(90);
        expect(angleAt(c, { x: 0, y: 100 })).toBe(180);
        expect(angleAt(c, { x: 100, y: 0 })).toBe(-90);
    });
    test('normaliseAngle: (-180, 180]', () => {
        expect(normaliseAngle(190)).toBe(-170);
        expect(normaliseAngle(-180)).toBe(180);
        expect(normaliseAngle(540)).toBe(180);
        expect(normaliseAngle(-0)).toBe(0);
        expect(normaliseAngle(360)).toBe(0);
    });
    test('dragAngle: the start plus the angle swept, a quarter turn clockwise', () => {
        expect(dragAngle(0, c, { x: 200, y: 100 }, { x: 100, y: 200 })).toBe(90);
        expect(dragAngle(10, c, { x: 200, y: 100 }, { x: 100, y: 200 })).toBe(100);
        // Across the ±180 seam it wraps rather than jumping.
        expect(dragAngle(170, c, { x: 200, y: 100 }, { x: 100, y: 200 })).toBe(-100);
    });
    test('dragAngle: tenths without snap, multiples of the snap with it', () => {
        const to = { x: 100 + 100 * Math.cos(Math.PI / 9.1), y: 100 + 100 * Math.sin(Math.PI / 9.1) };
        const free = dragAngle(0, c, { x: 200, y: 100 }, to);
        expect(free).toBeCloseTo(19.8, 1);
        expect(dragAngle(0, c, { x: 200, y: 100 }, to, 15)).toBe(15);
    });
    test('parseAngle and formatAngle', () => {
        expect(parseAngle('12deg')).toBe(12);
        expect(parseAngle('0.25turn')).toBe(90);
        expect(parseAngle('-45')).toBe(-45);
        expect(parseAngle('100grad')).toBeCloseTo(90);
        expect(parseAngle('')).toBe(0);
        expect(parseAngle('x 10deg')).toBe(0);
        expect(formatAngle(12.34)).toBe('12.3deg');
        expect(formatAngle(0)).toBe('');
        expect(formatAngle(370)).toBe('10deg');
    });
});
