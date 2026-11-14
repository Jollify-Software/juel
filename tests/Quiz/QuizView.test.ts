import { displayOrder, initialState, isCorrect, QuizState } from '../../src/Quiz/QuizState';
import { fromShownOrder, quizViewMarkup, toShownOrder } from '../../src/Quiz/QuizView';

// A viewer's quiz lists the items in the order shown (QUIZ-PLAN Q5): its state and key must mean the same there.
describe('QuizView', () => {
    const order = displayOrder(5, 12345); // shown place j holds source item order[j]

    test('choice: selected and the key follow the items', () => {
        const state: QuizState = { ...initialState('choice', 5), selected: [order[3]], checked: true };
        const { state: shown, answer } = toShownOrder('choice', order, state, [order[3]]);
        expect(shown.selected).toEqual([3]);
        expect(answer).toEqual([3]);
        expect(isCorrect(shown, answer!)).toBe(isCorrect(state, [order[3]]));
    });

    test('sort: placed and the key are indexed by item, so they move with the items', () => {
        const key = [0, 0, 1, 1, 2];
        const placed = [0, null, 1, 2, 2];
        const state: QuizState = { ...initialState('sort', 5), placed };
        const { state: shown, answer } = toShownOrder('sort', order, state, key);
        order.forEach((source, j) => {
            expect(shown.placed![j]).toBe(placed[source]);
            expect(answer![j]).toBe(key[source]);
        });
        expect(isCorrect(shown, answer!)).toBe(isCorrect(state, key));
        expect(isCorrect({ ...shown, placed: answer }, answer!)).toBe(true);
    });

    test('match: placed follows the partners; the key names each entry\'s partner by its shown place', () => {
        const key = [2, 0, 4, 1, 3]; // entry i's partner (source index)
        const { answer } = toShownOrder('match', order, initialState('match', 5), key);
        answer!.forEach((shownPartner, entry) => expect(order[shownPartner]).toBe(key[entry]));
    });

    test('no key is given unless asked for', () => {
        expect(toShownOrder('choice', order, initialState('choice', 5), null).answer).toBeUndefined();
    });

    test('markup: the lists a juel-quiz reads, groups with their colours', () => {
        expect(quizViewMarkup({ type: 'sort', question: '<b>Q</b>', items: ['Dog', 'Eagle'], groups: [{ html: 'Mammal', colour: '#f6c' }, { html: 'Bird' }], state: initialState('sort', 2) }))
            .toBe('<div><b>Q</b></div><ol data-groups><li data-colour="#f6c">Mammal</li><li>Bird</li></ol><ul><li>Dog</li><li>Eagle</li></ul>');
        expect(quizViewMarkup({ type: 'match', question: 'Q', items: ['B'], groups: [{ html: 'A' }], state: initialState('match', 1), answer: [0], explanation: 'Why' }))
            .toBe('<div>Q</div><ul><li>A</li></ul><ul data-partners><li>B</li></ul><blockquote>Why</blockquote>');
    });
});

describe('QuizView: a student\'s answer back in source order (QUIZ-PLAN Q6)', () => {
    const order = displayOrder(5, 777);
    test('round trip: to the order shown and back', () => {
        const state: QuizState = { ...initialState('sort', 5), selected: [], placed: [0, null, 2, 1, 0] };
        const { state: shown } = toShownOrder('sort', order, state, null);
        expect(fromShownOrder(order, shown).placed).toEqual(state.placed);
        const choice: QuizState = { ...initialState('choice', 5), selected: [1, 4] };
        expect(fromShownOrder(order, toShownOrder('choice', order, choice, null).state).selected).toEqual([1, 4]);
    });
    test('junk indices are dropped', () => {
        expect(fromShownOrder(order, { ...initialState('choice', 5), selected: [9, -1, 0] }).selected).toEqual([order[0]]);
    });
});
