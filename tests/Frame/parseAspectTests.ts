import { parseAspect } from '../../src/Display/Frame/parseAspect';

describe('parseAspect', () => {
    it('reads ratios and sizes', () => {
        expect(parseAspect('16:9')).toBeCloseTo(16 / 9);
        expect(parseAspect('4/3')).toBeCloseTo(4 / 3);
        expect(parseAspect('1280x720')).toBeCloseTo(16 / 9);
        expect(parseAspect(' 1.85 : 1 ')).toBeCloseTo(1.85);
    });

    it('returns null for anything else', () => {
        for (const bad of [null, undefined, '', 'wide', '16:0', '0x10', '16:9:1']) {
            expect(parseAspect(bad)).toBeNull();
        }
    });
});
