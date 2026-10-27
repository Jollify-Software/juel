import { css, html } from 'lit';
import { styleMap } from 'lit/directives/style-map';
import { lucideIcon } from '../../_Modules/Icons/Lucide';

/** The look both handles share: a small square tool button, like a plain `juel-button` with a glyph. */
export const HandleStyles = css`
    :host { display: inline-flex; touch-action: none; }
    :host([disabled]) { opacity: .45; pointer-events: none; }
    .handle { display: inline-flex; align-items: center; justify-content: center; width: var(--handle-size, 30px);
        height: var(--handle-size, 30px); padding: 0; border: 0; border-radius: var(--juel-radius, 6px); background: transparent;
        color: inherit; cursor: grab; touch-action: none; }
    .handle:hover { background: var(--juel-hover, rgba(127, 127, 127, .15)); }
    .handle:active { cursor: grabbing; }
    .handle:focus-visible { outline: 2px solid var(--juel-accent, #3b6fd8); outline-offset: 1px; }
    .icon { width: 18px; height: 18px; background: currentColor; -webkit-mask: var(--icon) center / contain no-repeat;
        mask: var(--icon) center / contain no-repeat; }
`;

/**
 * Follow a drag that began with `down` on `target` until the pointer is let go. A transparent cover
 * goes over the whole window for the drag: without it, moves over an iframe (an app's preview) go to
 * the iframe's document and never arrive here, even with pointer capture. `onMove` gets every move;
 * `onUp` the last event (a pointerup, or a pointercancel). The cover goes on `document.body`, so a
 * transformed ancestor (an anchored toolbar) can't shrink it.
 */
export function trackDrag(down: PointerEvent, target: HTMLElement, onMove: (e: PointerEvent) => void, onUp: (e: PointerEvent) => void) {
    try { target.setPointerCapture(down.pointerId); } catch { /* a synthetic or ended pointer: the cover still catches it */ }
    const cover = document.createElement('div');
    cover.setAttribute('data-juel-drag-cover', '');
    cover.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:grabbing;touch-action:none;background:transparent';
    document.body.appendChild(cover);
    const move = (e: PointerEvent) => { if (e.pointerId === down.pointerId) onMove(e); };
    const up = (e: PointerEvent) => {
        if (e.pointerId !== down.pointerId) return;
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', up, true);
        cover.remove();
        onUp(e);
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
}

/** The handle's button: its glyph as a masked icon (currentColor), the label as its name and tooltip. */
export function renderHandle(glyph: string, label: string, disabled: boolean,
    onPointerDown: (e: PointerEvent) => void, onKeyDown: (e: KeyboardEvent) => void) {
    const icon = lucideIcon(glyph);
    return html`<button type="button" class="handle" part="handle" title=${label} aria-label=${label} ?disabled=${disabled}
        @pointerdown=${onPointerDown} @keydown=${onKeyDown}><span class="icon" aria-hidden="true"
        style=${styleMap(icon ? { '--icon': `url("${icon}")` } : {})}></span></button>`;
}
