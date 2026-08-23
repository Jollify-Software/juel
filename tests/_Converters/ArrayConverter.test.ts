import { MultiArrayConvertor } from '../../src/_Converters/ArrayConverter';

describe('MultiArrayConvertor', () => {
    test('flat values (no inner separator) parse to a flat number array', () => {
        const convert = MultiArrayConvertor(',', ':');
        expect(convert('10, 20, 15, 25')).toEqual([10, 20, 15, 25]);
    });

    test('paired values (inner separator present) parse to nested arrays', () => {
        const convert = MultiArrayConvertor(',', ':');
        expect(convert('1:2, 2:4, 3:6')).toEqual([[1, 2], [2, 4], [3, 6]]);
    });

    test('single value with no outer separator parses to a single-element array', () => {
        const convert = MultiArrayConvertor(',', ':');
        expect(convert('60')).toEqual([60]);
    });
});
