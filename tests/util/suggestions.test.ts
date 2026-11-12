import { FrontMatterKeyTrigger, inFrontMatter, matchSuggestions, Suggestion, SuggestionTriggers } from '../../src/Editors/MarkdownEditor/Suggestions';

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

    test('an empty line inside the front matter lists its key names, filtered by what was typed', () => {
        const keys: Suggestion[] = [
            { after: FrontMatterKeyTrigger, label: 'theme', insert: 'theme: ' },
            { after: FrontMatterKeyTrigger, label: 'transition', insert: 'transition: ' },
            { after: FrontMatterKeyTrigger, label: 'title', insert: 'title: ' },
            ...suggestions,
        ];
        const m = matchSuggestions('', keys, [], true)!;
        expect(m.after).toBe(FrontMatterKeyTrigger);
        expect(m.from).toBe(0);
        expect(m.options.map(s => s.label)).toEqual(['theme', 'transition', 'title']);
        expect(matchSuggestions('tr', keys, [], true)!.options.map(s => s.label)).toEqual(['transition']);
        // a value after a key is the key's own trigger, not the names
        expect(matchSuggestions('theme: ', keys, [], true)).toBeNull();
        // control: outside the front matter an empty line, or a word, opens nothing
        expect(matchSuggestions('', keys)).toBeNull();
        expect(matchSuggestions('tr', keys)).toBeNull();
        // and the trigger's text is never matched as a line's text
        expect(matchSuggestions('---', keys)).toBeNull();
    });

    test('a suggest callback is asked at the front-matter trigger too', () => {
        expect(SuggestionTriggers).toContain(FrontMatterKeyTrigger);
        const m = matchSuggestions('', suggestions, SuggestionTriggers, true)!;
        expect(m.after).toBe(FrontMatterKeyTrigger);
        expect(m.options).toEqual([]);
        expect(matchSuggestions('', suggestions, SuggestionTriggers)).toBeNull();
    });

    test('inFrontMatter: between a first-line --- and its closing --- or ...', () => {
        const at = (lines: string[]) => (i: number) => lines[i];
        const deck = ['---', 'title: Hi', '', '---', '', '# One'];
        expect([0, 1, 2, 3, 4, 5].map(i => inFrontMatter(at(deck), i))).toEqual([false, true, true, false, false, false]);
        expect(inFrontMatter(at(['---', '', '...']), 1)).toBe(true);
        // a lone rule on the first line, with no closing fence, has no front matter
        expect(inFrontMatter(at(['---', '', 'text']), 1)).toBe(false);
        // front matter only starts on the first line
        expect(inFrontMatter(at(['# One', '---', '', '---']), 2)).toBe(false);
    });

    test('no trigger, no match', () => {
        expect(matchSuggestions('plain words', suggestions)).toBeNull();
        expect(matchSuggestions('', [])).toBeNull();
    });
});
