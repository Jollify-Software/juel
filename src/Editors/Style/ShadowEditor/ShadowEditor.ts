import { css, html } from 'lit';
import { PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StylePropertyEditorBase } from '../StylePropertyEditorBase';
import { ShadowEditorEvents } from './ShadowEditorEvents';
import '../../../Buttons/Button/Button';
import {
  Shadow,
  ShadowList,
  defaultShadow,
  num,
  parseShadowList,
  shadowToString,
  splitAlpha,
  stringifyShadowList,
  withAlpha,
} from './ShadowValue';

/**
 * `<juel-shadow-editor>` — a visual editor for CSS `box-shadow` (default
 * `css-property`). Handles a comma-separated stack of shadows, each with
 * `inset`, X / Y offset, blur, spread and a colour + opacity. Drag inside the
 * preview to set the offset. Every edit is one undo step — see
 * {@link StylePropertyEditorBase}.
 *
 * `kind="text"` edits `text-shadow` instead (its default `css-property`): no
 * inset and no spread (text shadows have neither), and the preview is text
 * ("Aa") rather than a box. A stack of shadows works the same.
 */
@customElement('juel-shadow-editor')
export class JuelShadowEditor extends StylePropertyEditorBase {
  static styles = [
    StylePropertyEditorBase.baseStyles,
    css`
      :host {
        display: block;
        font-family: inherit;
        --_border: var(--juel-border, var(--border-color, #ced4da));
      }
      .se-root {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        width: var(--shadow-editor-width, 100%);
        max-width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--_border);
        border-radius: 8px;
        background: var(--juel-surface, var(--surface, #fff));
      }
      .row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .list {
        display: flex;
        gap: 0.25rem;
        align-items: center;
        flex-wrap: wrap;
      }
      /* Buttons are juel-buttons: the chips plain (showing their shadow), the rest light. */
      .chip {
        --button-width: 30px;
        --button-height: 20px;
        --padding: 0;
        --border-radius: 4px;
        --button-border-color: var(--_border);
        --background-color: #fff;
        --hover-background-color: #fff;
      }
      .chip[data-active] {
        outline: 2px solid var(--juel-accent, var(--primary, #4f46e5));
        outline-offset: 1px;
        border-radius: 4px;
      }
      .mini {
        --button-width: 1.5rem;
        --button-height: 1.5rem;
        --padding: 0;
        --font-size: 0.85rem;
      }
      .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0.35rem 0.75rem; }
      .grow { flex: 1; }
      .lbl { font-size: 0.75rem; opacity: 0.7; width: 3.2rem; flex: none; }
      input[type='range'] { flex: 1; min-width: 5rem; }
      input[type='number'] {
        width: 3.75rem;
        font: inherit;
        font-size: 0.8125rem;
        padding: 0.12rem 0.3rem;
        border: 1px solid var(--_border);
        border-radius: 4px;
      }
      .preview-wrap {
        display: grid;
        place-items: center;
        padding: 1.25rem;
        border-radius: 6px;
        background:
          linear-gradient(45deg, #eee 25%, transparent 25%),
          linear-gradient(-45deg, #eee 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #eee 75%),
          linear-gradient(-45deg, transparent 75%, #eee 75%);
        background-size: 14px 14px;
        background-position: 0 0, 0 7px, 7px -7px, -7px 0;
      }
      .preview {
        width: 90px;
        height: 60px;
        border-radius: 8px;
        background: var(--juel-surface, var(--surface, #fff));
        cursor: grab;
        touch-action: none;
      }
      .preview:active { cursor: grabbing; }
      /* kind="text": the preview is text, on no box of its own. */
      .text-preview {
        display: grid;
        place-items: center;
        background: none;
        font-size: 40px;
        font-weight: 700;
        line-height: 1;
        color: var(--juel-text, #212529);
        user-select: none;
      }
      .text-chip { --font-size: 0.85rem; font-weight: 700; }
    `,
  ];

  /** `box` (the default) for `box-shadow`, `text` for `text-shadow`: no inset or spread, an "Aa" preview. */
  @property({ type: String, reflect: true }) kind: 'box' | 'text' = 'box';

  @state() private model: ShadowList = { shadows: [defaultShadow()] };
  @state() private active = 0;

  private dragAnchor = '';
  private dragStart: { px: number; py: number; ox: number; oy: number } | null = null;
  private colorTimer = 0;

  constructor() {
    super();
    this.cssProperty = 'box-shadow';
    this.property = 'shadow';
  }

  protected get seedFallback(): string {
    return this.kind === 'text' ? '1px 2px 4px rgba(0, 0, 0, 0.35)' : '0px 4px 12px rgba(0, 0, 0, 0.25)';
  }

  /** The text kind edits `text-shadow` unless the page named another property. */
  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('kind')) {
      if (this.kind === 'text' && this.cssProperty === 'box-shadow') this.cssProperty = 'text-shadow';
      else if (this.kind !== 'text' && this.cssProperty === 'text-shadow') this.cssProperty = 'box-shadow';
      if (this.kind === 'text') this.dropBoxParts();
    }
  }

  /** Text shadows have no inset or spread: a value pasted from a box shadow loses them. */
  private dropBoxParts(): void {
    if (this.kind !== 'text') return;
    for (const sh of this.model.shadows) { sh.inset = false; sh.spread = '0'; }
  }
  protected get changeEventName(): string {
    return ShadowEditorEvents.Changed;
  }

  protected parse(value: string): void {
    const m = parseShadowList(value);
    if (m) this.model = m;
    this.dropBoxParts();
    this.active = Math.min(this.active, this.model.shadows.length - 1);
    if (this.active < 0) this.active = 0;
  }

  protected serialize(): string {
    return stringifyShadowList(this.model);
  }

  protected emitChange(reason: string, detail: Record<string, unknown> = {}): void {
    const name =
      reason === 'preview'
        ? ShadowEditorEvents.Preview
        : reason === 'cancel'
          ? ShadowEditorEvents.Cancelled
          : ShadowEditorEvents.Changed;
    this.dispatchEvent(
      new CustomEvent(name, {
        detail: { value: this.value, reason, ...detail },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected onTeardown(): void {
    this.endDrag();
    this.flushColor();
  }

  // --- helpers -------------------------------------------------------

  private cur(): Shadow | null {
    return this.model.shadows[this.active] ?? null;
  }
  private touch(): void {
    this.model = { shadows: [...this.model.shadows] };
  }
  private edit(reason: string, fn: () => void): void {
    this.flushColor();
    fn();
    this.touch();
    this.commit(reason);
  }
  private flushColor(): void {
    if (this.colorTimer) {
      clearTimeout(this.colorTimer);
      this.colorTimer = 0;
      this.touch();
      this.commit('color');
    }
  }

  // --- shadow list ops --------------------------------------------

  private select(i: number): void {
    this.flushColor();
    this.active = i;
  }
  private addShadow(): void {
    this.edit('add', () => {
      this.model.shadows.push(this.kind === 'text' ? { ...defaultShadow(), x: '1px', y: '2px', blur: '4px', spread: '0' } : defaultShadow());
      this.active = this.model.shadows.length - 1;
    });
  }
  private removeShadow(): void {
    if (this.model.shadows.length < 2) return;
    this.edit('remove', () => {
      this.model.shadows.splice(this.active, 1);
      this.active = Math.max(0, this.active - 1);
    });
  }
  private moveShadow(dir: -1 | 1): void {
    const j = this.active + dir;
    if (j < 0 || j >= this.model.shadows.length) return;
    this.edit('reorder', () => {
      const [s] = this.model.shadows.splice(this.active, 1);
      this.model.shadows.splice(j, 0, s);
      this.active = j;
    });
  }

  // --- field ops -------------------------------------------------

  private setLen(key: 'x' | 'y' | 'blur' | 'spread', n: number, commit: boolean): void {
    const s = this.cur();
    if (!s) return;
    this.flushColor();
    s[key] = `${n}px`;
    this.touch();
    if (commit) this.commit(key);
    else this.previewChange();
  }
  private toggleInset(): void {
    const s = this.cur();
    if (!s) return;
    this.edit('inset', () => {
      s.inset = !s.inset;
    });
  }
  private setColor(v: string): void {
    const s = this.cur();
    if (!s) return;
    const { alpha } = splitAlpha(s.color || 'rgba(0,0,0,1)');
    s.color = withAlpha(v, alpha);
    this.touch();
    this.previewChange();
    this.queueColorCommit();
  }
  private setAlpha(a: number, commit: boolean): void {
    const s = this.cur();
    if (!s) return;
    const { base } = splitAlpha(s.color || 'rgba(0,0,0,1)');
    s.color = withAlpha(base, a / 100);
    this.touch();
    if (commit) {
      this.flushColor();
      this.commit('opacity');
    } else {
      this.previewChange();
      this.queueColorCommit();
    }
  }
  private queueColorCommit(): void {
    clearTimeout(this.colorTimer);
    this.colorTimer = window.setTimeout(() => {
      this.colorTimer = 0;
      this.commit('color');
    }, 250);
  }

  // --- preview drag (offset) ------------------------------------

  private onPreviewPointerDown = (e: PointerEvent): void => {
    if (e.button === 2) return;
    const s = this.cur();
    if (!s) return;
    e.preventDefault();
    this.flushColor();
    this.dragAnchor = this.value;
    this.dragStart = { px: e.clientX, py: e.clientY, ox: num(s.x), oy: num(s.y) };
    window.addEventListener('pointermove', this.onPreviewPointerMove);
    window.addEventListener('pointerup', this.onPreviewPointerUp);
    window.addEventListener('keydown', this.onDragKey, true);
  };
  private onPreviewPointerMove = (e: PointerEvent): void => {
    const s = this.cur();
    if (!s || !this.dragStart) return;
    const nx = clamp(this.dragStart.ox + (e.clientX - this.dragStart.px), -100, 100);
    const ny = clamp(this.dragStart.oy + (e.clientY - this.dragStart.py), -100, 100);
    s.x = `${Math.round(nx)}px`;
    s.y = `${Math.round(ny)}px`;
    this.touch();
    this.previewChange();
  };
  private onPreviewPointerUp = (): void => {
    this.endDrag();
    if (this.dragStart) {
      this.dragStart = null;
      this.commit('offset');
    }
  };
  private onDragKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.dragStart) {
      e.preventDefault();
      this.endDrag();
      this.dragStart = null;
      this.cancelPreview(this.dragAnchor);
    }
  };
  private endDrag(): void {
    window.removeEventListener('pointermove', this.onPreviewPointerMove);
    window.removeEventListener('pointerup', this.onPreviewPointerUp);
    window.removeEventListener('keydown', this.onDragKey, true);
  }

  // --- render --------------------------------------------------

  private slider(
    label: string,
    key: 'x' | 'y' | 'blur' | 'spread',
    min: number,
    max: number
  ) {
    const s = this.cur();
    const v = s ? num(s[key]) : 0;
    return html`
      <div class="row">
        <span class="lbl">${label}</span>
        <input
          type="range"
          min=${min}
          max=${max}
          .value=${String(v)}
          @input=${(e: Event) => this.setLen(key, +(e.target as HTMLInputElement).value, false)}
          @change=${(e: Event) => this.setLen(key, +(e.target as HTMLInputElement).value, true)}
        />
        <input
          type="number"
          .value=${String(v)}
          @change=${(e: Event) => this.setLen(key, +(e.target as HTMLInputElement).value, true)}
        />
      </div>
    `;
  }

  protected renderControls() {
    const s = this.cur();
    const alphaPct = s ? Math.round(splitAlpha(s.color || 'rgba(0,0,0,1)').alpha * 100) : 100;
    const base = s ? splitAlpha(s.color || 'rgba(0,0,0,1)').base : '#000000';
    return html`
      <div class="list">
        ${this.model.shadows.map(
          (sh, i) => this.kind === 'text'
            ? html`<juel-button
            type="plain"
            class="chip text-chip"
            ?data-active=${i === this.active}
            style="text-shadow:${shadowToString({ ...sh, x: half(sh.x), y: half(sh.y), blur: half(sh.blur) })}"
            title="Shadow ${i + 1}"
            button-label="Shadow ${i + 1}"
            @click=${() => this.select(i)}
          >A</juel-button>`
            : html`<juel-button
            type="plain"
            class="chip"
            ?data-active=${i === this.active}
            style="--button-box-shadow:${shadowToString({ ...sh, x: half(sh.x), y: half(sh.y), blur: half(sh.blur), spread: half(sh.spread) })}"
            title="Shadow ${i + 1}"
            button-label="Shadow ${i + 1}"
            @click=${() => this.select(i)}
          ></juel-button>`
        )}
        <juel-button type="plain" class="mini" glyph="lucide-chevron-up" title="Move up" button-label="Move up" ?disabled=${this.active <= 0} @click=${() => this.moveShadow(-1)}></juel-button>
        <juel-button type="plain" class="mini" glyph="lucide-chevron-down" title="Move down" button-label="Move down" ?disabled=${this.active >= this.model.shadows.length - 1} @click=${() => this.moveShadow(1)}></juel-button>
        <juel-button type="plain" class="mini" action="remove" glyph="lucide-trash-2" title="Remove this one" button-label="Remove" ?disabled=${this.model.shadows.length < 2} @click=${() => this.removeShadow()}></juel-button>
        <span class="grow"></span>
        <juel-button type="plain" class="mini" action="add" glyph="lucide-plus" title="Add another shadow" button-label="Add shadow" @click=${() => this.addShadow()}></juel-button>
      </div>

      <div class="preview-wrap">
        ${this.kind === 'text'
          ? html`<div
          class="preview text-preview"
          style="text-shadow:${this.value === 'none' ? '' : this.value}"
          @pointerdown=${this.onPreviewPointerDown}
          title="Drag to set the offset"
        >Aa</div>`
          : html`<div
          class="preview"
          style="box-shadow:${this.value === 'none' ? '' : this.value}"
          @pointerdown=${this.onPreviewPointerDown}
          title="Drag to set the offset"
        ></div>`}
      </div>

      ${this.kind === 'text' ? '' : html`<label class="row inset" style="font-size:.8125rem">
        <input type="checkbox" .checked=${!!s?.inset} @change=${() => this.toggleInset()} />
        inset
      </label>`}

      <div class="sliders">
        ${this.slider('Offset X', 'x', -50, 50)}
        ${this.slider('Offset Y', 'y', -50, 50)}
        ${this.slider('Blur', 'blur', 0, 100)}
        ${this.kind === 'text' ? '' : this.slider('Spread', 'spread', -50, 50)}
      </div>

      <div class="row">
        <span class="lbl">Colour</span>
        <juel-colour .value=${base} @value-changed=${(e: CustomEvent) => this.setColor(e.detail.value)}></juel-colour>
        <input
          type="range"
          min="0"
          max="100"
          .value=${String(alphaPct)}
          @input=${(e: Event) => this.setAlpha(+(e.target as HTMLInputElement).value, false)}
          @change=${(e: Event) => this.setAlpha(+(e.target as HTMLInputElement).value, true)}
        />
        <span class="lbl" style="width:2.5rem">${alphaPct}%</span>
      </div>

      <div class="row">
        <code class="se-readout" part="readout" style="flex:1">${this.value}</code>
      </div>
    `;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
/** Scale a length down for the tiny list-chip previews. */
function half(len: string): string {
  return `${num(len) / 2}px`;
}
