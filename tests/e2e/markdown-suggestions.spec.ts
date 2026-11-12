// juel-markdown-editor's suggestions while typing (DOCS-PLAN H6), on its example page.
import { expect, Page, test } from '@playwright/test';

const open = async (page: Page) => {
    await page.goto('examples/Editors/MarkdownEditor/suggestions.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    await page.locator('#live .cm-line').first().waitFor();
};
const text = (page: Page, id: string) => page.locator(`#${id}`).evaluate((el: any) => el.editorView.state.doc.toString());
const selection = (page: Page, id: string) => page.locator(`#${id}`).evaluate((el: any) => {
    const { from, to } = el.editorView.state.selection.main;
    return el.editorView.state.sliceDoc(from, to);
});
const typeAtEnd = async (page: Page, id: string, typed: string) => {
    await page.locator(`#${id}`).evaluate((el: any) => { el.focus(); el.setCursor(el.editorView.state.doc.length); });
    await page.keyboard.type(typed);
};
const list = (page: Page, id: string) => page.locator(`#${id} .cm-tooltip-autocomplete li`);

test('::: at a line start lists the suggestions; Enter inserts with the cursor on the first field, Tab to the next', async ({ page }) => {
    await open(page);
    await typeAtEnd(page, 'live', ':::');
    await expect(list(page, 'live')).toHaveText([/columns/, /note/, /shape/]);
    // CodeMirror ignores Enter for 75 ms after the list opens (interactionDelay), so a key
    // pressed while typing on doesn't take a suggestion by accident; a person pauses longer.
    await page.waitForTimeout(150);
    await page.keyboard.press('Enter');
    await expect(list(page, 'live')).toHaveCount(0);
    expect(await text(page, 'live')).toBe('# Suggestions\n\n:::columns\nleft\n:::\nright\n:::');
    expect(await selection(page, 'live')).toBe('left');
    await page.keyboard.press('Tab');
    expect(await selection(page, 'live')).toBe('right');
});

test('::: mid-line lists nothing; typing filters', async ({ page }) => {
    await open(page);
    await typeAtEnd(page, 'live', 'text :::');
    await page.waitForTimeout(400);
    await expect(list(page, 'live')).toHaveCount(0);
    await page.keyboard.press('Enter');
    await page.keyboard.type(':::no');
    await expect(list(page, 'live')).toHaveText([/note/]);
});

test('suggestions-live off shows nothing until Ctrl+Space', async ({ page }) => {
    await open(page);
    await typeAtEnd(page, 'quiet', ':::');
    await page.waitForTimeout(400);
    await expect(list(page, 'quiet')).toHaveCount(0);
    await page.keyboard.press('Control+Space');
    await expect(list(page, 'quiet')).toHaveText([/columns/, /note/, /shape/]);
});

test('![ asks suggest, and Escape closes the list', async ({ page }) => {
    await open(page);
    await typeAtEnd(page, 'live', 'See ![');
    await expect(list(page, 'live')).toHaveText([/logo\.png/, /map\.svg/]);
    expect(await page.evaluate(() => (window as any).suggestCalls)).toContainEqual({ after: '![', typed: '' });
    await page.keyboard.press('Escape');
    await expect(list(page, 'live')).toHaveCount(0);
});

test('the info panel\'s "More in the guide" fires suggestion-help', async ({ page }) => {
    await open(page);
    await typeAtEnd(page, 'live', ':::');
    const more = page.locator('#live .cm-completionInfo .cm-juel-suggestion-help');
    await expect(more).toBeVisible();
    await expect(page.locator('#live .cm-completionInfo')).toContainText('Two or more columns');
    await more.click();
    await expect(page.locator('#help')).toHaveText('Help asked for: columns');
});

test('a new line inside the front matter lists its keys; typing filters; Enter takes one', async ({ page }) => {
    await open(page);
    const endOfLine = (line: number) => page.locator('#front').evaluate((el: any, n: number) => {
        el.focus();
        el.setCursor(el.editorView.state.doc.line(n).to);
    }, line);
    await endOfLine(2); // after "title: Hi"
    await page.keyboard.press('Enter');
    await expect(list(page, 'front')).toHaveText([/theme/, /title/, /transition/]);
    await page.keyboard.type('tr');
    await expect(list(page, 'front')).toHaveText([/transition/]);
    await page.waitForTimeout(150); // CodeMirror's interactionDelay, as above
    await page.keyboard.press('Enter');
    await expect(list(page, 'front')).toHaveCount(0);
    expect(await text(page, 'front')).toBe('---\ntitle: Hi\ntransition: \n---\n\n# Deck\n');
});

test('control: an empty line outside the front matter lists nothing', async ({ page }) => {
    await open(page);
    await page.locator('#front').evaluate((el: any) => { el.focus(); el.setCursor(el.editorView.state.doc.line(5).to); });
    await page.keyboard.press('Enter'); // after "# Deck", below the front matter
    await page.waitForTimeout(400);
    await expect(list(page, 'front')).toHaveCount(0);
    // and the same editor's front matter does list (the detector sees a positive)
    await page.locator('#front').evaluate((el: any) => { el.focus(); el.setCursor(el.editorView.state.doc.line(2).to); });
    await page.keyboard.press('Enter');
    await expect(list(page, 'front')).toHaveText([/theme/, /title/, /transition/]);
});

test('dark: the list takes the look tokens', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.documentElement.style.setProperty('--juel-raised', 'rgb(20, 24, 32)'));
    await typeAtEnd(page, 'live', ':::');
    const tip = page.locator('#live .cm-tooltip-autocomplete');
    await expect(tip).toBeVisible();
    expect(await tip.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(20, 24, 32)');
});
