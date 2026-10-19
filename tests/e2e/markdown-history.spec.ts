// juel-markdown-editor's history API (undo, redo, undoDepth, redoDepth), on the writer example page.
import { expect, test } from '@playwright/test';

test('undo / redo step the editor\'s own history and report its depths', async ({ page }) => {
    await page.goto('examples/Editors/MarkdownEditor/writer.html');
    await page.waitForFunction(() => (window as any).exampleReady);
    const ed = page.locator('#writer');
    await ed.locator('.cm-line').first().waitFor();
    const state = () => ed.evaluate((el: any) => ({ depth: el.undoDepth, redo: el.redoDepth, text: el.editorView.state.doc.toString() }));
    const start = await state();
    await ed.evaluate((el: any) => { el.setCursor(0); el.insertAtCursor('One '); });
    const typed = await state();
    expect(typed.depth).toBe(start.depth + 1);
    expect(typed.text.startsWith('One ')).toBe(true);
    expect(await ed.evaluate((el: any) => el.undo())).toBe(true);
    expect(await state()).toEqual({ ...start, redo: start.redo + 1 });
    expect(await ed.evaluate((el: any) => el.redo())).toBe(true);
    expect((await state()).text).toBe(typed.text);
    // Nothing left to redo.
    expect(await ed.evaluate((el: any) => el.redo())).toBe(false);
});
