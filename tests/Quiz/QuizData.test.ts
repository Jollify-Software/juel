import { quizDataError, readQuizData } from '../../src/Quiz/QuizData';

describe('QuizData', () => {
    test('choice: the right items are the key, in source order', () => {
        const read = readQuizData(JSON.stringify({
            question: 'Which planet is the largest?',
            items: [{ text: 'Mars' }, { text: 'Jupiter', right: true }, { text: 'Venus' }],
            explanation: 'More than twice the mass of the others.',
        }));
        expect(read).toEqual({
            type: 'choice',
            answer: [1],
            html: '<p>Which planet is the largest?</p><ul><li>Mars</li><li>Jupiter</li><li>Venus</li></ul>'
                + '<blockquote><p>More than twice the mass of the others.</p></blockquote>',
        });
    });

    test('sort: each item\'s key is its group; colours become data-colour', () => {
        const read = readQuizData(JSON.stringify({
            type: 'sort', question: 'Put each animal in its group.',
            groups: [{ name: 'Mammal', colour: '#f6c', items: ['Dog', 'Whale'] }, { name: 'Bird', color: '#0af', items: ['Eagle'] }],
        }));
        expect(read).toEqual({
            type: 'sort',
            answer: [0, 0, 1],
            html: '<p>Put each animal in its group.</p><ol data-groups><li data-colour="#f6c">Mammal</li><li data-colour="#0af">Bird</li></ol>'
                + '<ul><li>Dog</li><li>Whale</li><li>Eagle</li></ul>',
        });
    });

    test('match: left entries, then partners, each its own', () => {
        const read = readQuizData(JSON.stringify({ type: 'match', question: 'Match.', pairs: [['1066', 'Hastings'], ['1969', 'The Moon']] }));
        expect(read).toEqual({
            type: 'match',
            answer: [0, 1],
            html: '<p>Match.</p><ul><li>1066</li><li>1969</li></ul><ul data-partners><li>Hastings</li><li>The Moon</li></ul>',
        });
    });

    test('a colour that is not text is left out, not a crash; a null explanation is no explanation (as Slipway)', () => {
        const read = readQuizData(JSON.stringify({ type: 'sort', question: 'Q', explanation: null, groups: [{ name: 'A', colour: 3, color: '#0af', items: ['x'] }, { name: 'B', colour: 3, items: ['y'] }] }));
        expect('html' in read && read.html).toBe('<p>Q</p><ol data-groups><li data-colour="#0af">A</li><li>B</li></ol><ul><li>x</li><li>y</li></ul>');
    });

    test('a null type is a choice quiz (as Slipway)', () => {
        const read = readQuizData(JSON.stringify({ type: null, question: 'Q', items: [{ text: 'a', right: true }, { text: 'b' }] }));
        expect('type' in read && read.type).toBe('choice');
        expect('answer' in read && read.answer).toEqual([0]);
    });

    test('a colour cannot break out of its attribute', () => {
        const read = readQuizData(JSON.stringify({ type: 'sort', question: 'Q', groups: [{ name: 'A', colour: '"><b>', items: ['x'] }] }));
        expect('html' in read && read.html).toContain('data-colour="&quot;>&lt;b>"');
    });

    test('bad data says what is wrong', () => {
        expect(readQuizData('{ nope')).toEqual({ error: expect.stringContaining('not JSON') });
        expect(quizDataError([])).toBe('the quiz data is not an object');
        expect(quizDataError({ type: 'pick', question: 'Q' })).toContain('use choice, sort or match');
        expect(quizDataError({ items: [{ text: 'a', right: true }] })).toBe('there is no "question"');
        expect(quizDataError({ question: 'Q', items: [] })).toBe('a choice quiz needs "items"');
        expect(quizDataError({ question: 'Q', items: [{ text: 'a' }] })).toBe('no item is "right": true');
        expect(quizDataError({ question: 'Q', items: [{ right: true }] })).toBe('every item needs a "text"');
        expect(quizDataError({ type: 'sort', question: 'Q', groups: [{ name: 'A', items: [] }] })).toBe('group "A" needs "items" (texts)');
        expect(quizDataError({ type: 'sort', question: 'Q', groups: [{ items: ['x'] }] })).toBe('every group needs a "name"');
        expect(quizDataError({ type: 'match', question: 'Q', pairs: [['a']] })).toBe('every pair is ["left", "right"]');
        expect(quizDataError({ type: 'match', question: 'Q', pairs: [['a', 'b', 'c']] })).toBe('every pair is ["left", "right"]');
        expect(quizDataError({ type: 'match', question: 'Q', pairs: [['a', 2]] })).toBe('every pair is ["left", "right"]');
        expect(quizDataError({ type: 'sort', question: 'Q' })).toBe('a sort quiz needs "groups"');
        expect(quizDataError({ type: 'match', question: 'Q', pairs: [] })).toBe('a match quiz needs "pairs"');
        expect(quizDataError({ question: 'Q', items: [{ text: 'a', right: 'true' }] })).toBe('no item is "right": true'); // true, not "true" (as Slipway)
        expect(quizDataError({ question: 'Q', items: [{ text: 'a', right: true }], explanation: 3 })).toBe('"explanation" is not text');
    });

    test('valid data has no error', () => {
        expect(quizDataError({ question: 'Q', items: [{ text: 'a', right: true }] })).toBeNull();
        expect(quizDataError({ type: 'match', question: 'Q', pairs: [['a', 'b']] })).toBeNull();
    });
});
