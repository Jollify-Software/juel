// <juel-quiz> in Chrome, on its example page (examples/Quiz/quiz.html).
import { expect, Page, test } from '@playwright/test';

const quiz = (page: Page, id: string) => page.locator(`#${id}`);
const item = (page: Page, id: string, text: string) => quiz(page, id).locator('.item', { hasText: text });
const dialog = (page: Page, id: string) => quiz(page, id).locator('juel-modal dialog');

let errors: string[];

test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('examples/Quiz/quiz.html');
    await page.waitForFunction(() => (window as any).exampleReady);
});

test.afterEach(() => {
    expect(errors).toEqual([]);
});

test('one answer: radios, shuffled the same way every load', async ({ page }) => {
    await expect(quiz(page, 'one').locator('input[type=radio]')).toHaveCount(4);
    const order = await quiz(page, 'one').locator('.item').allTextContents();
    await page.reload();
    await page.waitForFunction(() => (window as any).exampleReady);
    expect(await quiz(page, 'one').locator('.item').allTextContents()).toEqual(order);
    // Yes/no keeps its order.
    await expect(quiz(page, 'yesno').locator('.item .text')).toHaveText(['Yes', 'No']);
});

test('a wrong choice: the dialog says so, names the answer, explains; OK closes', async ({ page }) => {
    await expect(quiz(page, 'one').locator('juel-button.check button')).toBeDisabled();
    await item(page, 'one', 'Mars').click();
    await quiz(page, 'one').locator('juel-button.check').click();
    await expect(dialog(page, 'one')).toBeVisible();
    await expect(quiz(page, 'one').locator('.verdict')).toHaveText('Not quite.');
    await expect(quiz(page, 'one').locator('.key')).toHaveText('The answer: Jupiter');
    await expect(quiz(page, 'one').locator('.explanation')).toContainText('twice the mass');
    await quiz(page, 'one').locator('juel-button.ok').click();
    await expect(dialog(page, 'one')).toBeHidden();
    await expect(item(page, 'one', 'Mars')).toHaveClass(/wrong/);
});

test('the dialog words come from attributes (answer-label, ok-label)', async ({ page }) => {
    await quiz(page, 'one').evaluate(el => { el.setAttribute('answer-label', 'Die Antwort'); el.setAttribute('ok-label', 'Gut'); });
    await item(page, 'one', 'Mars').click();
    await quiz(page, 'one').locator('juel-button.check').click();
    await expect(dialog(page, 'one')).toBeVisible();
    await expect(quiz(page, 'one').locator('.key')).toHaveText('Die Antwort: Jupiter');
    await expect(quiz(page, 'one').locator('juel-button.ok button')).toHaveText('Gut');
});

test('a right choice, by keyboard only; Reset clears it', async ({ page }) => {
    await item(page, 'one', 'Jupiter').locator('input').focus();
    await page.keyboard.press('Space');
    await expect(item(page, 'one', 'Jupiter').locator('input')).toBeChecked();
    await page.keyboard.press('Tab'); // to Check
    await page.keyboard.press('Enter');
    await expect(dialog(page, 'one')).toBeVisible();
    await expect(quiz(page, 'one').locator('.verdict')).toHaveText('Right!');
    await page.keyboard.press('Escape');
    await expect(dialog(page, 'one')).toBeHidden();
    await expect(item(page, 'one', 'Jupiter')).toHaveClass(/right/);
    await quiz(page, 'one').locator('juel-button.reset').click();
    await expect(quiz(page, 'one').locator('input:checked')).toHaveCount(0);
    await expect(quiz(page, 'one').locator('.item.right, .item.wrong')).toHaveCount(0);
});

test('Escape closes the dialog and counts as handled (a host leaves it alone)', async ({ page }) => {
    // Hosts such as the Jollify Player act on an Escape nobody preventDefault()ed.
    await page.evaluate(() => {
        (window as any).unhandled = 0;
        addEventListener('keydown', e => { if (e.key === 'Escape') setTimeout(() => { if (!e.defaultPrevented) (window as any).unhandled++; }); }, true);
    });
    await page.keyboard.press('Escape'); // control: nothing open, so unhandled
    await expect.poll(() => page.evaluate(() => (window as any).unhandled)).toBe(1);
    await item(page, 'one', 'Mars').click();
    await quiz(page, 'one').locator('juel-button.check').click();
    await expect(dialog(page, 'one')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page, 'one')).toBeHidden();
    await page.waitForTimeout(50);
    expect(await page.evaluate(() => (window as any).unhandled)).toBe(1);
});

test('several answers: checkboxes; only all of them is right', async ({ page }) => {
    await expect(quiz(page, 'several').locator('input[type=checkbox]')).toHaveCount(4);
    await item(page, 'several', 'Whale').click();
    await quiz(page, 'several').locator('juel-button.check').click();
    await expect(quiz(page, 'several').locator('.verdict')).toHaveText('Not quite.');
    await quiz(page, 'several').locator('juel-button.ok').click();
    await item(page, 'several', 'Bat').click();
    await quiz(page, 'several').locator('juel-button.check').click();
    await expect(quiz(page, 'several').locator('.verdict')).toHaveText('Right!');
});

test('state: messages, quiz-change, and setting it back', async ({ page }) => {
    const result = await page.evaluate(() => {
        const q = document.getElementById('one') as any;
        const seen: string[] = [];
        q.addEventListener('quiz-change', (e: CustomEvent) => seen.push(e.detail.message.type));
        q.apply({ type: 'quiz-select', index: 1, on: true });
        const saved = JSON.parse(JSON.stringify(q.state));
        q.reset();
        q.state = saved;
        return { seen, saved, after: q.state, correct: q.correct };
    });
    expect(result.seen).toEqual(['quiz-select', 'quiz-reset']);
    expect(result.saved).toEqual({ type: 'choice', selected: [1], checked: false, revealed: false });
    expect(result.after).toEqual(result.saved);
    expect(result.correct).toBe(true);
    await expect(item(page, 'one', 'Jupiter').locator('input')).toBeChecked();
});

test('show-answers marks the key and hides the buttons', async ({ page }) => {
    await expect(item(page, 'key', 'Jupiter')).toHaveClass(/right/);
    await expect(quiz(page, 'key').locator('.item.right')).toHaveCount(1);
    await expect(quiz(page, 'key').locator('.actions')).toBeHidden();
});

// Sort: drag a chip (by its text) onto a group (by its name), with the mouse.
async function dragTo(page: Page, id: string, text: string, group: string | null) {
    await quiz(page, id).evaluate(q => q.scrollIntoView({ block: 'start' })); // drop targets are hit-tested on screen
    const from = await quiz(page, id).locator('.chip', { hasText: text }).boundingBox();
    const target = group === null ? quiz(page, id).locator('.pool')
        : quiz(page, id).locator('.group', { hasText: group }).or(quiz(page, id).locator('.left', { hasText: group }).locator('+ .slot'));
    const to = await target.boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(to!.x + 10, to!.y + to!.height - 10, { steps: 5 });
    await page.mouse.up();
}

test('sort: drag with the mouse, Check marks green and red, Try again', async ({ page }) => {
    await expect(quiz(page, 'sort').locator('.pool .chip')).toHaveCount(7);
    await expect(quiz(page, 'sort').locator('juel-button.check button')).toBeDisabled();
    await dragTo(page, 'sort', 'Whale', 'Mammal');
    await dragTo(page, 'sort', 'Eagle', 'Reptile');
    await expect(quiz(page, 'sort').locator('.group', { hasText: 'Mammal' }).locator('.chip .text')).toHaveText(['Whale']);
    await expect(quiz(page, 'sort').locator('.pool .chip')).toHaveCount(5);
    await quiz(page, 'sort').locator('juel-button.check').click();
    await expect(quiz(page, 'sort').locator('.chip', { hasText: 'Whale' })).toHaveClass(/right/);
    await expect(quiz(page, 'sort').locator('.chip', { hasText: 'Eagle' })).toHaveClass(/wrong/);
    await expect(quiz(page, 'sort').locator('.verdict')).toHaveText('Not quite.');
    // Dragging back to the pool works too, and clears the marks.
    await dragTo(page, 'sort', 'Eagle', null);
    await expect(quiz(page, 'sort').locator('.chip.wrong')).toHaveCount(0);
    await quiz(page, 'sort').locator('juel-button.reset').click();
    await expect(quiz(page, 'sort').locator('.pool .chip')).toHaveCount(7);
});

test('sort: drag by touch (pointerType touch)', async ({ page }) => {
    const moved = await page.evaluate(async () => {
        const q = document.getElementById('sort') as any;
        const root = q.shadowRoot as ShadowRoot;
        q.scrollIntoView({ block: 'start' });
        const chip = [...root.querySelectorAll('.chip')].find(c => c.textContent!.includes('Snake')) as HTMLElement;
        const group = [...root.querySelectorAll('.group')].find(g => g.textContent!.includes('Reptile')) as HTMLElement;
        const a = chip.getBoundingClientRect(), b = group.getBoundingClientRect();
        const ev = (type: string, x: number, y: number) => new PointerEvent(type, {
            pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, composed: true });
        chip.dispatchEvent(ev('pointerdown', a.x + 5, a.y + 5));
        chip.dispatchEvent(ev('pointermove', b.x + 10, b.y + b.height / 2));
        chip.dispatchEvent(ev('pointerup', b.x + 10, b.y + b.height - 5));
        await q.updateComplete;
        return q.state.placed;
    });
    expect(moved[3]).toBe(1); // Snake (source index 3) is in Reptile (group 1)
});

test('sort: Show the answer places everything right; show-answers does too', async ({ page }) => {
    await quiz(page, 'sort').locator('juel-button.show').click();
    // The chips slide to their groups (FLIP, Web Animations).
    const sliding = await page.evaluate(() =>
        [...(document.getElementById('sort') as any).shadowRoot.querySelectorAll('.chip')].filter((c: Element) => c.getAnimations().length).length);
    expect(sliding).toBeGreaterThan(0);
    await expect(quiz(page, 'sort').locator('.pool .chip')).toHaveCount(0);
    await expect(quiz(page, 'sort').locator('.chip.right')).toHaveCount(7);
    await expect(quiz(page, 'sort').locator('.group', { hasText: 'Bird' }).locator('.chip')).toHaveCount(2);
    await expect(quiz(page, 'sort').locator('.explanation')).toContainText('penguins');
    const state = await page.evaluate(() => (document.getElementById('sort') as any).state);
    expect(state).toEqual({ type: 'sort', selected: [], checked: false, revealed: true, placed: [0, 0, 0, 1, 1, 2, 2] });
    await expect(quiz(page, 'sort-key').locator('.group', { hasText: 'Even' }).locator('.chip .text')).toHaveText(['2', '4']);
    await expect(quiz(page, 'sort-key').locator('.actions')).toBeHidden();
});

test('match: one partner per slot, Check, Show the answer', async ({ page }) => {
    const slot = (left: string) => quiz(page, 'match').locator('.left', { hasText: left }).locator('+ .slot');
    await dragTo(page, 'match', 'Waterloo', '1066');
    await expect(slot('1066').locator('.chip .text')).toHaveText(['The Battle of Waterloo']);
    // A second partner into the same slot sends the first back to the pool.
    await dragTo(page, 'match', 'Hastings', '1066');
    await expect(slot('1066').locator('.chip .text')).toHaveText(['The Battle of Hastings']);
    await expect(quiz(page, 'match').locator('.pool .chip')).toHaveCount(2);
    await dragTo(page, 'match', 'Moon', '1815');
    await quiz(page, 'match').locator('juel-button.check').click();
    await expect(slot('1066').locator('.chip')).toHaveClass(/right/);
    await expect(slot('1815').locator('.chip')).toHaveClass(/wrong/);
    await quiz(page, 'match').locator('juel-button.show').click();
    await expect(slot('1969').locator('.chip .text')).toHaveText(['The Moon landing']);
    await expect(quiz(page, 'match').locator('.chip.right')).toHaveCount(3);
    expect(await page.evaluate(() => (document.getElementById('match') as any).state.placed)).toEqual([2, 0, 1]); // per partner: Moon → 1969, Hastings → 1066, Waterloo → 1815
});

test('sort by keyboard only: Ctrl+arrows pick, arrows move', async ({ page }) => {
    await quiz(page, 'sort').evaluate(q => q.scrollIntoView());
    await quiz(page, 'sort').locator('.chip[tabindex="0"]').focus();
    await expect(quiz(page, 'sort').locator('.chip[tabindex="0"]')).toHaveCount(1);
    const first = await quiz(page, 'sort').locator('.chip[tabindex="0"] .text').textContent();
    await page.keyboard.press('Control+ArrowRight');
    const second = await quiz(page, 'sort').locator('.chip:focus .text').textContent();
    expect(second).not.toBe(first);
    await page.keyboard.press('ArrowRight'); // pool → group 0 (Mammal)
    await expect(quiz(page, 'sort').locator('.announce')).toHaveText(`${second!.trim()}: Mammal`);
    await expect(quiz(page, 'sort').locator('.group', { hasText: 'Mammal' }).locator('.chip .text')).toHaveText([second!]);
    await page.keyboard.press('ArrowRight'); // → Reptile, and it keeps focus
    await expect(quiz(page, 'sort').locator('.group', { hasText: 'Reptile' }).locator('.chip:focus .text')).toHaveText([second!]);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft'); // back to the pool
    await expect(quiz(page, 'sort').locator('.pool .chip')).toHaveCount(7);
    // Grid-like: the groups run across, the pool sits above them.
    await page.keyboard.press('ArrowDown'); // pool → the first group
    await expect(quiz(page, 'sort').locator('.group', { hasText: 'Mammal' }).locator('.chip:focus .text')).toHaveText([second!]);
    await page.keyboard.press('ArrowDown'); // already in a group: stays
    await expect(quiz(page, 'sort').locator('.group', { hasText: 'Mammal' }).locator('.chip .text')).toHaveText([second!]);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp'); // Reptile → straight back to the pool
    await expect(quiz(page, 'sort').locator('.pool .chip')).toHaveCount(7);
    await expect(quiz(page, 'sort').locator('.chip:focus .text')).toHaveText(second!);
});

test('match by keyboard only: the slots run down', async ({ page }) => {
    const slot = (left: string) => quiz(page, 'match').locator('.left', { hasText: left }).locator('+ .slot');
    await quiz(page, 'match').evaluate(q => q.scrollIntoView());
    await quiz(page, 'match').locator('.chip[tabindex="0"]').focus();
    const picked = (await quiz(page, 'match').locator('.chip:focus .text').textContent())!.trim();
    await page.keyboard.press('ArrowRight'); // pool → the first slot
    await expect(slot('1066').locator('.chip:focus .text')).toHaveText([picked]);
    await page.keyboard.press('ArrowRight'); // already in a slot: stays
    await page.keyboard.press('ArrowDown'); // → the next slot
    await expect(slot('1815').locator('.chip:focus .text')).toHaveText([picked]);
    await expect(quiz(page, 'match').locator('.announce')).toHaveText(`${picked}: 1815`);
    await page.keyboard.press('ArrowLeft'); // back to the pool
    await expect(quiz(page, 'match').locator('.pool .chip')).toHaveCount(3);
});

test('match: two partners written the same count as right in either slot', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const q = document.createElement('juel-quiz') as any;
        q.setAttribute('type', 'match');
        q.dataset.answer = '0,1,2';
        q.innerHTML = '<p>Which are mammals?</p><ul><li>Dog</li><li>Whale</li><li>Robin</li></ul>'
            + '<ul data-partners><li>mammal</li><li>mammal</li><li>bird</li></ul>';
        document.body.append(q);
        await q.updateComplete;
        q.move(1, 0); q.move(0, 1); q.move(2, 2); // the two "mammal"s swapped
        q.check();
        await q.updateComplete;
        const swapped = { correct: q.correct, wrong: q.shadowRoot.querySelectorAll('.chip.wrong').length };
        q.move(2, 0); q.move(1, 2); // "bird" beside Dog: really wrong
        q.check();
        await q.updateComplete;
        return { swapped, bad: { correct: q.correct, wrong: q.shadowRoot.querySelectorAll('.chip.wrong').length } };
    });
    expect(result.swapped).toEqual({ correct: true, wrong: 0 });
    expect(result.bad).toEqual({ correct: false, wrong: 2 });
});

test('sort: one item written into two groups counts as right either way round', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const q = document.createElement('juel-quiz') as any;
        q.setAttribute('type', 'sort');
        q.dataset.answer = '0,1,0';
        q.innerHTML = '<p>Sort them.</p><ol data-groups><li>Flies</li><li>Swims</li></ol>'
            + '<ul><li>duck</li><li>duck</li><li>bee</li></ul>';
        document.body.append(q);
        await q.updateComplete;
        q.move(0, 1); q.move(1, 0); q.move(2, 0); // the two ducks swapped
        q.check();
        const swapped = q.correct;
        q.move(0, 0); // both ducks fly: Swims has none
        q.check();
        return { swapped, bothFly: q.correct };
    });
    expect(result).toEqual({ swapped: true, bothFly: false });
});

test('borders follow the text colour, so they show on a dark page', async ({ page }) => {
    const borders = await page.evaluate(async () => {
        const q = document.createElement('juel-quiz') as any;
        q.setAttribute('type', 'match');
        q.dataset.answer = '0';
        q.style.color = 'rgb(255, 255, 255)';
        q.innerHTML = '<p>Match.</p><ul><li>1066</li></ul><ul data-partners><li>Hastings</li></ul>';
        document.body.append(q);
        await q.updateComplete;
        const colour = (sel: string) => getComputedStyle(q.shadowRoot.querySelector(sel)).borderTopColor;
        return { pool: colour('.pool'), slot: colour('.slot') };
    });
    // White text, faded: not the black a fixed default would give.
    expect(borders.pool).toBe('color(srgb 1 1 1 / 0.2)');
    expect(borders.slot).toBe('color(srgb 1 1 1 / 0.2)');
});
