export interface HistoryOptions<T = unknown> {
  /**
   * Maximum number of entries retained in the undo branch. When exceeded the
   * oldest entry is dropped. `0` (or a negative value) means unlimited.
   * Default: 100.
   */
  limit?: number;
  /**
   * Equality test used to skip `push`es that would record an identical
   * consecutive state. Default: strict `===`.
   */
  equals?: (a: T, b: T) => boolean;
}

/**
 * A framework-free undo/redo history. Holds a single committed "present" value
 * flanked by a `past` (undo) branch and a `future` (redo) branch. Committing a
 * new state with {@link push} discards the redo branch, matching the behaviour
 * every editor's Ctrl+Z is expected to have.
 *
 * A separate *pending* value supports coalescing a live interaction (a drag, a
 * burst of typing): call {@link replace} as the value streams in — it updates
 * what {@link present} reports without touching history — then call {@link push}
 * once with the final value to record a single entry. `push` always compares
 * against the last *committed* value, so a `replace(x)` immediately followed by
 * `push(x)` still records one step.
 *
 * The stored type `T` is treated as immutable — push a fresh snapshot rather
 * than mutating a value already handed to the stack.
 */
export class HistoryStack<T> {
  private past: T[] = [];
  private future: T[] = [];
  private committed: T;
  private pending: { value: T } | null = null;
  private readonly _initial: T;
  private readonly limit: number;
  private readonly equals: (a: T, b: T) => boolean;

  constructor(initial: T, options: HistoryOptions<T> = {}) {
    this.committed = initial;
    this._initial = initial;
    this.limit = options.limit ?? 100;
    this.equals = options.equals ?? ((a, b) => a === b);
  }

  /** The current value — the pending value if one is in flight, else the committed one. */
  get present(): T {
    return this.pending ? this.pending.value : this.committed;
  }

  /** The value the stack was constructed with. */
  get initial(): T {
    return this._initial;
  }

  /** Whether a live (uncommitted) value is currently in flight. */
  get hasPending(): boolean {
    return this.pending !== null;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Total number of committed states held (past + present + future). */
  get size(): number {
    return this.past.length + 1 + this.future.length;
  }

  /**
   * Commit `state` as the new present, pushing the previous committed value onto
   * the undo branch and clearing the redo branch and any pending value. Returns
   * `false` (a no-op beyond clearing pending) when `state` equals the current
   * committed value.
   */
  push(state: T): boolean {
    this.pending = null;
    if (this.equals(state, this.committed)) {
      return false;
    }
    this.past.push(this.committed);
    if (this.limit > 0 && this.past.length > this.limit) {
      this.past.shift();
    }
    this.committed = state;
    this.future.length = 0;
    return true;
  }

  /**
   * Set the live/pending value without creating a history entry. Finish the
   * interaction with {@link push} (to record it) or {@link discardPending} (to
   * drop it).
   */
  replace(state: T): void {
    this.pending = { value: state };
  }

  /** Drop the pending value, reverting {@link present} to the committed value. */
  discardPending(): void {
    this.pending = null;
  }

  /** Step back one committed state. Returns the new present (unchanged if `!canUndo`). */
  undo(): T {
    this.pending = null;
    if (this.canUndo) {
      this.future.unshift(this.committed);
      this.committed = this.past.pop() as T;
    }
    return this.committed;
  }

  /** Step forward one committed state. Returns the new present (unchanged if `!canRedo`). */
  redo(): T {
    this.pending = null;
    if (this.canRedo) {
      this.past.push(this.committed);
      this.committed = this.future.shift() as T;
    }
    return this.committed;
  }

  /**
   * Discard both branches and any pending value, returning to the initial
   * state. This is a hard reset — it cannot itself be undone.
   */
  reset(): T {
    this.past.length = 0;
    this.future.length = 0;
    this.pending = null;
    this.committed = this._initial;
    return this.committed;
  }

  /** Discard both branches, keeping the current committed value as the new baseline. */
  clear(): void {
    this.past.length = 0;
    this.future.length = 0;
  }

  /** All committed states, oldest first, with the present in its natural position. */
  toArray(): T[] {
    return [...this.past, this.present, ...this.future];
  }
}
