import { borderNames, borderText, parseBorder, readBorder, sidesAlike, writeBorder, emptySides } from '../../src/Editors/Style/BorderEditor/BorderValue';

describe('border values', () => {
    it('parses a border shorthand in any order', () => {
        expect(parseBorder('2px solid #fff')).toEqual({ width: '2px', style: 'solid', color: '#fff' });
        expect(parseBorder('dashed rgb(1, 2, 3) thick')).toEqual({ width: 'thick', style: 'dashed', color: 'rgb(1, 2, 3)' });
        expect(parseBorder('none')).toEqual({ width: '', style: 'none', color: '' });
        expect(parseBorder('')).toBeNull();
    });

    it('reads border, the lists, border-<side> and the longhands, later over earlier', () => {
        const sides = readBorder({
            border: '1px solid red',
            'border-width': '2px 4px',
            'border-left': '3px dotted blue',
            'border-top-color': 'green',
        });
        expect(sides.top).toEqual({ width: '2px', style: 'solid', color: 'green' });
        expect(sides.right).toEqual({ width: '4px', style: 'solid', color: 'red' });
        expect(sides.bottom).toEqual({ width: '2px', style: 'solid', color: 'red' });
        expect(sides.left).toEqual({ width: '3px', style: 'dotted', color: 'blue' });
        expect(readBorder({})).toEqual(emptySides());
    });

    it('writes border when all four match, clearing every other border declaration', () => {
        const sides = readBorder({ 'border-top': '2px solid #333', 'border-right': '2px solid #333', 'border-bottom': '2px solid #333', 'border-left': '2px solid #333' });
        const change = writeBorder(sides);
        expect(change.set).toEqual({ border: '2px solid #333' });
        expect(change.clear).toEqual(borderNames().filter(n => n !== 'border'));
    });

    it('writes border-<side> for each side set when they differ, clearing border and the rest', () => {
        const sides = emptySides();
        sides.bottom = { width: '4px', style: 'double', color: '' };
        sides.left = { width: '1px', style: 'solid', color: 'red' };
        const change = writeBorder(sides);
        expect(change.set).toEqual({ 'border-bottom': '4px double', 'border-left': '1px solid red' });
        expect(change.clear).toContain('border');
        expect(change.clear).toContain('border-top');
        expect(change.clear).toContain('border-bottom-width');
        expect(change.clear).not.toContain('border-bottom');
    });

    it('clears everything when no side is set', () => {
        expect(writeBorder(emptySides())).toEqual({ set: {}, clear: borderNames() });
    });

    it('round-trips: reading a write gives the sides back', () => {
        const sides = emptySides();
        sides.top = { width: '3px', style: 'groove', color: '#abc' };
        sides.right = { width: '1px', style: 'solid', color: '' };
        expect(readBorder(writeBorder(sides).set)).toEqual(sides);
        const all = readBorder({ border: '5px inset rgba(0, 0, 0, 0.5)' });
        expect(readBorder(writeBorder(all).set)).toEqual(all);
        expect(sidesAlike(all)).toBe(true);
        expect(sidesAlike(sides)).toBe(false);
        expect(borderText({ width: '', style: 'solid', color: '' })).toBe('solid');
    });
});
