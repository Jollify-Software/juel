import { moveSlice, readBorderImage, sideValue, sliceFraction, withSide, writeBorderImage } from '../../src/Editors/Style/BorderImageEditor/BorderImageValue';
import { BorderImagePresets, presetSource, readPresetSource, tintSvg } from '../../src/Editors/Style/BorderImageEditor/BorderImagePresets';
import type { FourValues } from '../../src/Editors/Style/SidesEditor/SidesValue';

const square = { width: 90, height: 90 };
const wide = { width: 200, height: 100 };
const percents: FourValues = ['33%', '33%', '33%', '33%'];

describe('slice fractions', () => {
    test('a % is of the picture; a bare number is the picture\'s px along that side', () => {
        expect(sliceFraction(['25%', '10', '10', '10'], 'top', wide)).toBe(0.25);
        expect(sliceFraction(['25%', '10', '10', '10'], 'right', wide)).toBe(0.05);
        expect(sliceFraction(['25%', '10', '10', '10'], 'bottom', wide)).toBe(0.1);
    });

    test('stays on the picture, and nonsense is nothing', () => {
        expect(sliceFraction(['150%', '-5', '0', 'x' as string], 'top', wide)).toBe(1);
        expect(sliceFraction(['150%', '-5', '0', 'x' as string], 'right', wide)).toBe(0);
        expect(sliceFraction(['150%', '-5', '0', 'x' as string], 'left', wide)).toBe(0);
    });
});

describe('moveSlice', () => {
    test('All moves all four, and can\'t pass the middle', () => {
        expect(moveSlice(percents, 'top', 0.2, square, true)).toEqual(['20%', '20%', '20%', '20%']);
        expect(moveSlice(percents, 'left', 0.9, square, true)).toEqual(['50%', '50%', '50%', '50%']);
    });

    test('one side moves alone and stops at the opposite guide', () => {
        expect(moveSlice(percents, 'right', 0.1, square, false)).toEqual(['33%', '10%', '33%', '33%']);
        expect(moveSlice(['70%', '33%', '33%', '33%'], 'bottom', 0.5, square, false)).toEqual(['70%', '33%', '30%', '33%']);
    });

    test('never goes past the edge', () => {
        expect(moveSlice(percents, 'top', -0.4, square, false)[0]).toBe('0%');
    });

    test('a px slice stays bare whole px, measured along its own side', () => {
        const px: FourValues = ['30', '30', '30', '30'];
        expect(moveSlice(px, 'left', 0.25, wide, false)).toEqual(['30', '30', '30', '50']);
        expect(moveSlice(px, 'top', 0.25, wide, false)).toEqual(['25', '30', '30', '30']);
    });

    test('px together stops at half the picture\'s short side, so no side crosses', () => {
        expect(moveSlice(['30', '30', '30', '30'], 'left', 0.5, wide, true)).toEqual(['50', '50', '50', '50']);
    });

    test('each side keeps its own unit', () => {
        expect(moveSlice(['10%', '30', '10%', '30'], 'right', 0.5, square, false)).toEqual(['10%', '45', '10%', '30']);
    });
});

describe('a value for one side', () => {
    test('shows the side, and All only when they\'re the same', () => {
        expect(sideValue('4px 8px', 'right')).toBe('8px');
        expect(sideValue('4px 8px', 'all')).toBe('');
        expect(sideValue('4px', 'all')).toBe('4px');
        expect(sideValue('', 'top')).toBe('');
    });

    test('sets one side, filling the others from what was there or the blank', () => {
        expect(withSide('4px', 'top', '9px', '16px')).toBe('9px 4px 4px');
        expect(withSide('', 'left', '9px', '0')).toBe('0 0 0 9px');
        expect(withSide('4px 8px', 'all', '2px', '0')).toBe('2px');
    });

    test('emptying a side gives it the blank', () => {
        expect(withSide('4px 8px 4px 2px', 'left', '', '0')).toBe('4px 8px 4px 0');
    });
});

describe('the declarations', () => {
    const declarations = {
        'border-image-source': 'url(a.png)', 'border-image-slice': '10% 20% fill', 'border-width': '4px 8px',
        'border-image-width': '2em', 'border-image-outset': '1px 2px', 'border-image-repeat': 'round stretch',
    };

    test('every part reads', () => {
        expect(readBorderImage(declarations)).toEqual({
            source: 'url(a.png)', slice: ['10%', '20%', '10%', '20%'], fill: true, width: '4px 8px',
            imageWidth: '2em', outset: '1px 2px', repeat: 'round', repeatSides: 'stretch',
        });
    });

    test('nothing is lost on the way back, border-image-width included', () => {
        const { set } = writeBorderImage(readBorderImage(declarations)!);
        expect(set).toMatchObject(declarations);
    });

    test('one repeat value means both, and writes as one', () => {
        const image = readBorderImage({ 'border-image-source': 'url(a.png)', 'border-image-repeat': 'space' })!;
        expect([image.repeat, image.repeatSides]).toEqual(['space', 'space']);
        expect(writeBorderImage(image).set['border-image-repeat']).toBe('space');
    });

    test('a repeat that isn\'t one is stretch', () => {
        const image = readBorderImage({ 'border-image-source': 'url(a.png)', 'border-image-repeat': 'nonsense' })!;
        expect([image.repeat, image.repeatSides]).toEqual(['stretch', 'stretch']);
    });
});

describe('tinting a built-in picture', () => {
    const lightness = (hex: string) => {
        const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
        return (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
    };
    const colours = (svg: string) => svg.match(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi) ?? [];
    const named = (id: string) => BorderImagePresets.find(p => p.id === id)!;

    test('the main colour becomes exactly the chosen one', () => {
        expect(tintSvg('<rect fill="#1098ad"/>', '#1098ad', '#E03131')).toBe('<rect fill="#e03131"/>');
    });

    test('near-white paper and a drawn black shadow stay; a reference to a gradient isn\'t a colour', () => {
        const svg = '<rect fill="#fff"/><rect fill="#f1f3f5"/><rect fill="#000" opacity=".1"/><rect fill="url(#c)"/><rect fill="#123456"/>';
        const tinted = tintSvg(svg, '#123456', '#e03131');
        expect(tinted).toBe('<rect fill="#fff"/><rect fill="#f1f3f5"/><rect fill="#000" opacity=".1"/><rect fill="url(#c)"/><rect fill="#e03131"/>');
    });

    test('the other tones keep their order, so a bevel stays a bevel', () => {
        const gilt = named('gilt');
        const before = colours(gilt.svg).filter(c => c !== '#000');
        for (const chosen of ['#e03131', '#1971c2', '#111111', '#f8f9fa']) {
            const after = colours(tintSvg(gilt.svg, gilt.colour, chosen)).filter(c => c !== '#000');
            expect(after).toHaveLength(before.length);
            const order = (list: string[]) => list.map((c, i) => [lightness(c), i] as const).sort((a, b) => a[0] - b[0]).map(p => p[1]);
            expect(order(after)).toEqual(order(before));
        }
    });

    test('a colourful picture tinted a grey goes grey, and every tone is a real colour', () => {
        const dots = named('dots');
        for (const c of colours(tintSvg(dots.svg, dots.colour, '#808080'))) {
            const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
            expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(1);
        }
    });

    test.each(['#000000', '#ffffff', '#808080', '#e03131'])('every picture tinted %s still has valid colours', chosen => {
        for (const preset of BorderImagePresets) {
            for (const c of colours(tintSvg(preset.svg, preset.colour, chosen))) expect(c).toMatch(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
        }
    });

    test('every picture\'s main colour is in its drawing', () => {
        for (const preset of BorderImagePresets) expect(preset.svg.toLowerCase()).toContain(preset.colour);
    });

    test('its own colour, or nothing, is the untinted source', () => {
        const key = named('key');
        expect(presetSource(key, key.colour)).toBe(presetSource(key));
        expect(presetSource(key, '')).toBe(presetSource(key));
        expect(presetSource(key, 'not a colour')).toBe(presetSource(key));
    });

    test('a source says which picture and colour it is', () => {
        const key = named('key');
        expect(readPresetSource(presetSource(key), BorderImagePresets)).toEqual({ preset: key, colour: '' });
        expect(readPresetSource(presetSource(key, '#E03131'), BorderImagePresets)).toEqual({ preset: key, colour: '#e03131' });
    });

    test('any other picture isn\'t one', () => {
        for (const source of ['url(a.png)', 'url("data:image/svg+xml,%3Csvg%20width%3D%221%22%2F%3E")', 'url("data:image/svg+xml,%E0%A4%A")', 'linear-gradient(red, blue)', '']) {
            expect(readPresetSource(source, BorderImagePresets)).toBeNull();
        }
    });

    test.each(BorderImagePresets.map(p => [p.id, p] as const))('%s tinted has nothing for a simple CSS parser to trip on', (_id, preset) => {
        const source = presetSource(preset, '#e03131');
        expect(source.slice('url("'.length, -'")'.length)).not.toMatch(/[;()'"{}\s]/);
    });
});

describe('the built-in pictures', () => {
    test('have unique ids and labels', () => {
        expect(new Set(BorderImagePresets.map(p => p.id)).size).toBe(BorderImagePresets.length);
        expect(new Set(BorderImagePresets.map(p => p.label)).size).toBe(BorderImagePresets.length);
    });

    test.each(BorderImagePresets.map(p => [p.id, p] as const))('%s has a size of its own, so a px slice means something', (_id, preset) => {
        expect(preset.svg).toMatch(/^<svg [^>]*width="90" height="90"/);
        expect(Number(preset.slice)).toBeGreaterThan(0);
    });

    test.each(BorderImagePresets.map(p => [p.id, p] as const))('%s has nothing in its source for a simple CSS parser to trip on', (_id, preset) => {
        const source = presetSource(preset);
        const inside = source.slice('url("'.length, -'")'.length);
        expect(source.startsWith('url("data:image/svg+xml,')).toBe(true);
        expect(inside).not.toMatch(/[;()'"{}\s]/);
        expect(decodeURIComponent(inside.slice('data:image/svg+xml,'.length))).toBe(preset.svg);
    });

    test('a chosen picture survives reading and writing', () => {
        const source = presetSource(BorderImagePresets[0]);
        expect(writeBorderImage(readBorderImage({ 'border-image-source': source })!).set['border-image-source']).toBe(source);
    });
});
