import { readTransform, writeTransform, isPlainLength } from '../../src/Editors/Style/TransformEditor/TransformValue';
import { clearBorderImage, defaultBorderImage, readBorderImage, writeBorderImage } from '../../src/Editors/Style/BorderImageEditor/BorderImageValue';
import { parsePercentPoint, pointFromField } from '../../src/Editors/PointSelector/pointValue';
import { lengthRanges } from '../../src/Editors/Style/SidesEditor/SidesValue';

describe('readTransform', () => {
    test('splits translate into its two parts', () => {
        expect(readTransform({ translate: '2vw -1vh' })).toMatchObject({ x: '2vw', y: '-1vh' });
        expect(readTransform({ translate: '2vw' })).toMatchObject({ x: '2vw', y: '' });
    });

    test('a translate a slider can\'t show stays whole, for the formula row', () => {
        const parts = readTransform({ translate: 'calc(1vw + 2px) 3px' });
        expect(parts.x).toBe('calc(1vw + 2px) 3px');
        expect(parts.y).toBe('');
        expect(isPlainLength(parts.x)).toBe(false);
    });

    test('takes skew out of transform and keeps everything else', () => {
        expect(readTransform({ transform: 'rotate(-3deg) scale(1.1) skewX(5deg)' })).toMatchObject({ skewX: '5deg', skewY: '', other: 'rotate(-3deg) scale(1.1)' });
        expect(readTransform({ transform: 'skew(10deg, 20deg)' })).toMatchObject({ skewX: '10deg', skewY: '20deg', other: '' });
        expect(readTransform({ transform: 'skew(10deg)' })).toMatchObject({ skewX: '10deg', skewY: '', other: '' });
        expect(readTransform({ transform: 'none' })).toMatchObject({ other: '', skewX: '' });
        expect(readTransform({ transform: 'var(--spin)' })).toMatchObject({ other: 'var(--spin)' });
    });
});

describe('readTransform: rotate on three axes', () => {
    test('rotateX and rotateY come out of transform, leaving the rest', () => {
        expect(readTransform({ transform: 'perspective(800px) rotateX(10deg) rotateY(20deg) skewY(1deg)', rotate: '30deg' }))
            .toMatchObject({ rotateX: '10deg', rotateY: '20deg', rotate: '30deg', skewY: '1deg', other: 'perspective(800px)' });
    });

    test('a rotate that names its axis is that axis\'s slider, either way round', () => {
        expect(readTransform({ rotate: 'x 30deg' })).toMatchObject({ rotateX: '30deg', rotateY: '', rotate: '' });
        expect(readTransform({ rotate: '30deg y' })).toMatchObject({ rotateX: '', rotateY: '30deg', rotate: '' });
        expect(readTransform({ rotate: 'z 30deg' })).toMatchObject({ rotateX: '', rotateY: '', rotate: '30deg' });
    });

    test('a plain angle, or any other form of rotate, is left where it was', () => {
        expect(readTransform({ rotate: '15deg' })).toMatchObject({ rotate: '15deg', rotateX: '' });
        expect(readTransform({ rotate: '1 1 0 45deg' })).toMatchObject({ rotate: '1 1 0 45deg', rotateX: '', rotateY: '' });
        expect(readTransform({ rotate: 'calc(var(--p) * 1turn)' })).toMatchObject({ rotate: 'calc(var(--p) * 1turn)', rotateX: '' });
    });

    test('round trip keeps every part', () => {
        const declarations = { rotate: '30deg', transform: 'rotateX(10deg) rotateY(20deg)' };
        expect(writeTransform(readTransform(declarations)).set).toEqual(declarations);
    });
});

describe('writeTransform', () => {
    const empty = { x: '', y: '', rotateX: '', rotateY: '', rotate: '', scale: '', skewX: '', skewY: '', other: '', origin: '' };

    test('rotate X and Y go in transform, before skew; Z stays the rotate property', () => {
        const { set } = writeTransform({ ...empty, other: 'perspective(800px)', rotateX: '10deg', rotateY: '20deg', rotate: '30deg', skewX: '5deg' });
        expect(set.transform).toBe('perspective(800px) rotateX(10deg) rotateY(20deg) skewX(5deg)');
        expect(set.rotate).toBe('30deg');
    });

    test('clears what is empty', () => {
        expect(writeTransform(empty)).toEqual({ set: {}, clear: ['translate', 'rotate', 'scale', 'transform', 'transform-origin'] });
    });

    test('move, rotate and scale stay individual properties', () => {
        expect(writeTransform({ ...empty, x: '2vw', y: '-1vh', rotate: '15deg', scale: '1.2' }).set).toEqual({ translate: '2vw -1vh', rotate: '15deg', scale: '1.2' });
    });

    test('only Y still needs an X', () => {
        expect(writeTransform({ ...empty, y: '3vh' }).set.translate).toBe('0 3vh');
    });

    test('a zero Y is dropped', () => {
        expect(writeTransform({ ...empty, x: '2vw', y: '0vh' }).set.translate).toBe('2vw');
    });

    test('skew goes after what else is in transform, which is never lost', () => {
        expect(writeTransform({ ...empty, other: 'matrix(1, 0, 0, 1, 0, 0)', skewX: '5deg' }).set.transform).toBe('matrix(1, 0, 0, 1, 0, 0) skewX(5deg)');
    });

    test('round trip', () => {
        const declarations = { translate: '2vw -1vh', rotate: '15deg', scale: '1.2', transform: 'perspective(200px) skewX(5deg) skewY(2deg)', 'transform-origin': '50% -150%' };
        expect(writeTransform(readTransform(declarations)).set).toEqual(declarations);
    });
});

describe('parsePercentPoint', () => {
    test('percentages, keywords and the order keywords can come in', () => {
        expect(parsePercentPoint('50% -150%')).toEqual({ x: 50, y: -150 });
        expect(parsePercentPoint('center')).toEqual({ x: 50, y: 50 });
        expect(parsePercentPoint('left top')).toEqual({ x: 0, y: 0 });
        expect(parsePercentPoint('top right')).toEqual({ x: 100, y: 0 });
        expect(parsePercentPoint('right')).toEqual({ x: 100, y: 50 });
        expect(parsePercentPoint('0 100%')).toEqual({ x: 0, y: 100 });
    });

    test('null for what it can\'t place', () => {
        expect(parsePercentPoint('12px 3px')).toBeNull();
        expect(parsePercentPoint('')).toBeNull();
        expect(parsePercentPoint('1% 2% 3%')).toBeNull();
    });
});

describe('pointFromField', () => {
    test('the field\'s middle third is the element, and it snaps to the presets', () => {
        expect(pointFromField(1 / 3, 1 / 3)).toEqual({ x: 0, y: 0 });
        expect(pointFromField(0.5, 0.5)).toEqual({ x: 50, y: 50 });
        expect(pointFromField(2 / 3, 0.51)).toEqual({ x: 100, y: 50 });
        expect(pointFromField(0, 1)).toEqual({ x: -100, y: 200 });
        expect(pointFromField(0.42, 0.6, 0)).toEqual({ x: 26, y: 80 });
    });

    test('stays in the field', () => {
        expect(pointFromField(-1, 2)).toEqual({ x: -100, y: 200 });
    });
});

describe('border image', () => {
    test('a picture starts cut in thirds and tiled, a gradient stretched', () => {
        expect(defaultBorderImage('url(a.png)')).toMatchObject({ slice: ['33%', '33%', '33%', '33%'], repeat: 'round' });
        expect(defaultBorderImage('linear-gradient(red, blue)')).toMatchObject({ slice: ['1', '1', '1', '1'], repeat: 'stretch' });
    });

    test('it is written with longhands, because the border shorthand would reset it', () => {
        const { set, clear } = writeBorderImage(defaultBorderImage('url(a.png)', '12px'));
        expect(set).toEqual({ 'border-style': 'solid', 'border-width': '12px', 'border-image-source': 'url(a.png)', 'border-image-slice': '33%', 'border-image-repeat': 'round' });
        expect(clear).toContain('border');
        expect(clear).toContain('border-top');
        expect(clear).toContain('border-image');
        expect(clear).not.toContain('border-width');
    });

    test('round trip, with fill and an outset', () => {
        const image = { ...defaultBorderImage('url(a.png)', '10px'), slice: ['10%', '20%', '10%', '20%'] as [string, string, string, string], fill: true, outset: '4px' };
        const { set } = writeBorderImage(image);
        expect(set['border-image-slice']).toBe('10% 20% fill');
        expect(readBorderImage(set)).toEqual(image);
    });

    test('none when there is no source', () => {
        expect(readBorderImage({})).toBeNull();
        expect(readBorderImage({ 'border-image-source': 'none' })).toBeNull();
    });

    test('taking it off clears the border it was drawn on', () => {
        const { set, clear } = clearBorderImage();
        expect(set).toEqual({});
        for (const name of ['border-image-source', 'border-image-slice', 'border-style', 'border-width', 'border']) expect(clear).toContain(name);
    });
});

describe('lengthRanges', () => {
    test('each unit gets ends that suit it', () => {
        const r = lengthRanges(['px', 'em', '%'], 100);
        expect(r.px).toEqual({ min: 0, max: 100, step: 1 });
        expect(r.em).toEqual({ min: 0, max: 10, step: 0.05 });
        expect(r['%']).toEqual({ min: 0, max: 100, step: 1 });
    });

    test('negative mirrors them', () => {
        expect(lengthRanges(['px'], 40, true).px).toEqual({ min: -40, max: 40, step: 1 });
    });
});
