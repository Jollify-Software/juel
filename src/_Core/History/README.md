# Undo / redo for Juel editors

Two pieces:

| File | What it is | Use it when |
| --- | --- | --- |
| `_Core/History/HistoryStack.ts` | Framework-free `HistoryStack<T>` data structure. Pure, unit-tested. | You need timeline logic outside a component, or you're writing tests. |
| `_Base/HistoryController.ts` | `HistoryController<T>` — a Lit **Reactive Controller** wrapping a `HistoryStack`. | **Almost always.** This is the integration point for a component. |

A `HistoryController` is a controller, not a base class, so it composes with whatever
your component already extends (`LitElement`, `InputBase`, `JuelComponent`, …). Nothing
about your inheritance chain changes.

---

## The mental model

The stack holds one **committed** value with a `past` (undo) branch and a `future`
(redo) branch, plus a transient **pending** value for a live interaction.

- **`record(value)`** — commit an edit. Pushes the previous committed value onto the
  undo branch, clears the redo branch. This is what Ctrl+Z steps through. No-op if
  `value` equals the current committed value.
- **`preview(value)`** — set a live, uncommitted value during a drag / a burst of
  typing. Does **not** create a history entry. The component re-renders; `present`
  now reports the preview.
- **`discardPreview()`** — throw the pending value away (interaction cancelled).
- **`undo()` / `redo()` / `reset()`** — walk the timeline. Each calls your `apply`
  callback with the value it moved to.

The golden rule: **one user gesture = one `record`.** A drag is `preview` … `preview`
… `record` (on release). A single click is just `record`. `record` compares against
the last *committed* value, so `preview(x)` immediately followed by `record(x)` still
records exactly one step — don't hand-roll your own dedupe.

---

## Integration recipe

```ts
import { HistoryController } from '../../_Base/HistoryController';

@customElement('juel-my-editor')
export class JuelMyEditor extends LitElement {
  @property() value = '';

  private history?: HistoryController<string>;

  connectedCallback(): void {
    super.connectedCallback();
    // Create it once. If you need layout/measurements to compute the initial
    // value, defer with requestAnimationFrame (see "Init timing" below) rather
    // than firstUpdated.
    if (!this.history) {
      this.history = new HistoryController<string>(this, this.value, {
        apply: (v) => this.applyValue(v),
      });
    }
  }

  /** Called ONLY by undo/redo/reset. Adopt `v` — never call record() from here. */
  private applyValue(v: string): void {
    this.value = v;
    // ...push v into whatever you're editing (an input, an element's style, a doc)...
  }

  // --- during a live interaction ---
  private onDrag(v: string) {
    this.value = v;
    this.applyLiveSideEffects(v);      // e.g. write el.style
    this.history?.preview(v);
  }
  private onDragEnd(v: string) {
    this.value = v;
    this.applyLiveSideEffects(v);
    this.history?.record(v);           // the single history entry for this gesture
    this.fireChanged('edit');
  }
  private onCancel() {
    this.history?.discardPreview();
    this.applyValue(this.pendingAnchor); // restore to where the gesture started
    this.fireCancelled();
  }

  // --- toolbar ---
  render() {
    return html`
      <button type="button" ?disabled=${!this.history?.canUndo}
              @click=${() => { this.history?.undo(); this.fireChanged('undo'); }}>&#8630;</button>
      <button type="button" ?disabled=${!this.history?.canRedo}
              @click=${() => { this.history?.redo(); this.fireChanged('redo'); }}>&#8631;</button>
    `;
  }
}
```

### The `apply` callback contract

`apply` is invoked **only** for `undo` / `redo` / `reset` — because for `record` and
`preview` your component already holds the value. `apply` must adopt the value and push
it into whatever is being edited. **It must never call `record()` / `preview()`** or you
get feedback loops.

### Wiring the change event

`HistoryController` already dispatches a bubbling `history-changed`
(`{ reason, present, canUndo, canRedo }`) on every change — ancestors and an
app-wide undo manager can listen. Your component still fires its own domain event
(`my-editor-changed` with the value and a `reason`) for consumers who don't care about
history mechanics.

---

## Gotchas (learned building `juel-position-editor`)

1. **Init timing.** If computing the initial value needs layout (measuring an
   element, reading a computed style in `px`), do **not** create the controller in
   `firstUpdated` — in practice it did not run reliably and left `history` undefined,
   which silently kills undo/redo. Create it from a `requestAnimationFrame` callback
   in `connectedCallback`, make the init function idempotent (`if (this.history)
   return`), and also call it from `firstUpdated` as a belt-and-braces path. Guard
   every controller call with `?.` for the brief window before it exists.

2. **Keep `T` immutable.** Store snapshots (strings, plain objects you don't mutate).
   Pushing a reference you later mutate corrupts the timeline. If `T` is an object,
   pass `equals` so `record` can dedupe meaningfully.

3. **"Back to the start" cleanup.** If editing an element and the user undoes all the
   way to the beginning, decide whether to remove your inline changes entirely rather
   than pin a value. Compare against the baseline by *semantic* value (e.g. parsed
   fractions), not the raw string — a format/unit toggle changes the string but not
   the state.

4. **`rebase(initial)`** starts a fresh timeline with a new baseline, discarding all
   entries. Use it when the thing being edited is swapped out, or to make a
   session's "cancel" return to a specific point. It does **not** apply anything.

5. **`reset()`** applies and jumps to the very first value; it is itself not undoable.

---

## Testing

`HistoryStack` is pure — cover timeline logic there (`tests/util/historyStackTests.ts`
is the template). Controller + component behaviour (toolbar disabled states, live
preview restoring on cancel, baseline cleanup) is browser-tested via Playwright against
the `examples/` page, per the repo's usual approach.

## Reference implementation

`src/Editors/PositionEditor/PositionEditor.ts` — a full consumer: live drag preview,
per-gesture `record`, toolbar arrows, `reset()`, cancel via `discardPreview`, baseline
cleanup, `history-changed` plus its own `position-changed` event.
