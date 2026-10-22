# Quiz

`<juel-quiz>`: a question with choices, a **Check** button that opens an answer dialog (right or
wrong, the right answer, and an explanation), and **Reset**. Built on `juel-modal` and
`juel-button`. It knows nothing about presentations: a host (Jetty) talks to it through
attributes, the `state` property, `apply()` and the `quiz-change` event.

The plan is `jollify/QUIZ-PLAN.md`. Q1 built the choice kind; Q2 adds sort and match (the keyboard scheme for them is still to come).

## Markup

```html
<juel-quiz data-answer="1">
  <p>Which planet is the largest?</p>
  <ul><li>Mars</li><li>Jupiter</li><li>Venus</li></ul>
  <blockquote><p>Jupiter is more than twice the mass of all the others together.</p></blockquote>
</juel-quiz>
```

- **The question** is the first child that isn't a list or a `<blockquote>`.
- **The items** are the `<li>`s of the first `<ul>`/`<ol>` child, in source order.
- **The explanation** (optional) is a `<blockquote>` child, shown in the answer dialog.
- **The answer key** is `data-answer`: comma-separated 0-based indices into the source order.
  One index gives radios; several give checkboxes (right only when exactly those are chosen).
  Yes/no is just two items. The key is kept off what's shown, so a build for students can leave
  it (and the `<blockquote>`) out.

The light DOM stays as written; the element shows copies of it in its shadow tree. Adding,
removing or replacing its children re-renders; editing inside one (a new `<li>` in a list) doesn't,
so replace the list. For a JSON island, replace the `<script>` rather than its text.

## Sort

```html
<juel-quiz type="sort" data-answer="0,0,1">   <!-- item i belongs in group data-answer[i] -->
  <p>Put each animal in its group.</p>
  <ol data-groups><li data-colour="#c026d3">Mammal</li><li>Bird</li></ol>
  <ul><li>Dog</li><li>Whale</li><li>Eagle</li></ul>
  <blockquote><p>Shown with the answer.</p></blockquote>
</juel-quiz>
```

The groups are the `<li>`s of the `[data-groups]` list (`data-colour` sets a group's colour,
otherwise a built-in palette); the items are the other list, shuffled into a pool. Drag an item
into a group, or back to the pool, with the mouse, a pen or a finger (pointer events, one path;
`Drag.ts`). **Check** marks each placed item ✓/✗ and says right or wrong (no dialog); **Show the
answer** slides every item to its group (FLIP, skipped under `prefers-reduced-motion`) and shows
the `<blockquote>`; **Try again** resets. `show-answers` shows them placed, with no buttons and no (empty) pool. Each group (and each match slot) is a
`role="group"` named by its visible name, so a screen reader says where a chip is.

## Match

```html
<juel-quiz type="match" data-answer="1,0">   <!-- left entry i's partner is partner data-answer[i] -->
  <p>Match each date to its event.</p>
  <ul><li>1066</li><li>1969</li></ul>
  <ul data-partners><li>The Moon landing</li><li>The Battle of Hastings</li></ul>
</juel-quiz>
```

The left column (the list that isn't `[data-partners]`) stays in order, with a slot beside each
entry; the partners are shuffled into the pool and dragged into the slots. A slot holds one
partner: dropping another sends the first back to the pool. Check, Show the answer, Try again
and `show-answers` work as for sort. Every partner needs an entry (no distractors yet). Two
partners written the same (`<li>mammal</li>` twice) can't be told apart, so Check takes either
as right in the other's slot; the same goes for one sort item written into two groups. Slots
written the same (two left entries alike, two groups of one name) are still marked by position;
Slipway warns about them.

## From data (a JSON island)

```html
<juel-quiz>
  <script type="application/json">
    { "type": "sort", "question": "Odd or even?",
      "groups": [{ "name": "Odd", "colour": "#ea580c", "items": ["1", "3"] }, { "name": "Even", "items": ["2", "4"] }],
      "explanation": "Shown with the answer." }
  </script>
</juel-quiz>
```

When the element has no `<ul>`/`<ol>` child, it reads the quiz from a `<script type="application/json">`
child instead: what Slipway writes for `::: quiz data=quiz.json`. The shape mirrors the Markdown:

- `type`: `choice` (the default), `sort` or `match`. The element's own `type` attribute wins if the page wrote one (with a `console.warn` when it disagrees with the data).
- `question`, and optionally `explanation`.
- choice: `items: [{ "text": "…", "right": true }]` (one right item gives radios, several checkboxes);
  sort: `groups: [{ "name": "…", "colour": "#…", "items": ["…"] }]` (`colour`, or `color`, is optional); match: `pairs: [["left", "right"]]`.

The texts are **inline HTML** (Slipway renders a data file's inline Markdown before writing the
island), so they're as trusted as the rest of the page. The key comes from the data (`data-answer`
on the element, if present, wins). Everything else (state, messages, keyboard, `show-answers`,
print) is as for markup. Bad data (not JSON, a missing question, no right item, …) logs a
`console.warn` saying what's wrong and shows an empty quiz; it never throws. The pure part is
`QuizData.ts` (`readQuizData`, `quizDataError`, `quizSource`).

## Attributes

| Attribute | |
|---|---|
| `data-answer` | The key (above). |
| `type` | `choice` (the default), `sort` or `match`. |
| `seed` | Seeds the shuffle. Default: a hash of the question text, so every screen showing the same quiz shows the same order. |
| `no-shuffle` | Keep source order. A list of two or fewer items is never shuffled. |
| `show-answers` | Mark the right items, show the explanation and hide the buttons (a printed answer key). |
| `check-label`, `reset-label`, `right-label`, `wrong-label`, `answer-label`, `show-label`, `try-again-label`, `ok-label` | Text, for other languages. `answer-label` is the dialog's title and starts the line naming the right answer. |

## State and messages

`quiz.state` is a plain object, safe to store or send:

```js
{ type: 'choice', selected: [1], checked: false, revealed: false }  // selected: source indices
{ type: 'sort', selected: [], checked: false, revealed: false, placed: [0, null, 1] }  // placed: each item's group, null = pool
{ type: 'match', selected: [], checked: false, revealed: false, placed: [1, null] }    // match: each partner's slot
```

It changes only through `quiz.apply(message)`:

| Message | |
|---|---|
| `{ type: 'quiz-select', index, on }` | Choose or unchoose an item (a radio quiz clears the others). Clears `checked`; choosing what is already chosen changes nothing. |
| `{ type: 'quiz-check' }` | Marks the chosen items right/wrong. A choice quiz opens the answer dialog; sort and match say right or wrong under the groups. |
| `{ type: 'quiz-move', index, to }` | Sort/match: put item `index` in group or slot `to` (null: the pool). Clears `checked`; a move to where the item already is changes nothing. |
| `{ type: 'quiz-reveal' }` | Marks the right items; sort and match place every item in its group or slot. |
| `{ type: 'quiz-reset' }` | Back to the start; closes the dialog. |

Every change fires `quiz-change` (bubbles, composed) with `{ message, state }`, whether it came
from a click or from `apply()`. Setting `quiz.state = saved` restores a state without firing and
without opening the dialog. Indices that aren't an item, group or slot, and anything not of the
right kind, are dropped (as `apply()` ignores them), so a state off the network never throws. `check()`, `reset()`, `reveal()` and `move(index, to)` are shorthands; `correct` and `answer` read
the result and the key. The pure functions (`reduce`, `isCorrect`, `displayOrder`, …) are exported
from `QuizState.ts`.

## Styling

Tokens on the host: `--quiz-color`, `--quiz-background`, `--quiz-border`, `--quiz-accent`,
`--quiz-right`, `--quiz-wrong`, `--quiz-radius`, `--quiz-gap` (and `--group-colour` per group). Parts:
`question`, `items`, `item`, `actions`, `explanation`; sort adds `pool`, `groups`, `group`, `chip`; match `pool`, `pairs`, `pair`, `slot`, `chip`. The buttons are hidden in print.
`--quiz-border` defaults to the text colour at 20%, so it shows on a light or a dark theme.

## Keyboard

The items are native radios/checkboxes (arrows move between radios, Space toggles), and the
buttons and dialog are `juel-button` and `juel-modal` (Escape closes it, and the quiz marks that keydown handled with `preventDefault()`, so
a host that acts on an unhandled Escape, such as the Jollify Player leaving full screen, leaves it alone). A host that uses arrow
keys itself should ignore key events whose composed path holds a `juel-quiz`. **Escape** with
focus in the quiz (no dialog open) lets go of the focus, and is marked handled the same way, so the
host's keys work again (in a Jetty deck, the next → moves on).

Sort and match: the chips are one tab stop (roving `tabindex`). **Ctrl+←/→** (or ↑/↓) picks the
previous/next chip in the order shown; plain arrows move the focused chip, grid-like, between
places. The pool sits above the places. Sort's groups run across: **←/→** step through the pool
and the groups (wrapping round), **↑** goes back to the pool, **↓** from the pool goes to the
first group. Match's slots run down: **↑/↓** step through the pool and the slots, **←** goes back
to the pool, **→** from the pool goes to the first slot. Focus is the pick, so Escape just lets go
of it (as above). The quiz stops the arrow keys from bubbling.

## Tests

- `tests/Quiz/QuizState.test.ts` (Jest): the reducer, the key, the seeded shuffle.
- `tests/Quiz/QuizData.test.ts` (Jest): the JSON island's shape, markup and key, and its errors.
- `tests/e2e/quiz.spec.ts` (Playwright, on `examples/Quiz/quiz.html`): radios and checkboxes,
  the dialog right and wrong, keyboard only, Reset, state round trip, `show-answers`, sort and match by mouse, touch and keyboard, reduced motion, named groups, Tab order, re-rendering when a child is replaced, junk in a set `state`, and quizzes from a JSON island.
