import { tipText, TipsModule } from '../../src/_Modules/Tips/TipsModule';

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

describe('TipsModule inside a shadow root', () => {
    // A pointerover between two nodes of one shadow tree stops at that shadow root (the DOM's
    // relatedTarget rule), so a listener on the document alone never sees the second hover.
    const hover = (to: Element, from: Element) => {
        from.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, composed: true, relatedTarget: to }));
        to.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, composed: true, relatedTarget: from }));
    };

    afterEach(() => {
        TipsModule.disable();
        document.body.innerHTML = '';
    });

    it('follows the pointer from one titled node to another in the same shadow root', () => {
        const host = document.createElement('div');
        document.body.append(host);
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<span id="a" title="First"></span><span id="b" title="Second"></span>';
        const a = root.getElementById('a')!, b = root.getElementById('b')!;
        TipsModule.enable();
        hover(a, document.body);
        expect(TipsModule.target()).toBe(a);
        hover(b, a);
        expect(TipsModule.target()).toBe(b);
        // a got its title back; b's is off while its tip is due.
        expect(a.getAttribute('title')).toBe('First');
        expect(b.getAttribute('title')).toBeNull();
        // Leaving b for a plain node in the same root hides it.
        const plain = document.createElement('i');
        root.append(plain);
        hover(plain, b);
        expect(TipsModule.target()).toBeNull();
        expect(b.getAttribute('title')).toBe('Second');
    });

    it('stops listening at a shadow root once disabled', () => {
        const host = document.createElement('div');
        document.body.append(host);
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<span id="a" title="First"></span><span id="b" title="Second"></span>';
        const a = root.getElementById('a')!, b = root.getElementById('b')!;
        TipsModule.enable();
        hover(a, document.body);
        TipsModule.disable();
        hover(b, a);
        expect(TipsModule.target()).toBeNull();
        expect(b.getAttribute('title')).toBe('Second');
    });
});
