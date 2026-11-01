import { parseShadowList, stringifyShadowList } from '../../src/Editors/Style/ShadowEditor/ShadowValue';

describe('text-shadow values (juel-shadow-editor kind="text")', () => {
    it('reads a stack of text shadows (no spread, units other than px) and writes them back the same', () => {
        const value = '1px 1px 2px black, 0 0 1em blue';
        const model = parseShadowList(value)!;
        expect(model.shadows.map(s => [s.x, s.y, s.blur, s.spread, s.color])).toEqual([['1px', '1px', '2px', '0', 'black'], ['0', '0', '1em', '0', 'blue']]);
        expect(stringifyShadowList(model)).toBe(value);
    });

    it('a two-length text shadow (no blur) stays two lengths', () => {
        expect(stringifyShadowList(parseShadowList('2px 3px rgba(0, 0, 0, 0.5)')!)).toBe('2px 3px rgba(0, 0, 0, 0.5)');
    });
});
