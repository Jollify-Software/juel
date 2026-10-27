import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HistoryStack, HistoryOptions } from '../_Core/History/HistoryStack';

export type HistoryChangeReason =
  | 'record'
  | 'undo'
  | 'redo'
  | 'reset'
  | 'rebase';

export interface HistoryChangeDetail<T> {
  reason: HistoryChangeReason;
  present: T;
  canUndo: boolean;
  canRedo: boolean;
}

export interface HistoryControllerOptions<T> extends HistoryOptions<T> {
  /**
   * Applies a state the controller has moved to (via undo/redo/reset). This is
   * where the host pushes the value back into whatever it is editing — an input
   * value, an element's inline style, a rich-text document, etc. Not called for
   * {@link HistoryController.record} or {@link HistoryController.preview}, since
   * in those cases the host already holds the value.
   */
  apply: (state: T) => void;
  /**
   * Name of the `CustomEvent` dispatched on the host after any change.
   * Default: `history-changed`.
   */
  eventName?: string;
}

/**
 * A reusable undo/redo history as a Lit {@link ReactiveController}. Compose it
 * onto any editor component regardless of its base class:
 *
 * ```ts
 * private history = new HistoryController<string>(this, this.value, {
 *   apply: (v) => { this.value = v; },
 * });
 * // on a committed edit:
 * this.history.record(this.value);
 * // wire buttons:
 * <juel-button ?disabled=${!this.history.canUndo} @click=${() => this.history.undo()}>
 * ```
 *
 * The host re-renders on every change, and a bubbling `history-changed`
 * ({@link HistoryChangeDetail}) event is dispatched so ancestors (or an app-wide
 * undo manager) can observe editor history.
 */
export class HistoryController<T> implements ReactiveController {
  private readonly host: ReactiveControllerHost & EventTarget;
  private readonly options: HistoryControllerOptions<T>;
  private stack: HistoryStack<T>;

  constructor(
    host: ReactiveControllerHost & EventTarget,
    initial: T,
    options: HistoryControllerOptions<T>
  ) {
    this.host = host;
    this.options = options;
    this.stack = new HistoryStack<T>(initial, options);
    host.addController(this);
  }

  hostConnected(): void {
    /* no-op — state is intentionally retained across disconnects */
  }

  get present(): T {
    return this.stack.present;
  }

  get canUndo(): boolean {
    return this.stack.canUndo;
  }

  get canRedo(): boolean {
    return this.stack.canRedo;
  }

  get size(): number {
    return this.stack.size;
  }

  /**
   * Record a committed edit. No-op (and no event) when the value is unchanged
   * from the current present.
   */
  record(state: T): void {
    if (this.stack.push(state)) {
      this.emit('record');
    }
  }

  /**
   * Update the present value without adding a history entry — for coalescing a
   * live interaction (drag, typing). Finish with {@link record} to commit it, or
   * {@link discardPreview} to drop it.
   */
  preview(state: T): void {
    this.stack.replace(state);
    this.host.requestUpdate();
  }

  /** Drop an in-flight {@link preview} value without recording it. */
  discardPreview(): void {
    this.stack.discardPending();
    this.host.requestUpdate();
  }

  undo(): void {
    if (this.stack.canUndo) {
      this.options.apply(this.stack.undo());
      this.emit('undo');
    }
  }

  redo(): void {
    if (this.stack.canRedo) {
      this.options.apply(this.stack.redo());
      this.emit('redo');
    }
  }

  /** Hard-reset to the initial state and apply it. */
  /**
   * Start again from `initial` with no past and no future (an editor given a new
   * value to edit): nothing is applied, since the component already holds it.
   */
  reseed(initial: T): void {
    this.stack = new HistoryStack<T>(initial, this.options);
    this.host.requestUpdate();
    this.emit('reset');
  }

  reset(): void {
    this.options.apply(this.stack.reset());
    this.emit('reset');
  }

  /**
   * Start a fresh history with a new baseline, discarding all existing entries.
   * Use when the thing being edited is swapped out, or when opening an editing
   * session whose "cancel" should return to this exact state.
   */
  rebase(initial: T): void {
    this.stack = new HistoryStack<T>(initial, this.options);
    this.emit('rebase');
  }

  private emit(reason: HistoryChangeReason): void {
    this.host.requestUpdate();
    const detail: HistoryChangeDetail<T> = {
      reason,
      present: this.present,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
    };
    this.host.dispatchEvent(
      new CustomEvent(this.options.eventName ?? 'history-changed', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }
}
