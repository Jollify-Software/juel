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
    // OK has the focus, without an autofocus attribute (a console error in a cross-origin frame).
    await expect(quiz(page, 'one').locator('juel-button.ok button')).toBeFocused();
    expect(await quiz(page, 'one').locator('[autofocus]').count()).toBe(0);
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

test('show-answers marks the key, shows the explanation and hides the buttons', async ({ page }) => {
    await expect(item(page, 'key', 'Jupiter')).toHaveClass(/right/);
    await expect(quiz(page, 'key').locator('.item.right')).toHaveCount(1);
    await expect(quiz(page, 'key').locator('.actions')).toBeHidden();
    await expect(quiz(page, 'key').locator(':scope > .explanation, .items + .explanation')).toContainText('twice the mass');
    // Without show-answers a choice quiz keeps its explanation for the dialog.
    await expect(quiz(page, 'one').locator('.items + .explanation')).toHaveCount(0);
});

test('Escape lets go of the focus (no dialog open), so the host gets its keys back', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).unhandled = 0;
        addEventListener('keydown', e => { if (e.key === 'Escape') setTimeout(() => { if (!e.defaultPrevented) (window as any).unhandled++; }); }, true);
    });
    await item(page, 'one', 'Mars').click();
    const inside = () => page.evaluate(() => document.activeElement?.id === 'one');
    expect(await inside()).toBe(true);
    await page.keyboard.press('Escape');
    expect(await inside()).toBe(false);
    await page.waitForTimeout(50);
    expect(await page.evaluate(() => (window as any).unhandled)).toBe(0);
    // Sort: a focused chip lets go too.
    await quiz(page, 'sort').locator('.chip').first().focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('sort');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('sort');
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

test('sort: with prefers-reduced-motion, Show the answer places everything without sliding', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await quiz(page, 'sort').locator('juel-button.show').click();
    // The same check as above finds sliding chips without the preference.
    const sliding = await page.evaluate(() =>
        [...(document.getElementById('sort') as any).shadowRoot.querySelectorAll('.chip')].filter((c: Element) => c.getAnimations().length).length);
    expect(sliding).toBe(0);
    await expect(quiz(page, 'sort').locator('.pool .chip')).toHaveCount(0);
    await expect(quiz(page, 'sort').locator('.chip.right')).toHaveCount(7);
});

test('sort groups and match slots are named groups, so a screen reader says where a chip is', async ({ page }) => {
    await quiz(page, 'sort').locator('juel-button.show').click();
    await expect(quiz(page, 'sort').getByRole('group', { name: 'Bird' }).getByRole('button')).toHaveCount(2);
    await quiz(page, 'data-match').locator('juel-button.show').click();
    await expect(quiz(page, 'data-match').getByRole('group', { name: 'Paris' }).getByRole('button', { name: 'France' })).toHaveCount(1);
});

/** The focused element, through the shadow roots: the quiz's id, then the control (a button's text, or input/chip). */
const focused = (page: Page) => page.evaluate(() => {
    let el = document.activeElement as HTMLElement | null;
    const quizId = el?.closest('juel-quiz')?.id ?? el?.id ?? '';
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement as HTMLElement;
    const what = el?.tagName === 'INPUT' ? (el as HTMLInputElement).type
        : el?.classList.contains('chip') ? 'chip'
        : el?.textContent?.trim() ?? '';
    return `${quizId} ${what}`;
});

const tabFrom = async (page: Page, id: string, presses: number) => {
    await quiz(page, id).evaluate(q => {
        const b = document.createElement('button');
        b.textContent = 'before';
        q.before(b);
        b.focus();
    });
    const seen: string[] = [];
    for (let i = 0; i < presses; i++) {
        await page.keyboard.press('Tab');
        seen.push(await focused(page));
    }
    return seen;
};

test('focus order: the choices (one stop for radios), then the buttons; Check once there is a choice', async ({ page }) => {
    expect(await tabFrom(page, 'one', 2)).toEqual(['one radio', 'one Reset']); // Check is disabled: nothing chosen
    expect(await tabFrom(page, 'several', 5)).toEqual(['several checkbox', 'several checkbox', 'several checkbox', 'several checkbox', 'several Reset']);
    await item(page, 'one', 'Jupiter').locator('input').check();
    expect(await tabFrom(page, 'one', 3)).toEqual(['one radio', 'one Check', 'one Reset']);
});

test('focus order: sort and match are one stop for the chips, then the buttons', async ({ page }) => {
    expect(await tabFrom(page, 'sort', 3)).toEqual(['sort chip', 'sort Show the answer', 'sort Try again']);
    expect(await tabFrom(page, 'data-match', 3)).toEqual(['data-match chip', 'data-match Show the answer', 'data-match Try again']);
    await dragTo(page, 'match', 'Waterloo', '1066');
    expect(await tabFrom(page, 'match', 4)).toEqual(['match chip', 'match Check', 'match Show the answer', 'match Try again']);
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

test('from data: a JSON island is a choice quiz, with its key and explanation', async ({ page }) => {
    await expect(quiz(page, 'data-choice').locator('input[type=radio]')).toHaveCount(3);
    await expect(quiz(page, 'data-choice').locator('.question')).toHaveText('Which gas do plants take in?');
    await expect(item(page, 'data-choice', 'Carbon dioxide').locator('em')).toHaveText('dioxide'); // texts are HTML
    expect(await page.evaluate(() => (document.getElementById('data-choice') as any).answer)).toEqual([1]);
    await item(page, 'data-choice', 'Helium').locator('input').check();
    await quiz(page, 'data-choice').locator('juel-button.check').click();
    await expect(dialog(page, 'data-choice')).toBeVisible();
    await expect(quiz(page, 'data-choice').locator('.verdict')).toHaveText('Not quite.');
    await expect(quiz(page, 'data-choice').locator('.key')).toHaveText('The answer: Carbon dioxide');
    await expect(quiz(page, 'data-choice').locator('.explanation')).toContainText('give out oxygen');
    await quiz(page, 'data-choice').locator('juel-button.ok').click();
    await expect(dialog(page, 'data-choice')).toBeHidden();
    await expect(item(page, 'data-choice', 'Helium')).toHaveClass(/wrong/);
    await quiz(page, 'data-choice').locator('juel-button.reset').click();
    expect(await page.evaluate(() => (document.getElementById('data-choice') as any).state))
        .toEqual({ type: 'choice', selected: [], checked: false, revealed: false });
});

test('from data: sort and match take their type from the data and play as markup does', async ({ page }) => {
    await expect(quiz(page, 'data-sort')).toHaveAttribute('type', 'sort');
    await expect(quiz(page, 'data-sort').locator('.pool .chip')).toHaveCount(4);
    await dragTo(page, 'data-sort', '3', 'Odd');
    await quiz(page, 'data-sort').locator('juel-button.check').click();
    await expect(quiz(page, 'data-sort').locator('.chip', { hasText: '3' })).toHaveClass(/right/);
    await quiz(page, 'data-sort').locator('juel-button.show').click();
    await expect(quiz(page, 'data-sort').locator('.chip.right')).toHaveCount(4);
    expect((await quiz(page, 'data-sort').locator('.group', { hasText: 'Even' }).locator('.chip .text').allTextContents()).sort()).toEqual(['2', '4']);
    expect(await quiz(page, 'data-sort').evaluate(q =>
        getComputedStyle(q.shadowRoot!.querySelector('.group')!).getPropertyValue('--group-colour').trim())).toBe('#ea580c');

    await expect(quiz(page, 'data-match')).toHaveAttribute('type', 'match');
    await dragTo(page, 'data-match', 'Italy', 'Paris');
    await quiz(page, 'data-match').locator('juel-button.check').click();
    await expect(quiz(page, 'data-match').locator('.chip', { hasText: 'Italy' })).toHaveClass(/wrong/);
    await quiz(page, 'data-match').locator('juel-button.show').click();
    await expect(quiz(page, 'data-match').locator('.chip.right')).toHaveCount(2);
    await expect(quiz(page, 'data-match').locator('.explanation')).toContainText('largest city');
});

test('from data: show-answers, and a bad island warns instead of throwing', async ({ page }) => {
    await quiz(page, 'data-choice').evaluate(q => q.setAttribute('show-answers', ''));
    await expect(item(page, 'data-choice', 'Carbon dioxide')).toHaveClass(/right/);
    await expect(quiz(page, 'data-choice').locator('.actions')).toBeHidden();
    const warnings: string[] = [];
    page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
    await page.reload();
    await page.waitForFunction(() => (window as any).exampleReady);
    await expect.poll(() => warnings.join('\n')).toContain('juel-quiz: a choice quiz needs "items"');
    await expect(quiz(page, 'data-bad').locator('.item')).toHaveCount(0);
});

test('from data: keyboard and a saved state work as they do with markup', async ({ page }) => {
    // Sort by keys: the first chip goes from the pool into the first group (Odd).
    await quiz(page, 'data-sort').evaluate(q => q.scrollIntoView());
    await quiz(page, 'data-sort').locator('.chip[tabindex="0"]').focus();
    const picked = (await quiz(page, 'data-sort').locator('.chip:focus .text').textContent())!.trim();
    await page.keyboard.press('ArrowRight');
    await expect(quiz(page, 'data-sort').locator('.group', { hasText: 'Odd' }).locator('.chip .text')).toHaveText([picked]);
    await expect(quiz(page, 'data-sort').locator('.announce')).toHaveText(`${picked}: Odd`);

    // Choice by keys: Space picks the focused radio.
    await quiz(page, 'data-choice').locator('input[type=radio]').first().focus();
    await page.keyboard.press('Space');
    await expect(quiz(page, 'data-choice').locator('input:checked')).toHaveCount(1);

    // Match: a state saved, cleared and set back puts the chips back where they were.
    const result = await page.evaluate(() => {
        const q = document.getElementById('data-match') as any;
        q.apply({ type: 'quiz-reveal' });
        const saved = JSON.parse(JSON.stringify(q.state));
        q.reset();
        const cleared = JSON.parse(JSON.stringify(q.state));
        q.state = saved;
        return { saved, cleared, after: q.state };
    });
    expect(result.saved.placed).toEqual([0, 1]);
    expect(result.cleared.placed).toEqual([null, null]);
    expect(result.after).toEqual(result.saved);
    await expect(quiz(page, 'data-match').locator('.chip.right')).toHaveCount(2);
});

test('from data: a type on the element that disagrees with the island warns, once', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
    const types = await page.evaluate(async () => {
        const make = (type: string, data: object) => {
            const q = document.createElement('juel-quiz') as any;
            q.setAttribute('type', type);
            const s = document.createElement('script');
            s.type = 'application/json';
            s.textContent = JSON.stringify(data);
            q.appendChild(s);
            document.body.appendChild(q);
            return q;
        };
        const match = { type: 'match', question: 'Q?', pairs: [['x', 'y'], ['p', 'q']] };
        const wrong = make('choice', match), right = make('match', match);
        await wrong.updateComplete; await right.updateComplete;
        wrong.requestUpdate(); await wrong.updateComplete; // a second update doesn't warn again
        return [wrong.type, right.type];
    });
    expect(types).toEqual(['choice', 'match']); // the element's type still wins (README)
    await expect.poll(() => warnings.filter(w => w.includes('juel-quiz: type=')).length).toBe(1);
    expect(warnings.find(w => w.includes('juel-quiz: type='))).toContain('type="choice" but the quiz data is a match quiz');
});

test('from data: the element\'s own data-answer wins over the key in the island', async ({ page }) => {
    const answers = await page.evaluate(async () => {
        const make = (attr: string) => {
            const q = document.createElement('juel-quiz');
            if (attr) q.setAttribute('data-answer', attr);
            const s = document.createElement('script');
            s.type = 'application/json';
            s.textContent = JSON.stringify({ question: 'Q?', items: [{ text: 'a' }, { text: 'b', right: true }] });
            q.appendChild(s);
            document.body.appendChild(q);
            return q as any;
        };
        const plain = make(''), own = make('0');
        await plain.updateComplete; await own.updateComplete;
        return { plain: plain.answer, own: own.answer };
    });
    expect(answers.plain).toEqual([1]);
    expect(answers.own).toEqual([0]);
});

test('from data: partners written the same in an island swap too, as in markup', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const q = document.createElement('juel-quiz') as any;
        const s = document.createElement('script');
        s.type = 'application/json';
        s.textContent = JSON.stringify({ type: 'match', question: 'Which are mammals?', pairs: [['Dog', 'mammal'], ['Whale', 'mammal'], ['Robin', 'bird']] });
        q.appendChild(s);
        document.body.append(q);
        await q.updateComplete;
        q.move(1, 0); q.move(0, 1); q.move(2, 2); // the two "mammal"s swapped
        q.check();
        const swapped = q.correct;
        q.move(2, 0); q.move(1, 2); // "bird" beside Dog: really wrong
        q.check();
        return { swapped, bad: q.correct };
    });
    expect(result).toEqual({ swapped: true, bad: false });
});

test('from data: several right items give checkboxes, and only all of them is right', async ({ page }) => {
    await page.evaluate(async () => {
        const q = document.createElement('juel-quiz') as any;
        q.id = 'zz-several';
        const s = document.createElement('script');
        s.type = 'application/json';
        s.textContent = JSON.stringify({ question: 'Which are mammals?', items: [{ text: 'Bat', right: true }, { text: 'Robin' }, { text: 'Whale', right: true }] });
        q.appendChild(s);
        document.body.append(q);
        await q.updateComplete;
    });
    await expect(quiz(page, 'zz-several').locator('input[type=checkbox]')).toHaveCount(3);
    await expect(quiz(page, 'zz-several').locator('input[type=radio]')).toHaveCount(0);
    await item(page, 'zz-several', 'Whale').click();
    await quiz(page, 'zz-several').locator('juel-button.check').click();
    await expect(quiz(page, 'zz-several').locator('.verdict')).toHaveText('Not quite.');
    await quiz(page, 'zz-several').locator('juel-button.ok').click();
    await item(page, 'zz-several', 'Bat').click();
    await quiz(page, 'zz-several').locator('juel-button.check').click();
    await expect(quiz(page, 'zz-several').locator('.verdict')).toHaveText('Right!');
});

test('from data: shuffled as the same quiz in markup is; seed and no-shuffle work', async ({ page }) => {
    const orders = await page.evaluate(async () => {
        const texts = ['Mars', 'Jupiter', 'Venus', 'Mercury', 'Saturn'];
        const make = async (island: boolean, attrs: Record<string, string> = {}) => {
            const q = document.createElement('juel-quiz') as any;
            for (const [k, v] of Object.entries(attrs)) q.setAttribute(k, v);
            if (island) {
                const s = document.createElement('script');
                s.type = 'application/json';
                s.textContent = JSON.stringify({ type: 'choice', question: 'Which planet is the largest?', items: texts.map(t => ({ text: t, right: t === 'Jupiter' })) });
                q.appendChild(s);
            } else {
                q.dataset.answer = '1';
                q.innerHTML = `<p>Which planet is the largest?</p><ul>${texts.map(t => `<li>${t}</li>`).join('')}</ul>`;
            }
            document.body.append(q);
            await q.updateComplete;
            const order = Array.from(q.shadowRoot.querySelectorAll('.item .text'), (el: Element) => el.textContent!.trim());
            q.remove();
            return order;
        };
        return {
            markup: await make(false), island: await make(true),
            markupSeed: await make(false, { seed: 'x' }), islandSeed: await make(true, { seed: 'x' }),
            islandPlain: await make(true, { 'no-shuffle': '' }),
            texts,
        };
    });
    expect(orders.island).toEqual(orders.markup);
    expect(orders.islandSeed).toEqual(orders.markupSeed);
    expect(orders.islandPlain).toEqual(orders.texts);
    expect(orders.island).not.toEqual(orders.texts); // the default really shuffles
    expect(orders.islandSeed).not.toEqual(orders.island); // and the seed changes it
});

test('from data: show-answers on sort and match places every chip, as with markup', async ({ page }) => {
    for (const id of ['data-sort', 'data-match']) {
        await expect(quiz(page, id).locator('.pool .chip')).not.toHaveCount(0);
        await quiz(page, id).evaluate(q => q.setAttribute('show-answers', ''));
        await expect(quiz(page, id).locator('.pool .chip')).toHaveCount(0);
        await expect(quiz(page, id).locator('.actions')).toBeHidden();
    }
    await expect(quiz(page, 'data-sort').locator('.chip.right')).toHaveCount(4);
    expect((await quiz(page, 'data-sort').locator('.group', { hasText: 'Odd' }).locator('.chip .text').allTextContents()).sort()).toEqual(['1', '3']);
    await expect(quiz(page, 'data-match').locator('.chip.right')).toHaveCount(2);
    await expect(quiz(page, 'data-match').locator('.pair', { hasText: 'Paris' }).locator('.chip .text')).toHaveText('France');
    await expect(quiz(page, 'data-match').locator('.explanation')).toContainText('largest city');
});

test('from data: the words come from attributes, as with markup', async ({ page }) => {
    await quiz(page, 'data-choice').evaluate(el => {
        el.setAttribute('check-label', 'Prüfen'); el.setAttribute('answer-label', 'Die Antwort'); el.setAttribute('ok-label', 'Gut');
    });
    await expect(quiz(page, 'data-choice').locator('juel-button.check button')).toHaveText('Prüfen');
    await item(page, 'data-choice', 'Helium').locator('input').check();
    await quiz(page, 'data-choice').locator('juel-button.check').click();
    await expect(dialog(page, 'data-choice')).toBeVisible();
    await expect(quiz(page, 'data-choice').locator('.key')).toHaveText('Die Antwort: Carbon dioxide');
    await expect(quiz(page, 'data-choice').locator('juel-button.ok button')).toHaveText('Gut');
});

test('print hides the buttons, for markup and island quizzes alike', async ({ page }) => {
    const ids = ['one', 'sort', 'data-choice', 'data-sort', 'data-match'];
    for (const id of ids) await expect(quiz(page, id).locator('.actions')).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    for (const id of ids) {
        await expect(quiz(page, id).locator('.actions')).toBeHidden();
        await expect(quiz(page, id).locator('.question')).toBeVisible();
    }
    await page.emulateMedia({ media: 'screen' });
    for (const id of ids) await expect(quiz(page, id).locator('.actions')).toBeVisible();
});

test('replacing a list, or an island\'s script, re-renders; editing inside one does not', async ({ page }) => {
    const r = await page.evaluate(async () => {
        const texts = (q: any) => Array.from(q.shadowRoot.querySelectorAll('.item')).map((e: any) => e.textContent.trim()).sort().join('|');
        const settle = async (q: any) => { await new Promise(r => setTimeout(r, 100)); await q.updateComplete; };
        const island = (items: string[]) => {
            const s = document.createElement('script');
            s.type = 'application/json';
            s.textContent = JSON.stringify({ question: 'Q?', items: items.map((text, i) => ({ text, right: i === 1 })) });
            return s;
        };
        const m = document.createElement('juel-quiz') as any;
        m.setAttribute('data-answer', '0');
        m.innerHTML = '<p>Q?</p><ul><li>a</li><li>b</li></ul>';
        document.body.appendChild(m);
        await settle(m);
        const markup = [texts(m)];
        m.querySelector('ul').append(Object.assign(document.createElement('li'), { textContent: 'c' }));
        await settle(m);
        markup.push(texts(m));
        m.querySelector('ul').replaceWith(Object.assign(document.createElement('ul'), { innerHTML: '<li>x</li><li>y</li>' }));
        await settle(m);
        markup.push(texts(m));
        const q = document.createElement('juel-quiz') as any;
        q.append(island(['a', 'b']));
        document.body.appendChild(q);
        await settle(q);
        const data = [texts(q)];
        q.querySelector('script').textContent = JSON.stringify({ question: 'Q?', items: [{ text: 'p', right: true }] });
        await settle(q);
        data.push(texts(q));
        q.querySelector('script').replaceWith(island(['u', 'v', 'w']));
        await settle(q);
        data.push(texts(q));
        return { markup, data, answer: q.answer };
    });
    expect(r.markup).toEqual(['a|b', 'a|b', 'x|y']);
    expect(r.data).toEqual(['a|b', 'a|b', 'u|v|w']);
    expect(r.answer).toEqual([1]);
});

test('state: junk from the network is dropped, never thrown or drawn off the board', async ({ page }) => {
    const r = await page.evaluate(async () => {
        const set = async (id: string, v: any) => {
            const q = document.getElementById(id) as any;
            q.state = v;
            await q.updateComplete;
            const root = q.shadowRoot;
            return { state: q.state, chips: root.querySelectorAll('.chip').length, ticked: root.querySelectorAll('input:checked').length };
        };
        return {
            notArray: await set('one', { selected: 5, checked: 'yes' }),
            junk: await set('one', { selected: [99, 'x', -1, 1.5, 2, 2] }),
            none: await set('one', null),
            placed: await set('sort', { placed: [99, 'x', -1, 1], revealed: 1 }),
            placedNotArray: await set('sort', { placed: 3 }),
            unsorted: { ...(await set('several', { selected: [2, 0] })), correct: (document.getElementById('several') as any).correct },
        };
    });
    expect(r.notArray.state).toMatchObject({ selected: [], checked: false });
    expect(r.junk.state.selected).toEqual([2]);
    expect(r.junk.ticked).toBe(1);
    expect(r.none.state).toMatchObject({ selected: [], checked: false, revealed: false });
    const count = r.placed.state.placed.length;
    expect(r.placed.state.placed).toEqual([null, null, null, 1, ...Array(count - 4).fill(null)]);
    expect(r.placed.state.revealed).toBe(false);
    expect(r.placed.chips).toBe(count); // every chip is in the pool or a group
    expect(r.placedNotArray.state.placed).toEqual(Array(count).fill(null));
    // Kept sorted, as reduce keeps it, so a restored [2, 0] is right for the key 0,2.
    expect(r.unsorted.state.selected).toEqual([0, 2]);
    expect(r.unsorted.correct).toBe(true);
});
