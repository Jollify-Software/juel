// <juel-quiz>: a question with choices, Check, and an answer dialog with the
// explanation. The question, items and explanation are light-DOM markup; the
// answer key is a `data-` attribute, apart from what's shown. See
// src/Quiz/README.md.
//
//   <juel-quiz data-answer="1">
//     <p>Which planet is the largest?</p>
//     <ul><li>Mars</li><li>Jupiter</li><li>Venus</li></ul>
//     <blockquote>Jupiter is more than twice the mass of all the others together.</blockquote>
//   </juel-quiz>
//
// The state is a small object changed only by messages (`apply()`), and every
// change fires `quiz-change`, so a host can keep several screens in step.
import { LitElement, PropertyValues, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { QuizStyles } from './QuizStyles';
import { QuizMessage, QuizState, QuizType, displayOrder, hashSeed, initialState, isCorrect, marks, parseAnswer, placesItems, reduce } from './QuizState';
import { PointerDrag } from './Drag';
import { QuizSource, readQuizData } from './QuizData';
import type { JuelModal } from '../Dialog/Modal/Modal';
import '../Dialog/Modal/Modal';
import '../Buttons/Button/Button';

/** Detail of `quiz-change`: the message applied and the state after it. */
export interface QuizChangeDetail {
    message: QuizMessage;
    state: QuizState;
}

let instances = 0;

@customElement('juel-quiz')
export class JuelQuiz extends LitElement {

    static styles = QuizStyles;

    /** The kind of quiz: `choice`, `sort` (items into groups) or `match` (partners beside entries). */
    @property({ reflect: true }) type: QuizType = 'choice';
    /** The shuffle's seed; by default a hash of the question text, so every screen agrees. */
    @property() seed: string;
    /** Keep the items in source order. */
    @property({ type: Boolean, attribute: 'no-shuffle' }) noShuffle = false;
    /** Mark the right items (e.g. a printed answer key). Hides the buttons. */
    @property({ type: Boolean, reflect: true, attribute: 'show-answers' }) showAnswers = false;
    /** Text of the buttons and the dialog. */
    @property({ attribute: 'check-label' }) checkLabel = 'Check';
    @property({ attribute: 'reset-label' }) resetLabel = 'Reset';
    @property({ attribute: 'right-label' }) rightLabel = 'Right!';
    @property({ attribute: 'wrong-label' }) wrongLabel = 'Not quite.';
    @property({ attribute: 'answer-label' }) answerLabel = 'The answer';
    @property({ attribute: 'show-label' }) showLabel = 'Show the answer';
    @property({ attribute: 'try-again-label' }) tryAgainLabel = 'Try again';
    @property({ attribute: 'ok-label' }) okLabel = 'OK';

    @state() private current: QuizState = initialState();
    @state() private parts = 0; // bumped when the light DOM changes

    @query('juel-modal') private modal!: JuelModal;
    private readonly name = `juel-quiz-${++instances}`;
    private drag?: PointerDrag;
    /** Sort and match: the chip that's the quiz's one tab stop (source index). */
    @state() private focusIndex = -1;
    /** Read out by screen readers after a keyboard move. */
    @state() private announcement = '';

    /** The state: a plain object, safe to store or send. Setting it doesn't open the dialog. */
    get state(): QuizState {
        const { placed } = this.current;
        return { ...this.current, selected: [...this.current.selected], ...(placed ? { placed: [...placed] } : {}) };
    }
    set state(value: QuizState) {
        const count = this.items.length, places = this.groups.length;
        const base = initialState(this.type, count);
        // It may come off the network (a console, a remote): what isn't an item, group or slot is
        // dropped, as `reduce` ignores it. With no items yet, any index is kept for when they come.
        const isIndex = (v: unknown, below: number) => Number.isInteger(v) && (v as number) >= 0 && (count === 0 || (v as number) < below);
        const selected = Array.isArray(value?.selected) ? [...new Set(value.selected.filter(i => isIndex(i, count)))].sort((a, b) => a - b) : [];
        const next: QuizState = { ...base, ...value, type: this.type, selected, checked: value?.checked === true, revealed: value?.revealed === true };
        const placed = Array.isArray(value?.placed) ? value.placed : [];
        if (base.placed) next.placed = base.placed.map((_, i) => isIndex(placed[i], places) ? placed[i] : null);
        else delete next.placed;
        this.current = next;
    }

    /** The answer key: source indices of the right items. */
    get answer(): number[] {
        const island = this.island();
        return island && !this.hasAttribute('data-answer') ? [...island.answer] : parseAnswer(this.dataset.answer);
    }

    /** More than one right item: checkboxes, not radios. */
    get multiple(): boolean {
        return new Set(this.answer).size > 1;
    }

    /** The items' light-DOM elements, in source order: the choices, or what's dragged (match: the partners). */
    get items(): HTMLLIElement[] {
        return listItems(this.type === 'match'
            ? this.source.querySelector(':scope > [data-partners]')
            : this.source.querySelector(':scope > ul:not([data-groups], [data-partners]), :scope > ol:not([data-groups], [data-partners])'));
    }

    /**
     * Where items are put, in source order: sort's groups (`<ol data-groups>`),
     * or match's left column (the list that isn't `[data-partners]`).
     */
    get groups(): HTMLLIElement[] {
        if (this.type === 'sort') return listItems(this.source.querySelector(':scope > [data-groups]'));
        if (this.type === 'match') return listItems(this.source.querySelector(':scope > ul:not([data-partners]), :scope > ol:not([data-partners])'));
        return [];
    }

    /**
     * Sort and match: each item's right place. Sort's `data-answer` is that
     * already; match's says, for each left entry, which partner is its own, so
     * it's turned round here.
     */
    private get placeKey(): number[] {
        const answer = this.answer;
        if (this.type !== 'match') return answer;
        return this.items.map((_, p) => { const s = answer.indexOf(p); return s < 0 ? -1 : s; });
    }

    /**
     * The key Check marks against. Items written the same (two left entries
     * both `= mammal`, or one item in two sort groups) can't be told apart, so
     * between them they need only fill their places, in any order.
     */
    private get checkKey(): number[] {
        const key = [...this.placeKey];
        const placed = this.current.placed ?? [];
        const twins = new Map<string, number[]>();
        this.items.forEach((li, i) => {
            const text = li.innerHTML.trim();
            twins.set(text, [...(twins.get(text) ?? []), i]);
        });
        for (const same of twins.values()) {
            if (same.length < 2) continue;
            const places = same.map(i => key[i]); // what these items fill between them
            const rest: number[] = [];
            for (const i of same) {
                const at = places.indexOf(placed[i] ?? -2);
                if (at >= 0) key[i] = places.splice(at, 1)[0];
                else rest.push(i);
            }
            rest.forEach((i, n) => key[i] = places[n]);
        }
        return key;
    }

    /** Is the current choice right? */
    get correct(): boolean {
        return isCorrect(this.current, placesItems(this.type) ? this.checkKey : this.answer);
    }

    /** Apply a message (`quiz-select`, `quiz-move`, `quiz-check`, `quiz-reveal`, `quiz-reset`) and fire `quiz-change`. */
    apply(message: QuizMessage): void {
        const next = reduce(this.current, message, this.multiple, this.items.length, this.groups.length, this.placeKey);
        if (next === this.current) return;
        const slide = message.type === 'quiz-reveal' && placesItems(this.type) ? this.measureChips() : null;
        this.current = next;
        if (slide) this.updateComplete.then(slide); // after the render this change schedules
        if (message.type === 'quiz-check' && !placesItems(this.type)) this.updateComplete.then(() => this.modal?.open());
        if (message.type === 'quiz-reset') this.modal?.close();
        this.dispatchEvent(new CustomEvent<QuizChangeDetail>('quiz-change', {
            detail: { message, state: this.state },
            bubbles: true,
            composed: true,
        }));
    }

    /**
     * Escape closes the answer dialog and counts as handled (preventDefault),
     * so a host that acts on an unhandled Escape (a player leaving full
     * screen) doesn't act on this one too.
     */
    private onDialogKey = (e: KeyboardEvent): void => {
        if (e.key !== 'Escape' || e.defaultPrevented || !this.modal?.opened) return;
        e.preventDefault();
        this.modal.close();
    };

    /**
     * Escape with focus inside the quiz (and no dialog open) lets go of the
     * focus, so a host's keys work again: in a Jetty deck the next → moves on.
     * Marked handled, like the dialog's Escape.
     */
    private onEscape = (e: KeyboardEvent): void => {
        if (e.key !== 'Escape' || e.defaultPrevented || this.modal?.opened) return;
        let focused = (this.renderRoot as ShadowRoot).activeElement as HTMLElement | null;
        if (!focused) return;
        while (focused.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement as HTMLElement;
        e.preventDefault();
        focused.blur();
    };

    /** Check the answer: marks the items and opens the answer dialog. */
    check(): void { this.apply({ type: 'quiz-check' }); }
    /** Clear the choice and close the dialog. */
    reset(): void { this.apply({ type: 'quiz-reset' }); }
    /** Show the answer: sort moves every item to its group. */
    reveal(): void { this.apply({ type: 'quiz-reveal' }); }
    /** Sort and match: move item `index` (source order) to group or slot `to`, or back to the pool (null). */
    move(index: number, to: number | null): void { this.apply({ type: 'quiz-move', index, to }); }

    /**
     * FLIP: note where each chip is now; the function returned, run after the
     * next render, slides each from there to its new place. Null when the user
     * prefers less motion.
     */
    private measureChips(): (() => void) | null {
        if (!this.isConnected || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
        const chips = () => Array.from(this.renderRoot.querySelectorAll<HTMLElement>('.chip[data-index]'));
        const before = new Map(chips().map(c => [c.dataset.index, c.getBoundingClientRect()]));
        return () => {
            for (const chip of chips()) {
                const from = before.get(chip.dataset.index);
                if (!from) continue;
                const to = chip.getBoundingClientRect();
                const dx = from.left - to.left, dy = from.top - to.top;
                if (!dx && !dy) continue;
                chip.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                    { duration: 400, easing: 'ease-in-out' });
            }
        };
    }

    /**
     * Where the question, lists and explanation are read from: the light DOM, or,
     * when it has no list, the quiz built from a `<script type="application/json">`
     * island (QuizData.ts).
     */
    private get source(): Element {
        return this.island()?.root ?? this;
    }

    /** Whether the page wrote `type` (read before the first render reflects the default). */
    private authoredType = false;

    connectedCallback(): void {
        if (!this.hasUpdated) this.authoredType = this.hasAttribute('type');
        super.connectedCallback();
    }

    private islandCache?: { text: string; source: (QuizSource & { root: HTMLElement }) | null };
    /** The island last warned about for disagreeing with the page's `type`. */
    private typeWarned?: QuizSource;

    /** The JSON island's quiz, when the light DOM has no list of its own; null otherwise (or when it's bad: a warning). */
    private island(): (QuizSource & { root: HTMLElement }) | null {
        const script = this.querySelector<HTMLScriptElement>(':scope > script[type="application/json"]');
        if (!script || this.querySelector(':scope > ul, :scope > ol')) return null;
        const text = script.textContent ?? '';
        if (this.islandCache?.text === text) return this.islandCache.source;
        const read = readQuizData(text);
        let source: (QuizSource & { root: HTMLElement }) | null = null;
        if ('error' in read) console.warn(`juel-quiz: ${read.error}`, this);
        else {
            const root = document.createElement('div');
            root.innerHTML = read.html;
            source = { ...read, root };
        }
        this.islandCache = { text, source };
        return source;
    }

    private question(): Element | null {
        return Array.from(this.source.children).find(el => !el.matches('ul, ol, blockquote, script, template')) ?? null;
    }

    private explanation(): Element | null {
        return this.source.querySelector(':scope > blockquote');
    }

    private order(): number[] {
        const seed = this.seed != null && this.seed !== '' ? hashSeed(this.seed) : hashSeed(this.question()?.textContent?.trim() ?? '');
        return displayOrder(this.items.length, seed, !this.noShuffle);
    }

    /** Copies of light-DOM content for the shadow tree; the originals stay as written. */
    private copy(el: Element | null): Node[] {
        return el ? Array.from(el.childNodes).map(n => n.cloneNode(true)) : [];
    }

    private onChange(index: number, e: Event) {
        this.apply({ type: 'quiz-select', index, on: (e.target as HTMLInputElement).checked });
    }

    protected willUpdate(_changed: PropertyValues): void {
        // A quiz from data says its own type, unless the element does.
        const island = this.island();
        if (island && !this.authoredType) this.type = island.type;
        else if (island && island.type !== this.type && this.typeWarned !== island) {
            this.typeWarned = island; // once per island, not on every update
            console.warn(`juel-quiz: type="${this.type}" but the quiz data is a ${island.type} quiz, so it plays as ${this.type}; leave out type`, this);
        }
        // The type, or the number of items (the light DOM changed), no longer fits the state: start again.
        const count = this.items.length;
        if (this.current.type !== this.type || (this.current.placed && this.current.placed.length !== count))
            this.current = initialState(this.type, count);
    }

    protected firstUpdated(): void {
        this.addEventListener('keydown', this.onEscape);
        this.drag = new PointerDrag({
            root: this.renderRoot as ShadowRoot,
            onDrop: (index, to) => this.move(index, to),
            enabled: () => placesItems(this.type) && !this.showAnswers && !this.current.revealed,
        });
    }

    render() {
        void this.parts;
        if (placesItems(this.type)) return this.renderPlaces();
        const items = this.items;
        const answer = new Set(this.answer);
        const marked = this.showAnswers || this.current.revealed;
        const { selected, checked } = this.current;
        const right = this.correct;
        const kind = this.multiple ? 'checkbox' : 'radio';
        return html`
            <slot hidden @slotchange=${() => this.parts++}></slot>
            <div class="question" part="question" id="q">${this.copy(this.question())}</div>
            <div class="items" part="items" role=${this.multiple ? 'group' : 'radiogroup'} aria-labelledby="q">
                ${this.order().map(i => {
                    const on = selected.includes(i);
                    const isAnswer = answer.has(i);
                    const cls = marked ? (isAnswer ? 'right' : '') : checked && on ? (isAnswer ? 'right' : 'wrong') : '';
                    const mark = cls === 'right' ? '✓' : cls === 'wrong' ? '✗' : '';
                    return html`<label class="item ${cls}" part="item" data-index=${i}>
                        <input type=${kind} name=${this.name} .checked=${on} ?disabled=${this.showAnswers}
                            @change=${(e: Event) => this.onChange(i, e)}>
                        <span class="text">${this.copy(items[i])}</span>
                        ${mark ? html`<span class="mark" aria-label=${cls === 'right' ? 'right' : 'wrong'}>${mark}</span>` : nothing}
                    </label>`;
                })}
            </div>
            ${this.showAnswers && this.explanation() ? html`<div class="explanation" part="explanation">${this.copy(this.explanation())}</div>` : nothing}
            <div class="actions" part="actions">
                <juel-button class="check" label=${this.checkLabel} ?disabled=${selected.length === 0}
                    @click=${() => this.check()}></juel-button>
                <juel-button class="reset" type="plain" label=${this.resetLabel} @click=${() => this.reset()}></juel-button>
            </div>
            <juel-modal label=${this.answerLabel} @keydown=${this.onDialogKey}>
                <p class="verdict ${right ? 'right' : 'wrong'}">${right ? this.rightLabel : this.wrongLabel}</p>
                ${right ? nothing : html`<p class="key">${this.answerLabel}: ${[...answer].sort((a, b) => a - b).map(i => items[i]?.textContent?.trim()).join(', ')}</p>`}
                <div class="explanation" part="explanation">${this.copy(this.explanation())}</div>
                <!-- No autofocus: juel-modal focuses OK anyway (the only control), and the
                     attribute is a console error in a cross-origin frame (the app's preview). -->
                <juel-button slot="buttons" class="ok" label=${this.okLabel} @click=${() => this.modal.close('ok')}></juel-button>
            </juel-modal>`;
    }

    /**
     * The keyboard scheme for sort and match: Ctrl+arrows pick the previous or
     * next item (in the order shown); plain arrows move the picked item,
     * grid-like, between places. The pool sits above the places; sort's groups
     * run across (←/→ step through the pool and the groups, ↑ goes back to the
     * pool, ↓ from the pool goes to the first group) and match's slots run down
     * (↑/↓ step through the pool and the slots, ← goes back to the pool, → from
     * the pool goes to the first slot).
     */
    private onChipKey(index: number, e: KeyboardEvent) {
        const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
        if (!back && e.key !== 'ArrowRight' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        e.stopPropagation();
        const chips = Array.from(this.renderRoot.querySelectorAll<HTMLElement>('.chip[data-index]'));
        if (e.ctrlKey || e.metaKey) {
            const at = chips.findIndex(c => Number(c.dataset.index) === index);
            chips[(at + (back ? -1 : 1) + chips.length) % chips.length]?.focus();
            return;
        }
        if (this.showAnswers || this.current.revealed) return;
        const count = this.groups.length;
        const now = this.current.placed?.[index] ?? null;
        const vertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
        const along = vertical === (this.type === 'match'); // the axis the places run along
        let to: number | null;
        if (along) {
            const step = (now === null ? -1 : now) + (back ? -1 : 1); // -1 is the pool
            to = step < -1 ? count - 1 : step >= count ? null : step === -1 ? null : step;
        } else if (back) {
            to = null; // ↑ (sort) or ← (match): back to the pool
        } else {
            if (now !== null || count === 0) return; // ↓ / → only leaves the pool
            to = 0;
        }
        if (to === now) return;
        this.move(index, to);
        const name = (el?: Element) => el?.textContent?.trim() ?? '';
        this.announcement = `${name(this.items[index])}: ${to === null ? 'not placed' : name(this.groups[to])}`;
        this.updateComplete.then(() =>
            this.renderRoot.querySelector<HTMLElement>(`.chip[data-index="${index}"]`)?.focus());
    }

    /** Sort and match: the pool of items still to place, then a box per group, or a slot beside each left entry. */
    private renderPlaces() {
        const items = this.items;
        const groups = this.groups;
        const answer = this.placeKey;
        const shown = this.showAnswers || this.current.revealed;
        const placed = shown ? items.map((_, i) => (answer[i] ?? -1) >= 0 ? answer[i] : null) : (this.current.placed ?? []);
        const mark = this.current.checked && !shown ? marks(this.current, this.checkKey) : [];
        const order = this.order();
        const tabStop = order.includes(this.focusIndex) ? this.focusIndex : order[0];
        const chip = (i: number) => {
            const m = shown ? 'right' : mark[i] ?? '';
            return html`<div class="chip ${m}" part="chip" data-drag=${i} data-index=${i} role="button"
                    tabindex=${i === tabStop ? 0 : -1} @keydown=${(e: KeyboardEvent) => this.onChipKey(i, e)}
                    @focus=${() => this.focusIndex = i}>
                <span class="text">${this.copy(items[i])}</span>
                ${m ? html`<span class="mark" aria-label=${m}>${m === 'right' ? '✓' : '✗'}</span>` : nothing}
            </div>`;
        };
        const at = (place: number | null) => order.filter(i => (placed[i] ?? null) === place).map(chip);
        const right = this.correct;
        const places = this.type === 'match'
            ? html`<div class="pairs" part="pairs">
                ${groups.map((g, k) => html`<div class="pair" part="pair">
                    <div class="left" id="left-${k}">${this.copy(g)}</div>
                    <div class="slot" part="slot" data-drop=${k} role="group" aria-labelledby="left-${k}">${at(k)}</div>
                </div>`)}
            </div>`
            : html`<div class="groups" part="groups">
                ${groups.map((g, k) => html`<div class="group" part="group" data-drop=${k}
                        role="group" aria-labelledby="group-${k}"
                        style="--group-colour: ${g.dataset.colour || PALETTE[k % PALETTE.length]}">
                    <div class="group-name" id="group-${k}">${this.copy(g)}</div>
                    <div class="group-items">${at(k)}</div>
                </div>`)}
            </div>`;
        return html`
            <slot hidden @slotchange=${() => this.parts++}></slot>
            <div class="question" part="question" id="q">${this.copy(this.question())}</div>
            <div class="pool" part="pool" data-drop="pool">${at(null)}</div>
            <div class="announce" aria-live="polite">${this.announcement}</div>
            ${places}
            ${this.current.checked && !shown
                ? html`<p class="verdict ${right ? 'right' : 'wrong'}" role="status">${right ? this.rightLabel : this.wrongLabel}</p>`
                : nothing}
            ${shown && this.explanation() ? html`<div class="explanation" part="explanation">${this.copy(this.explanation())}</div>` : nothing}
            <div class="actions" part="actions">
                <juel-button class="check" label=${this.checkLabel} ?disabled=${shown || placed.every(p => p === null)}
                    @click=${() => this.check()}></juel-button>
                <juel-button class="show" type="plain" label=${this.showLabel} ?disabled=${shown}
                    @click=${() => this.reveal()}></juel-button>
                <juel-button class="reset" type="plain" label=${this.tryAgainLabel} @click=${() => this.reset()}></juel-button>
            </div>`;
    }
}

/** Group colours when a group has no `data-colour`. */
const PALETTE = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2'];

function listItems(list: Element | null): HTMLLIElement[] {
    return list ? Array.from(list.children).filter((el): el is HTMLLIElement => el instanceof HTMLLIElement) : [];
}

declare global {
    interface HTMLElementTagNameMap { 'juel-quiz': JuelQuiz }
}
