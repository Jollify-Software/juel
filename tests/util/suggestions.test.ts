import { matchSuggestions, Suggestion } from '../../src/Editors/MarkdownEditor/Suggestions';

const suggestions: Suggestion[] = [
    { after: ':::', label: 'columns', insert: 'columns\n${1:left}\n:::\n${2:right}\n:::' },
    { after: ':::', label: 'shape' },
    { after: '![', label: 'logo.png' },
    { after: '[', label: 'Home' },
    { after: '](', label: 'about.md' },
];

describe('matchSuggestions', () => {
    test('::: at a line start lists its suggestions, filtered by what was typed', () => {
        expect(matchSuggestions(':::', suggestions)!.options.map(s => s.label)).toEqual(['columns', 'shape']);
        const m = matchSuggestions(':::co', suggestions)!;
        expect(m.options.map(s => s.label)).toEqual(['columns']);
        expect(m.from).toBe(3);
        expect(m.typed).toBe('co');
    });

    test('::: not at a line start, or a longer fence, matches nothing', () => {
        expect(matchSuggestions('text :::', suggestions)).toBeNull();
        expect(matchSuggestions('::::', suggestions)).toBeNull();
    });

    test('the longest trigger wins', () => {
        expect(matchSuggestions('see [Home](ab', suggestions)!.after).toBe('](');
        expect(matchSuggestions('see ![lo', suggestions)!.options.map(s => s.label)).toEqual(['logo.png']);
        expect(matchSuggestions('see [H', suggestions)!.after).toBe('[');
    });

    test('extra triggers match with no fixed suggestions (for a suggest callback)', () => {
        expect(matchSuggestions('see {', suggestions)).toBeNull();
        const m = matchSuggestions('see {.wi', suggestions, ['{'])!;
        expect(m.after).toBe('{');
        expect(m.typed).toBe('.wi');
        expect(m.options).toEqual([]);
    });

    test('a front-matter key matches with or without the space YAML puts after its colon', () => {
        const keys: Suggestion[] = [{ after: 'theme:', label: 'dark' }, { after: 'theme:', label: 'light' }];
        expect(matchSuggestions('theme:', keys)!.options.map(s => s.label)).toEqual(['dark', 'light']);
        const m = matchSuggestions('theme: da', keys)!;
        expect(m.options.map(s => s.label)).toEqual(['dark']);
        expect(m.from).toBe(7);
        expect(m.typed).toBe('da');
        expect(matchSuggestions('theme: ', keys)!.from).toBe(7);
        // ':::' isn't a key: a space after it still matches nothing
        expect(matchSuggestions('::: co', suggestions)).toBeNull();
    });

    test('no trigger, no match', () => {
        expect(matchSuggestions('plain words', suggestions)).toBeNull();
        expect(matchSuggestions('', [])).toBeNull();
    });
});
