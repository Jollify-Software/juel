import { readFileSync } from 'node:fs';
import path from 'node:path';
import { IconChoices, filterIconChoices } from '../../src/_Modules/Icons/IconChoices';

// Lucide.ts inlines data URLs through Parcel, which Jest can't load: read its table as text.
const table = readFileSync(path.join(__dirname, '../../src/_Modules/Icons/Lucide.ts'), 'utf8');
const bundled = new Set([...table.matchAll(/^\s*'([a-z0-9-]+)':\s*\w+,?\s*$/gm)].map(m => m[1]));

describe('IconChoices', () => {
    test('every choice is bundled, so it draws', () => {
        expect(bundled.size).toBeGreaterThan(50);
        const missing = IconChoices.map(i => i.glyph.replace(/^lucide-/, '')).filter(name => !bundled.has(name));
        expect(missing).toEqual([]);
    });

    test('no glyph or label is offered twice', () => {
        expect(new Set(IconChoices.map(i => i.glyph)).size).toBe(IconChoices.length);
        expect(new Set(IconChoices.map(i => i.label)).size).toBe(IconChoices.length);
    });
});

describe('filterIconChoices', () => {
    const labels = (search: string) => filterIconChoices(IconChoices, search).map(i => i.label);

    test('nothing typed: all of them', () => {
        expect(labels('  ')).toHaveLength(IconChoices.length);
    });

    test('by its name, the other words people use, and the glyph\'s own name', () => {
        expect(labels('rocket')).toEqual(['Rocket']);
        expect(labels('van')).toEqual(['Delivery']);
        expect(labels('truck')).toEqual(['Delivery']);
        expect(labels('STAFF')).toEqual(['Person', 'Team']);
    });

    test('every word must match', () => {
        expect(labels('money finance')).toEqual(['Money', 'Pounds']);
        expect(labels('money rocket')).toEqual([]);
    });
});
