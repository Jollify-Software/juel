import { allSame, compressFour, expandFour, mergeChanges, readFour, splitLength, writeFour, type FourSpec, type FourValues } from '../../src/Editors/Style/SidesEditor/SidesValue';

const padding: FourSpec = { shorthand: 'padding', prefix: 'padding' };
const radius: FourSpec = { shorthand: 'border-radius', prefix: 'border', suffix: 'radius', corners: true };
const borderWidth: FourSpec = { shorthand: 'border-width', prefix: 'border', suffix: 'width' };

describe('four-sided values', () => {
    it('expands 1–4 value shorthands by the CSS rule', () => {
        expect(expandFour('4px')).toEqual(['4px', '4px', '4px', '4px']);
        expect(expandFour('4px 8px')).toEqual(['4px', '8px', '4px', '8px']);
        expect(expandFour('1px 2px 3px')).toEqual(['1px', '2px', '3px', '2px']);
        expect(expandFour('1px 2px 3px 4px')).toEqual(['1px', '2px', '3px', '4px']);
        expect(expandFour('calc(1px + 2px) auto')).toEqual(['calc(1px + 2px)', 'auto', 'calc(1px + 2px)', 'auto']);
        expect(expandFour('')).toBeNull();
        expect(expandFour('1px 2px 3px 4px 5px')).toBeNull();
    });

    it('compresses four values to the shortest shorthand', () => {
        expect(compressFour(['4px', '4px', '4px', '4px'])).toBe('4px');
        expect(compressFour(['4px', '8px', '4px', '8px'])).toBe('4px 8px');
        expect(compressFour(['1px', '2px', '3px', '2px'])).toBe('1px 2px 3px');
        expect(compressFour(['1px', '2px', '3px', '4px'])).toBe('1px 2px 3px 4px');
    });

    it('round-trips every shape: expand then compress gives the same text', () => {
        for (const v of ['4px', '4px 8px', '1px 2px 3px', '1px 2px 3px 4px', '0 auto']) expect(compressFour(expandFour(v)!)).toBe(v);
    });

    it('reads the shorthand, then longhands over it', () => {
        expect(readFour({ padding: '4px 8px', 'padding-left': '20px' }, padding)).toEqual(['4px', '8px', '4px', '20px']);
        expect(readFour({ 'padding-top': '2px' }, padding)).toEqual(['2px', '', '', '']);
        expect(readFour({ 'border-radius': '8px', 'border-top-left-radius': '0' }, radius)).toEqual(['0', '8px', '8px', '8px']);
        expect(readFour({ 'border-width': '1px 2px', 'border-top-width': '5px' }, borderWidth)).toEqual(['5px', '2px', '1px', '2px']);
    });

    it('writes the shorthand when all four are set, clearing the longhands', () => {
        expect(writeFour(['4px', '8px', '4px', '8px'], padding)).toEqual({
            set: { padding: '4px 8px' }, clear: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
        });
        expect(writeFour(['6px', '6px', '6px', '6px'], radius)).toEqual({
            set: { 'border-radius': '6px' },
            clear: ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
        });
    });

    it('writes longhands when some are unset, clearing the shorthand and the rest; none set clears all', () => {
        expect(writeFour(['12px', '', '', ''], padding)).toEqual({
            set: { 'padding-top': '12px' }, clear: ['padding', 'padding-right', 'padding-bottom', 'padding-left'],
        });
        expect(writeFour(['', '', '', ''], padding)).toEqual({
            set: {}, clear: ['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
        });
    });

    it('a read of a write gives the values back (round trip through declarations)', () => {
        const cases: FourValues[] = [['1px', '2px', '3px', '4px'], ['12px', '', '', '7px'], ['0', '0', '0', '0'], ['auto', '1em', 'auto', '1em']];
        for (const values of cases) {
            const { set } = writeFour(values, padding);
            expect(readFour(set, padding)).toEqual(values);
        }
    });

    it('merges changes, later winning', () => {
        expect(mergeChanges({ set: { a: '1' }, clear: ['b'] }, { set: { b: '2' }, clear: ['a'] })).toEqual({ set: { b: '2' }, clear: ['a'] });
    });

    it('splits lengths and says when four are the same', () => {
        expect(splitLength('12px')).toEqual({ value: 12, unit: 'px' });
        expect(splitLength('-1.5em')).toEqual({ value: -1.5, unit: 'em' });
        expect(splitLength('0')).toEqual({ value: 0, unit: '' });
        expect(splitLength('auto')).toBeNull();
        expect(allSame(['1px', '1px', '1px', '1px'])).toBe(true);
        expect(allSame(['1px', '1px', '1px', ''])).toBe(false);
    });
});
