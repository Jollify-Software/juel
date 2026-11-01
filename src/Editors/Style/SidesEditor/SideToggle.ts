// The All | Top | Right | Bottom | Left toggle (or All | four corners) shared by juel-sides-editor and
// juel-border-editor: a radio group of small buttons, each with an icon of a square whose chosen side
// (or corner) is drawn heavy, and a dot when that place has a value of its own.
import { css, html, svg } from 'lit';
import { Corners, Sides, type Corner, type Side } from './SidesValue';

export type SidePlace = 'all' | Side;
export type CornerPlace = 'all' | Corner;

const Labels: Record<string, string> = {
  all: 'All', top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left',
  'top-left': 'Top left', 'top-right': 'Top right', 'bottom-right': 'Bottom right', 'bottom-left': 'Bottom left',
};

/** A side's icon: a square outline, the chosen side (all four for All) heavy. */
function sideIcon(place: SidePlace) {
  const on = (side: Side) => place === 'all' || place === side;
  const line = (side: Side, x1: number, y1: number, x2: number, y2: number) =>
    svg`<line x1=${x1} y1=${y1} x2=${x2} y2=${y2} stroke-width=${on(side) ? 2.5 : 1} stroke-opacity=${on(side) ? 1 : 0.45}></line>`;
  return svg`<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round">
    ${line('top', 2, 2, 14, 2)}${line('right', 14, 2, 14, 14)}${line('bottom', 2, 14, 14, 14)}${line('left', 2, 2, 2, 14)}</svg>`;
}

/** A corner's icon: a square with the chosen corner (all four for All) rounded and heavy. */
function cornerIcon(place: CornerPlace) {
  const paths: Record<Corner, string> = {
    'top-left': 'M2 9 V6 Q2 2 6 2 H9', 'top-right': 'M7 2 H10 Q14 2 14 6 V9',
    'bottom-right': 'M14 7 V10 Q14 14 10 14 H7', 'bottom-left': 'M9 14 H6 Q2 14 2 10 V7',
  };
  return svg`<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round">
    ${Corners.map(c => svg`<path d=${paths[c]} stroke-width=${place === 'all' || place === c ? 2.5 : 1} stroke-opacity=${place === 'all' || place === c ? 1 : 0.45}></path>`)}</svg>`;
}

/**
 * The toggle. `value` is the chosen place; `own` the places with a value of their own (marked with
 * a dot); `label` names the group for assistive tech. ← → move the choice, as in a radio group.
 */
export function renderPlaceToggle<P extends string>(options: {
  kind: 'sides' | 'corners';
  value: P;
  own: ReadonlySet<string>;
  label: string;
  onChange: (place: P) => void;
}) {
  const places = ['all', ...(options.kind === 'corners' ? Corners : Sides)] as P[];
  const keydown = (e: KeyboardEvent) => {
    const i = places.indexOf(options.value);
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = places[(i + step + places.length) % places.length];
    options.onChange(next);
    const group = (e.currentTarget as HTMLElement);
    requestAnimationFrame(() => group.querySelector<HTMLElement>(`button[data-place="${next}"]`)?.focus());
  };
  return html`<div class="place-toggle" role="radiogroup" aria-label=${options.label} @keydown=${keydown}>
    ${places.map(place => html`<button type="button" class="place" role="radio" data-place=${place}
      aria-checked=${place === options.value ? 'true' : 'false'} tabindex=${place === options.value ? 0 : -1}
      title=${Labels[place]} aria-label=${Labels[place]} ?data-own=${place !== 'all' && options.own.has(place)}
      @click=${() => options.onChange(place)}>
      ${options.kind === 'corners' ? cornerIcon(place as CornerPlace) : sideIcon(place as SidePlace)}</button>`)}
  </div>`;
}

/** The toggle's styles, for the editors that use it. */
export const placeToggleStyles = css`
  .place-toggle { display: inline-flex; border: 1px solid var(--juel-border, #ced4da); border-radius: var(--juel-radius-sm, 4px); overflow: hidden; }
  .place-toggle button.place {
    position: relative; display: grid; place-items: center; width: 30px; height: 26px; padding: 0; margin: 0;
    border: 0; border-right: 1px solid var(--juel-border, #ced4da); background: var(--juel-surface, #fff);
    color: var(--juel-text, #212529); cursor: pointer;
  }
  .place-toggle button.place:last-child { border-right: 0; }
  .place-toggle button.place:hover { background: var(--juel-hover, #f1f3f5); }
  .place-toggle button.place[aria-checked='true'] { background: var(--juel-selection, #dbe4ff); color: var(--juel-accent, #3b5bdb); }
  .place-toggle button.place:focus-visible { outline: 2px solid var(--juel-accent, #3b5bdb); outline-offset: -2px; }
  .place-toggle button.place[data-own]::after {
    content: ''; position: absolute; right: 3px; top: 3px; width: 4px; height: 4px; border-radius: 50%; background: var(--juel-accent, #3b5bdb);
  }
`;
