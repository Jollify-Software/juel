// juel-markdown-editor's opt-in writer look, on examples/Editors/MarkdownEditor/writer.html.
import { expect, Page, test } from '@playwright/test';

async function open(page: Page) {
    await page.goto('examples/Editors/MarkdownEditor/writer.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.locator('#writer .cm-line').first().waitFor();
}
// The computed style of the innermost element holding `text` in editor `id`.
const styleOf = (page: Page, id: string, text: string) => page.evaluate(([id, text]) => {
    const all = [...document.querySelectorAll(`#${id} .cm-content *`)] as HTMLElement[];
    const el = all.reverse().find(e => e.textContent!.includes(text))!;
    const cs = getComputedStyle(el);
    let underline = false;
    for (let e: HTMLElement | null = el; e && !e.classList.contains('cm-content'); e = e.parentElement)
        if (getComputedStyle(e).textDecorationLine.includes('underline')) underline = true;
    return { underline, weight: cs.fontWeight, family: cs.fontFamily };
}, [id, text]);

test('by default the heading is underlined, as before', async ({ page }) => {
    await open(page);
    expect((await styleOf(page, 'plain', 'A heading')).underline).toBe(true);
    // ...and so is the front matter's last line, read as a setext heading.
    expect((await styleOf(page, 'plain', 'theme: dark')).underline).toBe(true);
});

test('writer: headings bold, not underlined; front matter is not a heading', async ({ page }) => {
    await open(page);
    const h = await styleOf(page, 'writer', 'A heading');
    expect(h.underline).toBe(false);
    expect(Number(h.weight)).toBeGreaterThanOrEqual(700);
    const fm = await styleOf(page, 'writer', 'theme: dark');
    expect(fm.underline).toBe(false);
    expect(Number(fm.weight)).toBeLessThan(700);
    expect(fm.family).toMatch(/mono|Consolas/i);
});

test('prose: the text is proportional, code stays monospace', async ({ page }) => {
    await open(page);
    expect((await styleOf(page, 'writer', 'Some')).family).not.toMatch(/mono|Consolas/i);
    expect((await styleOf(page, 'writer', 'code')).family).toMatch(/mono|Consolas/i);
    expect((await styleOf(page, 'plain', 'Some')).family).toMatch(/mono|Consolas/i);
});

test('writer can be turned on and off after the editor is made', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { (document.getElementById('plain') as any).writer = true; });
    await expect.poll(async () => (await styleOf(page, 'plain', 'A heading')).underline).toBe(false);
    await page.evaluate(() => { (document.getElementById('plain') as any).writer = false; });
    await expect.poll(async () => (await styleOf(page, 'plain', 'A heading')).underline).toBe(true);
});

test('setDividers: a rule above each slide, its number in the gutter, following edits', async ({ page }) => {
    await open(page);
    const state = () => page.evaluate(() => {
        const ed = document.getElementById('divided')!;
        const lines = [...ed.querySelectorAll('.cm-line')] as HTMLElement[];
        return {
            ruled: lines.filter(l => l.classList.contains('cm-juel-divider')).map(l => l.textContent),
            labels: [...ed.querySelectorAll('.cm-juel-divider-gutter .cm-gutterElement')].map(g => g.textContent).filter(Boolean),
            plainGutter: !!document.querySelector('#plain .cm-juel-divider-gutter'),
        };
    });
    let s = await state();
    expect(s.ruled).toEqual(['# One', '# Two', '# Three']);
    expect(s.labels).toEqual(['1', '2', '3']);
    expect(s.plainGutter).toBe(false); // no gutter until setDividers is called
    // Typing above a divider moves it with its line.
    await page.evaluate(() => (document.getElementById('divided') as any).replaceRange(0, 0, 'Intro\n\n'));
    s = await state();
    expect(s.ruled).toEqual(['# One', '# Two', '# Three']);
    await page.evaluate(() => (document.getElementById('divided') as any).setDividers([{ offset: 0, label: 'A' }]));
    s = await state();
    expect(s.ruled).toEqual(['Intro']);
    expect(s.labels).toEqual(['A']);
});

test('front-matter-chip: the front matter folds into a named chip; it opens and expands', async ({ page }) => {
    await open(page);
    const chip = page.locator('#chip .cm-juel-fm-chip');
    await expect(chip).toHaveCount(1);
    await expect(chip.locator('.cm-juel-fm-name')).toHaveText('Deck settings');
    // Collapsed: the YAML isn't drawn, the rest of the text is.
    await expect(page.locator('#chip .cm-content')).not.toContainText('theme: dark');
    await expect(page.locator('#chip .cm-content')).toContainText('A heading');
    // The other editors have no chip.
    await expect(page.locator('#writer .cm-juel-fm-chip')).toHaveCount(0);
    // The name fires front-matter-open.
    await chip.locator('.cm-juel-fm-name').click();
    await expect(page.locator('#chip-log')).toHaveText('front-matter-open 1');
    // The chevron shows the YAML (with the chip still above it), and hides it again.
    await chip.locator('.cm-juel-fm-toggle').click();
    await expect(page.locator('#chip .cm-content')).toContainText('theme: dark');
    await expect(page.locator('#chip .cm-juel-fm-toggle')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#chip .cm-juel-fm-toggle').click();
    await expect(page.locator('#chip .cm-content')).not.toContainText('theme: dark');
    // The text itself is unchanged by all this.
    expect(await page.evaluate(() => (document.getElementById('chip') as any).content)).toContain('theme: dark\n---\n');
    // Without a closing ---, there's no chip.
    await page.evaluate(() => { (document.getElementById('chip') as any).content = '---\ntitle: x\n\n# A\n'; });
    await expect(page.locator('#chip .cm-juel-fm-chip')).toHaveCount(0);
});

const long = 'This paragraph is long enough to need several visual lines in an editor of ordinary width, '.repeat(4);
// Fills editor `id` with one long line, puts the cursor at its start and focuses it.
async function fillLong(page: Page, id: string) {
    await page.evaluate(([id, long]) => {
        const ed = document.getElementById(id) as any;
        ed.content = long;
    }, [id, long]);
    await expect.poll(() => page.evaluate(id => (document.getElementById(id) as any).editorView.state.doc.length, id)).toBe(long.length);
    await page.evaluate(id => { const ed = document.getElementById(id) as any; ed.setCursor(0); ed.focus(); }, id);
}
const overflows = (page: Page, id: string) => page.evaluate(id => {
    const s = document.querySelector(`#${id} .cm-scroller`) as HTMLElement;
    return s.scrollWidth > s.clientWidth + 1;
}, id);

test('writer: long lines soft-wrap; by default they run off the edge, as before', async ({ page }) => {
    await open(page);
    await fillLong(page, 'writer');
    await fillLong(page, 'plain');
    expect(await overflows(page, 'writer')).toBe(false);
    expect(await overflows(page, 'plain')).toBe(true);
});

test('writer: End and ArrowDown move by visual line inside a wrapped paragraph', async ({ page }) => {
    await open(page);
    await fillLong(page, 'writer');
    const cursor = () => page.evaluate(() => (document.getElementById('writer') as any).cursor as number);
    await page.keyboard.press('End');
    const end = await cursor();
    expect(end).toBeGreaterThan(0);
    expect(end).toBeLessThan(long.length);
    await page.keyboard.press('Home');
    expect(await cursor()).toBe(0);
    await page.keyboard.press('ArrowDown');
    const down = await cursor();
    expect(down).toBeGreaterThan(0);
    expect(down).toBeLessThan(long.length);
});

// Link text's contrast on `bg` with the app's light orange accent and the theme's text colour `text`.
const linkContrast = (page: Page, text: string, bg: string) => page.evaluate(async ([text, bg]) => {
    document.documentElement.style.setProperty('--juel-accent', '#F4803C');
    document.documentElement.style.setProperty('--juel-text', text);
    const ed = document.getElementById('writer') as any;
    ed.content = 'See [a link](https://example.com) here.\n';
    await new Promise(r => setTimeout(r, 100));
    const all = [...document.querySelectorAll('#writer .cm-content *')] as HTMLElement[];
    const el = all.reverse().find(e => e.textContent === 'a link')!;
    // The canvas turns any computed colour (color-mix gives color(srgb ...)) into bytes.
    const rgb = (c: string) => {
        const x = document.createElement('canvas').getContext('2d')!;
        x.fillStyle = c; x.fillRect(0, 0, 1, 1);
        return [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const lum = (c: number[]) => c.map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(rgb(bg))];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}, [text, bg]);

test('writer: link text keeps WCAG AA contrast with a light accent, light and dark', async ({ page }) => {
    await open(page);
    expect(await linkContrast(page, '#1d1f23', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(await linkContrast(page, '#e8e9ec', '#1e1f22')).toBeGreaterThanOrEqual(4.5);
});
