import { css } from 'lit';

// Tokens on the host; every one can be set from outside: `--quiz-color`,
// `-background`, `-border`, `-accent`, `-right`, `-wrong`, `-radius`, `-gap`.
export const QuizStyles = css`
    :host {
        --quiz-color: inherit;
        --quiz-background: transparent;
        /* The text colour, faded: shows on a light page and a dark one alike. */
        --quiz-border: color-mix(in srgb, currentColor 20%, transparent);
        --quiz-accent: #2563eb;
        --quiz-right: #15803d;
        --quiz-wrong: #b91c1c;
        --quiz-radius: 8px;
        --quiz-gap: 0.5em;
        display: block;
        color: var(--quiz-color);
        background: var(--quiz-background);
        text-align: start;
    }
    .question { font-weight: 600; margin: 0 0 var(--quiz-gap); }
    .question > :first-child { margin-top: 0; }
    .question > :last-child { margin-bottom: 0; }
    .items { display: flex; flex-direction: column; gap: var(--quiz-gap); margin: 0 0 var(--quiz-gap); padding: 0; border: 0; }
    .item {
        display: flex; align-items: center; gap: 0.6em;
        padding: 0.4em 0.7em; border: 2px solid var(--quiz-border); border-radius: var(--quiz-radius);
        cursor: pointer;
    }
    .item input { accent-color: var(--quiz-accent); width: 1.1em; height: 1.1em; margin: 0; flex: none; }
    .item:focus-within { outline: 2px solid var(--quiz-accent); outline-offset: 2px; }
    .item .text > p { margin: 0; }
    .item .mark { margin-inline-start: auto; font-weight: 700; }
    .item.right { border-color: var(--quiz-right); }
    .item.right .mark { color: var(--quiz-right); }
    .item.wrong { border-color: var(--quiz-wrong); }
    .item.wrong .mark { color: var(--quiz-wrong); }
    .actions { display: flex; gap: var(--quiz-gap); }
    .verdict { font-weight: 700; margin: 0 0 0.5em; }
    .verdict.right { color: var(--quiz-right); }
    .verdict.wrong { color: var(--quiz-wrong); }
    .explanation > :first-child { margin-top: 0; }
    .explanation blockquote { margin: 0; }
    :host([show-answers]) .actions { display: none; }
    @media print { .actions { display: none; } }

    /* Sort: a pool of chips, then a coloured box per group. */
    .pool, .group-items { display: flex; flex-wrap: wrap; gap: var(--quiz-gap); min-height: 2.6em; }
    .pool {
        margin: 0 0 var(--quiz-gap); padding: var(--quiz-gap);
        border: 2px dashed var(--quiz-border); border-radius: var(--quiz-radius);
    }
    .groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(10em, 1fr)); gap: var(--quiz-gap); margin: 0 0 var(--quiz-gap); }
    .group {
        padding: var(--quiz-gap); border: 2px solid var(--group-colour); border-radius: var(--quiz-radius);
        background: color-mix(in srgb, var(--group-colour) 10%, transparent);
    }
    .group-name { font-weight: 600; color: var(--group-colour); margin: 0 0 var(--quiz-gap); }
    .pool.over, .group.over { outline: 3px solid var(--quiz-accent); outline-offset: 2px; }
    .chip {
        display: inline-flex; align-items: center; gap: 0.4em;
        padding: 0.3em 0.7em; border: 2px solid var(--quiz-border); border-radius: var(--quiz-radius);
        background: Canvas; color: CanvasText; cursor: grab; user-select: none; touch-action: none;
    }
    .chip.dragging { cursor: grabbing; position: relative; z-index: 1; pointer-events: none; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); }
    .chip .text > p { margin: 0; }
    .chip.right { border-color: var(--quiz-right); }
    .chip.right .mark { color: var(--quiz-right); }
    .chip.wrong { border-color: var(--quiz-wrong); }
    .chip.wrong .mark { color: var(--quiz-wrong); }
    :host([show-answers]) .chip { cursor: default; }
    /* An answer key places every item, so its pool is always empty: don't draw the box. */
    :host([show-answers]) .pool:empty { display: none; }
    .announce { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

    /* Match: each left entry with a slot beside it for one partner. */
    .pairs { display: grid; grid-template-columns: minmax(6em, max-content) 1fr; gap: var(--quiz-gap); margin: 0 0 var(--quiz-gap); align-items: center; }
    .pair { display: contents; }
    .left { font-weight: 600; }
    .left > p { margin: 0; }
    .slot {
        display: flex; align-items: center; min-height: 2.6em; padding: 0 var(--quiz-gap);
        border: 2px dashed var(--quiz-border); border-radius: var(--quiz-radius);
    }
    .slot.over { outline: 3px solid var(--quiz-accent); outline-offset: 2px; }
`;
