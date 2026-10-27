# Move and rotate handles

`<juel-move-handle>` (✥) and `<juel-rotate-handle>` (↻) are drag handles that move or turn
**something else**: an element in a preview, a shape on a canvas. They don't touch what they move.
They report what the pointer did, and the app turns that into its own units (a CSS `translate` in
`vw`/`vh`, a `rotate` in a design stylesheet), with its own undo.

Both are small square tool buttons with a Lucide glyph, focusable, and usable from the keyboard.
A drag fires live events (`commit: false`) and then **one** `commit: true` when you let go, only if
the pointer moved. So an app records one undo step per drag, and a plain click does nothing.

## `<juel-move-handle>`

| | |
|---|---|
| `handle-move` | `{ dx, dy, commit }`: screen px from the press |
| `handle-nudge` | `{ dx, dy, big }`: an arrow key (one of `dx`/`dy` ±1), `big` with Shift |
| `label`, `glyph` (`lucide-move`), `disabled` | |

The app maps `dx`/`dy` into its own space. Jollify divides by the preview's scale and applies the
parent's inverse transform, so a move inside a rotated parent still follows the mouse.

## `<juel-rotate-handle>`

| | |
|---|---|
| `value` | the angle now, in degrees: where a drag or key starts from |
| `center` | `() => { x, y } \| null`: the centre to turn round, in client px; default the handle's own |
| `handle-rotate` | `{ angle, commit }`, degrees in (-180, 180] |
| `step` (1), `big-step` (15), `snap` (15) | arrow keys; Shift+arrow; Shift while dragging |
| `label`, `glyph` (`lucide-rotate-cw`), `disabled` | |

The angle is `value` plus the angle swept round `center` between the press and the pointer now
(`dragAngle` in `handleMath.ts`). So the handle can sit in a toolbar away from the element: the
press point is just where the sweep starts. → and ↑ turn clockwise. `parseAngle` and `formatAngle`
read and write CSS `rotate` values (`deg`, `turn`, `rad`, `grad`).

Tests: `tests/Handles/handleMath.test.ts` (jest) and `tests/e2e/handles.spec.ts`, on
`examples/Editors/Handles/handles.html`.
