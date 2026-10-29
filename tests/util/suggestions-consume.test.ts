import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Suggestion, toCompletion } from '../../src/Editors/MarkdownEditor/Suggestions';

// A suggestion after `![` where the editor auto-closed the bracket: `![|]`.
function accept(s: Suggestion, doc = '![]', cursor = 2) {
    const view = new EditorView({ state: EditorState.create({ doc, selection: { anchor: cursor } }), parent: document.body });
    const completion = toCompletion(s, () => {});
    const apply = completion.apply!;
    if (typeof apply === 'string') view.dispatch({ changes: { from: cursor, to: cursor, insert: apply } });
    else apply(view, completion, cursor, cursor);
    const text = view.state.doc.toString();
    view.destroy();
    return text;
}

describe('toCompletion consume', () => {
    test('replaces the auto-closed ] after ![ (plain and snippet inserts)', () => {
        expect(accept({ after: '![', label: 'photo.png', insert: 'photo](photo.png)', consume: ']' })).toBe('![photo](photo.png)');
        expect(accept({ after: '![', label: 'photo.png', insert: '${1:photo}](photo.png)', consume: ']' })).toBe('![photo](photo.png)');
    });

    test('leaves the text alone when what follows is not the consume text', () => {
        expect(accept({ after: '![', label: 'photo.png', insert: 'photo](photo.png)', consume: ']' }, '![ x', 2)).toBe('![photo](photo.png) x');
    });

    test('without consume, the ] stays (as before)', () => {
        expect(accept({ after: '![', label: 'photo.png', insert: 'photo](photo.png)' })).toBe('![photo](photo.png)]');
    });
});
