import { FindNextUntil } from '../../src/_Utils/FindUntil';

function createTestDOM() {
    document.body.innerHTML = `
        <section>
            <h1>Chapter 1</h1>
            <h2>Section 1.1</h2>
            <h3>Section 1.1.1</h3>
            <h2>Section 1.2</h2>
        </section>
        <section>
            <h1>Chapter 2</h1>
            <h2>Section 2.1</h2>
            <h2>Section 2.2</h2>
        </section>
        <section>
            <h1>Chapter 3</h1>
        </section>
    `;
}

describe('FindNextUntil', () => {
    beforeEach(() => {
        createTestDOM();
    });

    test('should find h2 headings after h1 until next h1', () => {
        const h1 = document.querySelector('h1');
        const h2s = FindNextUntil(h1 as HTMLElement, 'h2', 'h1');
        const titles = h2s.map(h => h.textContent.trim());
        expect(titles).toEqual(['Section 1.1', 'Section 1.2']);
    });

    test('should stop at next h1', () => {
        const h1s = document.querySelectorAll('h1');
        const h2s = FindNextUntil(h1s[1] as HTMLElement, 'h2', 'h1');
        const titles = h2s.map(h => h.textContent.trim());
        expect(titles).toEqual(['Section 2.1', 'Section 2.2']);
    });
});
