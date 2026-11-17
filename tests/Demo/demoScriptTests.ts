// The demo script's pure half (src/_Modules/Demo/DemoScript.ts): steps
// normalised, mistakes caught, keys parsed, timing and the hand's arc.
import { actionOf, arcPoint, ease, glideTime, itemMatches, menuPath, parseKeys, readingTime, toDemoStep, toDemoSteps } from '../../src/_Modules/Demo/DemoScript';

describe('steps', () => {
    test('one action key each; a step with only say is a caption', () => {
        expect(actionOf({ click: '.a' })).toBe('click');
        expect(actionOf({ say: 'Hello' })).toBe('say');
        expect(actionOf({ click: '.a', say: 'Click it' })).toBe('click');
        expect(() => actionOf({ click: '.a', point: '.b' } as never)).toThrow(/two actions/);
        expect(() => actionOf({} as never)).toThrow(/no action/);
    });

    test('normalised with defaults', () => {
        const s = toDemoStep({ drag: '.box', to: { dx: 10, dy: -20 } });
        expect(s).toMatchObject({ action: 'drag', target: '.box', to: { dx: 10, dy: -20 }, at: { x: 0.5, y: 0.5 }, toAt: { x: 0.5, y: 0.5 }, moves: 24 });
        expect(toDemoStep({ type: 'Hi', into: 'input' })).toMatchObject({ action: 'type', text: 'Hi', target: 'input' });
        expect(toDemoStep({ key: 'Ctrl+Z' }).keys).toMatchObject({ key: 'z', ctrlKey: true, code: 'KeyZ' });
        expect(toDemoStep({ choose: '.menu', item: 'Fade ▸ Fade in' }).item).toEqual(['Fade', 'Fade in']);
    });

    test('mistakes say which step', () => {
        expect(() => toDemoSteps([{ say: 'ok' }, { choose: '.m', item: [] }])).toThrow(/Step 2: choose needs an item/);
        expect(() => toDemoSteps({ steps: [{ drag: '.a' } as never] })).toThrow(/Step 1: drag needs a "to"/);
    });
});

describe('menus', () => {
    test('a path from a string or a list, ▸ dropped', () => {
        expect(menuPath(['Fade ▸', 'Fade in'])).toEqual(['Fade', 'Fade in']);
        expect(menuPath('Letters')).toEqual(['Letters']);
    });

    test('an item matches its label, ignoring case, spaces, ✓ and …', () => {
        expect(itemMatches('letters', '✓ Letters')).toBe(true);
        expect(itemMatches('Choose with a preview', 'Choose with a preview…')).toBe(true);
        expect(itemMatches('Fade', 'Fade ▸')).toBe(true);
        expect(itemMatches('Fade', 'Fade in')).toBe(false);
        expect(itemMatches('x', null)).toBe(false);
    });
});

describe('keys', () => {
    test('names, modifiers and caps', () => {
        expect(parseKeys('Enter')).toMatchObject({ key: 'Enter', code: 'Enter', caps: ['Enter'] });
        expect(parseKeys('Shift+ArrowDown')).toMatchObject({ key: 'ArrowDown', shiftKey: true, caps: ['Shift', '↓'] });
        expect(parseKeys('esc')).toMatchObject({ key: 'Escape', caps: ['Esc'] });
        expect(parseKeys('Space')).toMatchObject({ key: ' ', code: 'Space', caps: ['Space'] });
        expect(parseKeys('?')).toMatchObject({ key: '?', caps: ['?'] });
        expect(parseKeys('+')).toMatchObject({ key: '+' });
        expect(parseKeys('Ctrl++')).toMatchObject({ key: '+', ctrlKey: true });
        expect(() => parseKeys('Ctrl+Shift')).toThrow(/no key/);
        expect(() => parseKeys('A+B')).toThrow(/two keys/);
    });
});

describe('timing and the arc', () => {
    test('reading time grows with the words, within 1.4–6 s', () => {
        expect(readingTime('')).toBe(1400);
        expect(readingTime('one two three four five six')).toBeGreaterThan(readingTime('one two'));
        expect(readingTime('word '.repeat(100))).toBe(6000);
    });

    test('glides take longer for longer moves, within 250–900 ms', () => {
        expect(glideTime(0)).toBe(250);
        expect(glideTime(400)).toBe(600);
        expect(glideTime(5000)).toBe(900);
    });

    test('easing runs 0 → 1, slow at both ends', () => {
        expect(ease(0)).toBe(0);
        expect(ease(1)).toBe(1);
        expect(ease(0.5)).toBeCloseTo(0.5);
        expect(ease(0.1)).toBeLessThan(0.1);
    });

    test('the arc starts and ends on the points and bows to one side', () => {
        const a = { x: 0, y: 0 }, b = { x: 100, y: 0 };
        expect(arcPoint(a, b, 0)).toEqual(a);
        expect(arcPoint(a, b, 1)).toEqual(b);
        const mid = arcPoint(a, b, 0.5);
        expect(mid.x).toBeCloseTo(50);
        expect(Math.abs(mid.y)).toBeGreaterThan(1);
    });
});
