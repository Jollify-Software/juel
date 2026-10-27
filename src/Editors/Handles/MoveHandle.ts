import { css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators';
import { HandleStyles, renderHandle, trackDrag } from './handleShared';

/** `handle-move`: how far the pointer has gone since the press, in screen px; `commit` on letting go. */
export interface HandleMoveDetail { dx: number; dy: number; commit: boolean }
/** `handle-nudge`: an arrow key (one of dx, dy is ±1, the other 0); `big` with Shift. */
export interface HandleNudgeDetail { dx: number; dy: number; big: boolean }

/**
 * `<juel-move-handle>`: a drag handle (✥) that moves something else. It knows nothing about what it
 * moves: pressing and dragging fires `handle-move` with the distance from the press in screen pixels
 * (`commit: false` while dragging, `commit: true` once on letting go, only if it moved), and the arrow
 * keys fire `handle-nudge` (Shift for a big step). The app turns these into its own units (a CSS
 * `translate`, say). See `README.md`.
 */
@customElement('juel-move-handle')
export class JuelMoveHandle extends LitElement {
    static styles = [HandleStyles, css``];
    /** Focusing the element focuses its button (so `.focus()` and Tab reach the arrow keys). */
    static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

    /** The handle's accessible name and tooltip. */
    @property({ type: String }) label = 'Move (drag, or the arrow keys; Shift for further)';
    /** A Lucide glyph (`lucide-<name>`). */
    @property({ type: String }) glyph = 'lucide-move';
    @property({ type: Boolean, reflect: true }) disabled = false;

    render() {
        return renderHandle(this.glyph, this.label, this.disabled, this.onPointerDown, this.onKeyDown);
    }

    private onPointerDown = (e: PointerEvent) => {
        if (this.disabled || e.button !== 0) return;
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        target.focus();
        const x0 = e.clientX, y0 = e.clientY;
        let moved = false;
        const fire = (ev: PointerEvent, commit: boolean) => this.dispatchEvent(new CustomEvent<HandleMoveDetail>('handle-move',
            { detail: { dx: ev.clientX - x0, dy: ev.clientY - y0, commit }, bubbles: true, composed: true }));
        trackDrag(e, target, ev => { moved = true; fire(ev, false); }, ev => { if (moved) fire(ev, true); });
    };

    private onKeyDown = (e: KeyboardEvent) => {
        const step = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
        if (!step || this.disabled) return;
        e.preventDefault();
        this.dispatchEvent(new CustomEvent<HandleNudgeDetail>('handle-nudge',
            { detail: { dx: step[0], dy: step[1], big: e.shiftKey }, bubbles: true, composed: true }));
    };
}

declare global {
    interface HTMLElementTagNameMap { 'juel-move-handle': JuelMoveHandle }
}
