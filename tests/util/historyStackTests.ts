import { HistoryStack } from '../../src/_Core/History/HistoryStack';

describe('HistoryStack', () => {
  test('starts with just the initial state', () => {
    const h = new HistoryStack('a');
    expect(h.present).toBe('a');
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.size).toBe(1);
  });

  test('push advances present and enables undo', () => {
    const h = new HistoryStack('a');
    expect(h.push('b')).toBe(true);
    expect(h.present).toBe('b');
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
  });

  test('push is a no-op when the value is unchanged', () => {
    const h = new HistoryStack('a');
    expect(h.push('a')).toBe(false);
    expect(h.canUndo).toBe(false);
    expect(h.size).toBe(1);
  });

  test('undo / redo walk the timeline', () => {
    const h = new HistoryStack('a');
    h.push('b');
    h.push('c');
    expect(h.undo()).toBe('b');
    expect(h.undo()).toBe('a');
    expect(h.canUndo).toBe(false);
    expect(h.undo()).toBe('a'); // clamped
    expect(h.redo()).toBe('b');
    expect(h.redo()).toBe('c');
    expect(h.canRedo).toBe(false);
    expect(h.redo()).toBe('c'); // clamped
  });

  test('push after undo discards the redo branch', () => {
    const h = new HistoryStack('a');
    h.push('b');
    h.push('c');
    h.undo(); // -> b
    h.push('d');
    expect(h.present).toBe('d');
    expect(h.canRedo).toBe(false);
    expect(h.toArray()).toEqual(['a', 'b', 'd']);
  });

  test('replace changes present without a history entry', () => {
    const h = new HistoryStack('a');
    h.push('b');
    h.replace('b-live');
    h.replace('b-final');
    expect(h.present).toBe('b-final');
    expect(h.hasPending).toBe(true);
    expect(h.toArray()).toEqual(['a', 'b-final']);
    expect(h.undo()).toBe('a');
  });

  test('replace(x) then push(x) still records one step', () => {
    // The drag-coalescing path: a preview sets the live value, the release
    // commits the same value. It must not dedupe itself away.
    const h = new HistoryStack('a');
    h.replace('b');
    expect(h.push('b')).toBe(true);
    expect(h.canUndo).toBe(true);
    expect(h.hasPending).toBe(false);
    expect(h.undo()).toBe('a');
  });

  test('push still dedupes against the committed value', () => {
    const h = new HistoryStack('a');
    h.replace('a');
    expect(h.push('a')).toBe(false);
    expect(h.canUndo).toBe(false);
    expect(h.hasPending).toBe(false);
  });

  test('discardPending reverts present to the committed value', () => {
    const h = new HistoryStack('a');
    h.push('b');
    h.replace('b-live');
    expect(h.present).toBe('b-live');
    h.discardPending();
    expect(h.present).toBe('b');
    expect(h.hasPending).toBe(false);
  });

  test('undo drops any pending value', () => {
    const h = new HistoryStack('a');
    h.push('b');
    h.replace('b-live');
    expect(h.undo()).toBe('a');
    expect(h.hasPending).toBe(false);
    expect(h.redo()).toBe('b'); // the committed value, not the discarded preview
  });

  test('reset returns to the initial state and clears both branches', () => {
    const h = new HistoryStack('a');
    h.push('b');
    h.push('c');
    h.undo();
    expect(h.reset()).toBe('a');
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.size).toBe(1);
  });

  test('clear keeps the current present as the new baseline', () => {
    const h = new HistoryStack('a');
    h.push('b');
    h.clear();
    expect(h.present).toBe('b');
    expect(h.canUndo).toBe(false);
    expect(h.reset()).toBe('a'); // initial is still the original
  });

  test('limit drops the oldest undo entries', () => {
    const h = new HistoryStack(0, { limit: 2 });
    h.push(1);
    h.push(2);
    h.push(3); // past is now [1, 2]; 0 was dropped
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.canUndo).toBe(false);
  });

  test('custom equals suppresses near-duplicate pushes', () => {
    const h = new HistoryStack(
      { x: 0 },
      { equals: (a, b) => a.x === b.x }
    );
    expect(h.push({ x: 0 })).toBe(false);
    expect(h.push({ x: 1 })).toBe(true);
    expect(h.canUndo).toBe(true);
  });
});
