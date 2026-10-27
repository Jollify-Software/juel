import { css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators';
import { HandleStyles, renderHandle, trackDrag } from './handleShared';
import { dragAngle, normaliseAngle, type Point } from './handleMath';

/** `handle-rotate`: the angle in degrees, (-180, 180]; `commit` on letting go or for a key. */
export interface HandleRotateDetail { angle: number; commit: boolean }

/**
 * `<juel-rotate-handle>`: a drag handle (↻) that turns something else round its centre. Press it and
 * drag round the centre: `handle-rotate` fires with the angle (the `value` it started at plus the angle
 * swept), `commit: false` while dragging and `commit: true` once on letting go, only if it moved. Shift
 * while dragging snaps to `snap` degrees. The arrow keys turn by `step` (→ / ↑ clockwise), Shift by
 * `bigStep`, each a commit. The centre comes from `center()`, in screen (client) px, so the handle can
 * sit anywhere (a toolbar above the element). See `README.md`.
 */
@customElement('juel-rotate-handle')
export class JuelRotateHandle extends LitElement {
    static styles = [HandleStyles, css``];
    /** Focusing the element focuses its button (so `.focus()` and Tab reach the arrow keys). */
    static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

    /** The current angle in degrees: where a drag or a key starts from. */
    @property({ type: Number }) value = 0;
    /** The centre to turn round, in client px; null: the handle's own centre. */
    @property({ attribute: false }) center: (() => Point | null) | null = null;
    /** Degrees per arrow key. */
    @property({ type: Number }) step = 1;
    /** Degrees per Shift+arrow key. */
    @property({ type: Number, attribute: 'big-step' }) bigStep = 15;
    /** What Shift snaps a drag to, in degrees. */
    @property({ type: Number }) snap = 15;
    @property({ type: String }) label = 'Rotate (drag round, Shift snaps to 15°; or the arrow keys)';
    @property({ type: String }) glyph = 'lucide-rotate-cw';
    @property({ type: Boolean, reflect: true }) disabled = false;

    render() {
        return renderHandle(this.glyph, this.label, this.disabled, this.onPointerDown, this.onKeyDown);
    }

    private ownCenter(): Point {
        const r = this.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }

    private fire(angle: number, commit: boolean) {
        this.dispatchEvent(new CustomEvent<HandleRotateDetail>('handle-rotate', { detail: { angle, commit }, bubbles: true, composed: true }));
    }

    private onPointerDown = (e: PointerEvent) => {
        if (this.disabled || e.button !== 0) return;
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        target.focus();
        const center = this.center?.() ?? this.ownCenter();
        const start = this.value || 0, from = { x: e.clientX, y: e.clientY };
        let moved = false;
        const at = (ev: PointerEvent) => dragAngle(start, center, from, { x: ev.clientX, y: ev.clientY }, ev.shiftKey ? this.snap : 0);
        trackDrag(e, target, ev => { moved = true; this.fire(at(ev), false); }, ev => { if (moved) this.fire(at(ev), true); });
    };

    private onKeyDown = (e: KeyboardEvent) => {
        const sign = ({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 } as Record<string, number>)[e.key];
        if (!sign || this.disabled) return;
        e.preventDefault();
        const angle = normaliseAngle((this.value || 0) + sign * (e.shiftKey ? this.bigStep : this.step));
        this.value = angle;
        this.fire(angle, true);
    };
}

declare global {
    interface HTMLElementTagNameMap { 'juel-rotate-handle': JuelRotateHandle }
}
