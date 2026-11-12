import { checkSelectSummary, tickState, toggleAll, toggleOne } from '../../src/Editors/CheckSelect/checkSelectState';

const items = [{ text: 'Presentations', value: 'p' }, { text: 'Reports', value: 'r' }, { text: 'Notes', value: 'n' }, { text: 'Packages', value: 'k' }];
const values = items.map(i => i.value);
const words = { all: 'All types', none: 'No types' };

describe('checkSelectSummary', () => {
    it('says all, none, the names of one or two, else how many', () => {
        expect(checkSelectSummary(items, values, words)).toBe('All types');
        expect(checkSelectSummary(items, [], words)).toBe('No types');
        expect(checkSelectSummary(items, ['n'], words)).toBe('Notes');
        expect(checkSelectSummary(items, ['n', 'p'], words)).toBe('Presentations, Notes');
        expect(checkSelectSummary(items, ['p', 'r', 'n'], words)).toBe('3 of 4');
    });
    it('ignores values the list does not offer, and an empty list says none', () => {
        expect(checkSelectSummary(items, ['x', 'p'], words)).toBe('Presentations');
        expect(checkSelectSummary([], ['p'], words)).toBe('No types');
    });
});

describe('Select all', () => {
    it('knows all, none and some', () => {
        expect(tickState(values, values)).toBe('all');
        expect(tickState(values, [])).toBe('none');
        expect(tickState(values, ['r'])).toBe('some');
    });
    it('ticks every choice when any is unticked, unticks all when all are ticked', () => {
        expect(toggleAll(values, ['r'])).toEqual(values);
        expect(toggleAll(values, [])).toEqual(values);
        expect(toggleAll(values, values)).toEqual([]);
    });
    it('keeps values the list does not offer', () => {
        expect(toggleAll(values, ['x'])).toEqual([...values, 'x']);
        expect(toggleAll(values, [...values, 'x'])).toEqual(['x']);
    });
});

describe('one tick', () => {
    it('adds or removes one, in the list\'s order', () => {
        expect(toggleOne(values, ['n'], 'p', true)).toEqual(['p', 'n']);
        expect(toggleOne(values, ['p', 'n'], 'p', false)).toEqual(['n']);
        expect(toggleOne(values, ['x', 'n'], 'r', true)).toEqual(['r', 'n', 'x']);
    });
});
