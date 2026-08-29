import { LitElement, css, html, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { HistoryController } from '../../_Base/HistoryController';

/**
 * Shared spine for **style editors** — components that visually edit one CSS
 * property of a target DOM element with a live preview and multi-step undo.
 *
 * A subclass keeps whatever internal model it likes and implements four hooks:
 *
 * - `parse(css)`   — CSS string → internal model
 * - `serialize()`  — internal model → canonical CSS string
 * - `renderControls()` — the editor UI (the base appends the undo/redo toolbar)
 * - `changeEventName` — the `CustomEvent` type this editor dispatches
 *
 * and drives history through the protected helpers:
 *
 * - `commit(reason?)`     — one undo step for a finished edit
 * - `previewChange()`     — a live, uncommitted update (drag / scrub)
 * - `cancelPreview(anchor)` — abandon a live interaction
 * - `reserialize()`       — re-emit the same model (e.g. a display-unit toggle)
 *
 * Target resolution (`for` / `target`), the `context[property]` model binding,
 * the `HistoryController` lifecycle (incl. the rAF init-timing dance — see
 * `src/_Core/History/README.md`), and `applyLive` with its baseline-removal rule
 * are all handled here.
 */
export abstract class StylePropertyEditorBase extends LitElement {
  /** CSS selector for the target element. Ignored if `target` is set directly. */
  @property({ type: String }) for = '';

  /** The target element. Settable directly as an alternative to `for`. */
  @property({ attribute: false }) target: HTMLElement | null = null;

  /** CSS property to seed from and live-apply while editing. */
  @property({ type: String, attribute: 'css-property' }) cssProperty = '';

  /** Current value as a canonical CSS string. Reflected. */
  @property({ type: String, reflect: true }) value = '';

  /** Optional JS model binding: `context[property] = value` on every change. */
  @property({ attribute: false }) context: Record<string, unknown> | string | undefined;
  @property({ type: String }) property = 'value';

  protected history?: HistoryController<string>;
  protected baselineValue = '';
  protected hadInlineValue = false;

  static baseStyles = css`
    .se-root {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-family: inherit;
    }
    .se-history {
      display: inline-flex;
      gap: 0.25rem;
    }
    button.se-hist {
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      font-size: 1rem;
      line-height: 1;
      border: 1px solid var(--border-color, #ced4da);
      border-radius: 4px;
      background: var(--surface, #fff);
      color: inherit;
      cursor: pointer;
    }
    button.se-hist:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .se-readout {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8125rem;
      opacity: 0.75;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;

  // --- lifecycle ----------------------------------------------------------

  connectedCallback(): void {
    super.connectedCallback();
    this.resolveTarget();
    this.resolveContext();
    if (!this.history) {
      requestAnimationFrame(() => this.initEditor());
    }
  }

  firstUpdated(_changed: PropertyValues): void {
    this.initEditor();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.onTeardown();
  }

  updated(changed: PropertyValues): void {
    if (changed.has('for') || changed.has('target')) {
      this.resolveTarget();
    }
  }

  /** Idempotent; safe to call from both `connectedCallback` (via rAF) and `firstUpdated`. */
  protected initEditor(): void {
    if (this.history || !this.isConnected) return;
    this.resolveTarget();
    this.resolveContext();

    const seed = this.seedValue();
    if (seed) {
      this.parse(seed);
    }
    this.value = this.serialize();
    this.baselineValue = this.value;
    this.hadInlineValue =
      !!this.target &&
      !!this.cssProperty &&
      this.target.style.getPropertyValue(this.cssProperty).trim() !== '';

    this.history = new HistoryController<string>(this, this.value, {
      apply: (v) => this.adopt(v),
    });
    this.onReady();
    this.requestUpdate();
  }

  // --- subclass contract ------------------------------------------------

  /** CSS string → internal model. Tolerant: leave the model unchanged if unparseable. */
  protected abstract parse(value: string): void;

  /** Internal model → canonical CSS string. */
  protected abstract serialize(): string;

  /** The editor-specific controls. The base appends the undo/redo buttons. */
  protected abstract renderControls(): unknown;

  /** `CustomEvent` type for change / preview / cancel notifications. */
  protected abstract get changeEventName(): string;

  /** Value used when there is no explicit `value` and nothing to read from the target. */
  protected get seedFallback(): string {
    return '';
  }

  /** After history is created and the first model is ready. */
  protected onReady(): void {
    /* optional */
  }

  /** On disconnect — tear down overlays, listeners, etc. */
  protected onTeardown(): void {
    /* optional */
  }

  /** Whether the current value is semantically the untouched baseline. */
  protected isAtBaseline(): boolean {
    return this.value === this.baselineValue;
  }

  // --- mutation helpers -----------------------------------------------

  /** Adopt a value from history (undo/redo/reset) or a cancel restore — no new entry. */
  protected adopt(value: string): void {
    this.parse(value);
    this.value = this.serialize();
    this.applyLive();
    this.pushContext();
    this.requestUpdate();
  }

  /** Re-emit the current model without a history entry (e.g. a display-unit toggle). */
  protected reserialize(): void {
    this.value = this.serialize();
    this.applyLive();
    this.pushContext();
  }

  /** Commit the current model as one undo step. */
  protected commit(reason = 'edit'): void {
    this.value = this.serialize();
    this.applyLive();
    this.pushContext();
    this.history?.record(this.value);
    this.emitChange(reason);
  }

  /** A live, uncommitted update during a drag / scrub. */
  protected previewChange(): void {
    this.value = this.serialize();
    this.applyLive();
    this.pushContext();
    this.history?.preview(this.value);
    this.emitChange('preview');
  }

  /** Abandon a live interaction, restoring to `anchor`. */
  protected cancelPreview(anchor: string): void {
    this.history?.discardPreview();
    this.adopt(anchor);
    this.emitChange('cancel');
  }

  // --- public API ---------------------------------------------------

  get canUndo(): boolean {
    return !!this.history?.canUndo;
  }
  get canRedo(): boolean {
    return !!this.history?.canRedo;
  }
  undo(): void {
    if (this.history?.canUndo) {
      this.history.undo();
      this.emitChange('undo');
    }
  }
  redo(): void {
    if (this.history?.canRedo) {
      this.history.redo();
      this.emitChange('redo');
    }
  }
  /** Hard-reset to the value the editor started with. */
  reset(): void {
    if (this.history) {
      this.history.reset();
      this.emitChange('reset');
    }
  }

  // --- internals --------------------------------------------------

  protected applyLive(): void {
    if (!this.target || !this.cssProperty) return;
    // Back at the untouched baseline, nothing to undo, no inline value to begin
    // with: leave the element as we found it rather than pinning a value inline.
    if (!this.hadInlineValue && !this.canUndo && this.isAtBaseline()) {
      this.target.style.removeProperty(this.cssProperty);
    } else {
      this.target.style.setProperty(this.cssProperty, this.value);
    }
  }

  protected pushContext(): void {
    if (this.context && typeof this.context === 'object' && this.property) {
      (this.context as Record<string, unknown>)[this.property] = this.value;
    }
  }

  protected emitChange(reason: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(
      new CustomEvent(this.changeEventName, {
        detail: { value: this.value, reason, ...detail },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected resolveTarget(): void {
    if (!this.target && this.for) {
      const root = this.getRootNode() as Document | ShadowRoot;
      this.target =
        (root.querySelector?.(this.for) as HTMLElement | null) ??
        document.querySelector<HTMLElement>(this.for);
    }
  }

  protected resolveContext(): void {
    if (typeof this.context === 'string' && this.context in window) {
      this.context = (window as unknown as Record<string, Record<string, unknown>>)[
        this.context
      ];
    }
  }

  protected seedValue(): string {
    if (this.value && this.value !== this.seedFallback) {
      return this.value;
    }
    if (this.target && this.cssProperty) {
      const computed = getComputedStyle(this.target)
        .getPropertyValue(this.cssProperty)
        .trim();
      if (computed && computed !== 'none') {
        return computed;
      }
    }
    return this.value || this.seedFallback;
  }

  protected renderHistoryButtons(): unknown {
    return html`
      <span class="se-history" part="history">
        <button
          type="button"
          class="se-hist"
          aria-label="Undo"
          title="Undo"
          ?disabled=${!this.canUndo}
          @click=${() => this.undo()}
        >
          &#8630;
        </button>
        <button
          type="button"
          class="se-hist"
          aria-label="Redo"
          title="Redo"
          ?disabled=${!this.canRedo}
          @click=${() => this.redo()}
        >
          &#8631;
        </button>
      </span>
    `;
  }

  render() {
    return html`
      <div class="se-root" part="root">
        ${this.renderControls()}${this.renderHistoryButtons()}
      </div>
    `;
  }
}
