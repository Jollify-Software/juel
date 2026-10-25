import { tipText } from '../../src/_Modules/Tips/TipsModule';

describe('tipText', () => {
    it('takes a trailing shortcut out of the text into key caps', () => {
        expect(tipText('Undo the last change (Ctrl+Z)')).toEqual({ text: 'Undo the last change', keys: ['Ctrl', 'Z'] });
        expect(tipText('Save a copy (Ctrl + Shift + S)')).toEqual({ text: 'Save a copy', keys: ['Ctrl', 'Shift', 'S'] });
        expect(tipText('Help (F1)')).toEqual({ text: 'Help', keys: ['F1'] });
    });

    it('leaves ordinary brackets in the text', () => {
        expect(tipText('Insert a shape (a box or a circle)')).toEqual({ text: 'Insert a shape (a box or a circle)', keys: [] });
        expect(tipText('Plain words')).toEqual({ text: 'Plain words', keys: [] });
    });

    it('prefers data-shortcut, and then keeps the text whole', () => {
        expect(tipText('Undo (Ctrl+Z)', 'Ctrl+Y')).toEqual({ text: 'Undo (Ctrl+Z)', keys: ['Ctrl', 'Y'] });
        expect(tipText('Save a copy', 'Ctrl+Shift+S').keys).toEqual(['Ctrl', 'Shift', 'S']);
    });
});
