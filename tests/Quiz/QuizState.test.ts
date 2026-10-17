import { displayOrder, hashSeed, initialState, isCorrect, marks, parseAnswer, reduce } from '../../src/Quiz/QuizState';

describe('QuizState', () => {
    test('radio: selecting one item clears the other', () => {
        let s = reduce(initialState(), { type: 'quiz-select', index: 0, on: true }, false, 3);
        s = reduce(s, { type: 'quiz-select', index: 2, on: true }, false, 3);
        expect(s.selected).toEqual([2]);
    });

    test('checkboxes: items add and remove, kept sorted', () => {
        let s = reduce(initialState(), { type: 'quiz-select', index: 2, on: true }, true, 3);
        s = reduce(s, { type: 'quiz-select', index: 0, on: true }, true, 3);
        expect(s.selected).toEqual([0, 2]);
        s = reduce(s, { type: 'quiz-select', index: 2, on: false }, true, 3);
        expect(s.selected).toEqual([0]);
    });

    test('an out-of-range index changes nothing', () => {
        const s = initialState();
        expect(reduce(s, { type: 'quiz-select', index: 5, on: true }, false, 3)).toBe(s);
    });

    test('a new choice clears checked; reset clears everything', () => {
        let s = reduce(initialState(), { type: 'quiz-select', index: 1, on: true }, false, 3);
        s = reduce(s, { type: 'quiz-check' }, false, 3);
        expect(s.checked).toBe(true);
        s = reduce(s, { type: 'quiz-select', index: 0, on: true }, false, 3);
        expect(s.checked).toBe(false);
        s = reduce(s, { type: 'quiz-reveal' }, false, 3);
        expect(reduce(s, { type: 'quiz-reset' }, false, 3)).toEqual(initialState());
    });

    test('the state is plain data', () => {
        const s = reduce(initialState(), { type: 'quiz-select', index: 1, on: true }, false, 3);
        expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    });

    test('isCorrect needs exactly the right items', () => {
        const s = { ...initialState(), selected: [1, 3] };
        expect(isCorrect(s, [3, 1])).toBe(true);
        expect(isCorrect(s, [1])).toBe(false);
        expect(isCorrect({ ...s, selected: [1] }, [1, 3])).toBe(false);
    });

    test('parseAnswer', () => {
        expect(parseAnswer('1, 3')).toEqual([1, 3]);
        expect(parseAnswer('x,2,-1')).toEqual([2]);
        expect(parseAnswer(null)).toEqual([]);
    });

    test('displayOrder: same seed, same order; a permutation; yes/no kept', () => {
        const a = displayOrder(6, hashSeed('Which planet?'));
        expect(displayOrder(6, hashSeed('Which planet?'))).toEqual(a);
        expect([...a].sort()).toEqual([0, 1, 2, 3, 4, 5]);
        expect(displayOrder(2, 12345)).toEqual([0, 1]);
        expect(displayOrder(4, 7, false)).toEqual([0, 1, 2, 3]);
        // Different seeds don't all give the same order.
        const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(n => displayOrder(5, n).join()));
        expect(orders.size).toBeGreaterThan(1);
    });

    test('choice state has no placed list; sort and match start with every item in the pool', () => {
        expect(initialState()).not.toHaveProperty('placed');
        expect(initialState('sort', 3).placed).toEqual([null, null, null]);
    });

    test('sort: quiz-move places items; several share a group; out of range is ignored', () => {
        let s = initialState('sort', 3);
        s = reduce(s, { type: 'quiz-move', index: 0, to: 1 }, false, 3, 2);
        s = reduce(s, { type: 'quiz-move', index: 2, to: 1 }, false, 3, 2);
        expect(s.placed).toEqual([1, null, 1]);
        expect(reduce(s, { type: 'quiz-move', index: 1, to: 2 }, false, 3, 2)).toBe(s);
        s = reduce(s, { type: 'quiz-move', index: 0, to: null }, false, 3, 2);
        expect(s.placed).toEqual([null, null, 1]);
    });

    test('match: a slot holds one partner; the one there goes back to the pool', () => {
        let s = initialState('match', 3);
        s = reduce(s, { type: 'quiz-move', index: 0, to: 2 }, false, 3, 3);
        s = reduce(s, { type: 'quiz-move', index: 1, to: 2 }, false, 3, 3);
        expect(s.placed).toEqual([null, 2, null]);
    });

    test('sort: check, marks, reveal, reset', () => {
        const answer = [0, 0, 1];
        let s = initialState('sort', 3);
        s = reduce(s, { type: 'quiz-move', index: 0, to: 0 }, false, 3, 2);
        s = reduce(s, { type: 'quiz-move', index: 1, to: 1 }, false, 3, 2);
        s = reduce(s, { type: 'quiz-check' }, false, 3, 2);
        expect(marks(s, answer)).toEqual(['right', 'wrong', null]);
        expect(isCorrect(s, answer)).toBe(false);
        s = reduce(s, { type: 'quiz-reveal' }, false, 3, 2, answer);
        expect(s.placed).toEqual(answer);
        expect(isCorrect(s, answer)).toBe(true);
        expect(reduce(s, { type: 'quiz-reset' }, false, 3, 2)).toEqual(initialState('sort', 3));
        expect(marks(initialState(), answer)).toEqual([]);
    });

    test('selecting what is already selected changes nothing, so a Check stays', () => {
        let s = reduce(initialState(), { type: 'quiz-select', index: 1, on: true }, false, 3);
        s = reduce(s, { type: 'quiz-check' }, false, 3);
        expect(reduce(s, { type: 'quiz-select', index: 1, on: true }, false, 3)).toBe(s);
        expect(reduce(s, { type: 'quiz-select', index: 2, on: false }, true, 3)).toBe(s);
        expect(reduce(s, { type: 'quiz-select', index: 1, on: false }, false, 3).checked).toBe(false);
    });

    test('a move to the place an item is already in changes nothing, so a Check stays', () => {
        let s = initialState('sort', 3);
        s = reduce(s, { type: 'quiz-move', index: 0, to: 1 }, false, 3, 2);
        s = reduce(s, { type: 'quiz-check' }, false, 3, 2);
        expect(reduce(s, { type: 'quiz-move', index: 0, to: 1 }, false, 3, 2)).toBe(s);
        expect(reduce(s, { type: 'quiz-move', index: 1, to: null }, false, 3, 2)).toBe(s);
        expect(reduce(s, { type: 'quiz-move', index: 0, to: 0 }, false, 3, 2).checked).toBe(false);
    });

    test('quiz-move on a choice quiz changes nothing', () => {
        const s = initialState();
        expect(reduce(s, { type: 'quiz-move', index: 0, to: 0 }, false, 3, 3)).toBe(s);
    });
});