import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StylePropertyEditorBase } from '../StylePropertyEditorBase';
import { GradientEditorEvents } from './GradientEditorEvents';
import {
  ColorStop,
  GradientKind,
  GradientLayer,
  Layer,
  LayeredGradient,
  defaultGradientLayer,
  insertStop,
  layerToString,
  parseLayeredGradient,
  parsePercent,
  round,
  stringifyLayeredGradient,
} from './GradientValue';

const RADIAL_SIZES = ['closest-side', 'closest-corner', 'farthest-side', 'farthest-corner'];
const LINEAR_SIDES = [
  'to top',
  'to bottom',
  'to left',
  'to right',
  'to top left',
  'to top right',
  'to bottom left',
  'to bottom right',
];
const ANCHORS: [string, string][] = [
  ['left top', '↖'], ['center top', '↑'], ['right top', '↗'],
  ['left center', '←'], ['center', '•'], ['right center', '→'],
  ['left bottom', '↙'], ['center bottom', '↓'], ['right bottom', '↘'],
];

/**
 * `<juel-gradient-editor>` — a visual editor for CSS gradient values
 * (`background-image` by default). Handles a comma-separated **stack** of
 * layers, each a `linear` / `radial` / `conic` gradient (incl. `repeating-*`)
 * or a flat colour. Per layer: a draggable colour-stop track, full geometry
 * controls (angle / `to` side, radial shape+size+position, conic from+at),
 * interpolation hints and double-position stops (preserved through parse).
 * Multi-step undo via {@link StylePropertyEditorBase}.
 */
@customElement('juel-gradient-editor')
export class JuelGradientEditor extends StylePropertyEditorBase {
  static styles = [
    StylePropertyEditorBase.baseStyles,
    css`
      :host {
        display: block;
        font-family: inherit;
        --_border: var(--border-color, #ced4da);
      }
      .se-root {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        width: 320px;
        max-width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--_border);
        border-radius: 8px;
        background: var(--surface, #fff);
      }
      .row {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        flex-wrap: wrap;
      }
      .layers {
        display: flex;
        gap: 0.25rem;
        align-items: center;
        flex-wrap: wrap;
      }
      .layer-swatch {
        width: 30px;
        height: 22px;
        border: 1px solid var(--_border);
        border-radius: 4px;
        padding: 0;
        cursor: pointer;
        background-color: #fff;
      }
      .layer-swatch[data-active] {
        outline: 2px solid var(--primary, #4f46e5);
        outline-offset: 1px;
      }
      .mini {
        width: 1.5rem;
        height: 1.5rem;
        padding: 0;
        font-size: 0.85rem;
        line-height: 1;
        border: 1px solid var(--_border);
        border-radius: 4px;
        background: var(--surface, #fff);
        cursor: pointer;
      }
      .mini:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .bar-wrap {
        position: relative;
        padding-top: 12px;
      }
      .bar {
        height: 28px;
        border: 1px solid var(--_border);
        border-radius: 4px;
        background-image:
          linear-gradient(45deg, #ccc 25%, transparent 25%),
          linear-gradient(-45deg, #ccc 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #ccc 75%),
          linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: 12px 12px;
        background-position: 0 0, 0 6px, 6px -6px, -6px 0;
        cursor: copy;
      }
      .bar-fill {
        width: 100%;
        height: 100%;
        border-radius: 3px;
      }
      .stop-handle {
        position: absolute;
        top: 0;
        width: 12px;
        height: 12px;
        margin-left: -6px;
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
        padding: 0;
        cursor: grab;
      }
      .stop-handle[data-active] {
        transform: scale(1.25);
        z-index: 2;
      }
      .type-btn {
        flex: 1;
        padding: 0.25rem 0;
        font-size: 0.8125rem;
        border: 1px solid var(--_border);
        background: var(--surface, #fff);
        cursor: pointer;
      }
      .type-btn:first-of-type { border-radius: 4px 0 0 4px; }
      .type-btn:last-of-type { border-radius: 0 4px 4px 0; }
      .type-btn + .type-btn { border-left: none; }
      .type-btn[data-active] {
        background: var(--primary, #4f46e5);
        color: #fff;
      }
      input[type='number'], input[type='text'], select {
        font: inherit;
        font-size: 0.8125rem;
        padding: 0.15rem 0.3rem;
        border: 1px solid var(--_border);
        border-radius: 4px;
        min-width: 0;
      }
      input[type='number'] { width: 4.25rem; }
      input[type='text'] { flex: 1; }
      input[type='range'] { flex: 1; min-width: 6rem; }
      .anchors {
        display: grid;
        grid-template-columns: repeat(3, 1.4rem);
        gap: 2px;
      }
      .anchors button {
        width: 1.4rem;
        height: 1.4rem;
        padding: 0;
        border: 1px solid var(--_border);
        background: var(--surface, #fff);
        cursor: pointer;
        font-size: 0.75rem;
      }
      .lbl { font-size: 0.75rem; opacity: 0.7; }
      .grow { flex: 1; }
      .foot { justify-content: space-between; }
    `,
  ];

  @state() private model: LayeredGradient = { layers: [defaultGradientLayer('linear')] };
  @state() private activeLayer = 0;
  @state() private activeStop = -1;

  private dragStop = -1;
  private dragAnchor = '';
  private colorTimer = 0;

  constructor() {
    super();
    this.cssProperty = 'background-image';
    this.property = 'gradient';
  }

  // --- base hooks ---------------------------------------------------------

  protected get seedFallback(): string {
    return 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)';
  }
  protected get changeEventName(): string {
    return GradientEditorEvents.Changed;
  }

  protected parse(value: string): void {
    const m = parseLayeredGradient(value);
    if (m) this.model = m;
    this.activeLayer = Math.min(this.activeLayer, this.model.layers.length - 1);
    const g = this.gLayer();
    this.activeStop = g ? Math.min(this.activeStop, g.stops.length - 1) : -1;
  }

  protected serialize(): string {
    return stringifyLayeredGradient(this.model);
  }

  protected emitChange(reason: string, detail: Record<string, unknown> = {}): void {
    const name =
      reason === 'preview'
        ? GradientEditorEvents.Preview
        : reason === 'cancel'
          ? GradientEditorEvents.Cancelled
          : GradientEditorEvents.Changed;
    this.dispatchEvent(
      new CustomEvent(name, {
        detail: { value: this.value, reason, ...detail },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected onTeardown(): void {
    this.endStopDrag();
    this.flushColor();
  }

  // --- helpers ---------------------------------------------------------

  private gLayer(): GradientLayer | null {
    const l = this.model.layers[this.activeLayer];
    return l && l.type === 'gradient' ? l : null;
  }

  /** Mutate the model in `fn`, then commit one history step. */
  private edit(reason: string, fn: () => void): void {
    this.flushColor();
    fn();
    this.model = { layers: [...this.model.layers] };
    this.commit(reason);
  }

  private flushColor(): void {
    if (this.colorTimer) {
      clearTimeout(this.colorTimer);
      this.colorTimer = 0;
      this.model = { layers: [...this.model.layers] };
      this.commit('stop-color');
    }
  }

  // --- layer ops -----------------------------------------------------

  private selectLayer(i: number): void {
    this.flushColor();
    this.activeLayer = i;
    this.activeStop = -1;
  }
  private addLayer(kind: GradientKind | 'solid'): void {
    this.edit('layer-add', () => {
      const layer: Layer =
        kind === 'solid' ? { type: 'solid', color: '#888888' } : defaultGradientLayer(kind);
      this.model.layers.push(layer);
      this.activeLayer = this.model.layers.length - 1;
      this.activeStop = -1;
    });
  }
  private removeLayer(): void {
    if (this.model.layers.length < 2) return;
    this.edit('layer-remove', () => {
      this.model.layers.splice(this.activeLayer, 1);
      this.activeLayer = Math.max(0, this.activeLayer - 1);
      this.activeStop = -1;
    });
  }
  private moveLayer(dir: -1 | 1): void {
    const i = this.activeLayer;
    const j = i + dir;
    if (j < 0 || j >= this.model.layers.length) return;
    this.edit('layer-move', () => {
      const [l] = this.model.layers.splice(i, 1);
      this.model.layers.splice(j, 0, l);
      this.activeLayer = j;
    });
  }

  // --- stop ops ----------------------------------------------------

  private stopUnit(): string {
    return this.gLayer()?.kind === 'conic' ? 'deg' : '%';
  }
  private handleLeft(s: ColorStop): number {
    const raw = s.pos ?? '';
    if (raw.endsWith('%')) return Math.min(100, Math.max(0, parseFloat(raw)));
    if (/deg$/.test(raw)) return Math.min(100, Math.max(0, (parseFloat(raw) / 360) * 100));
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
  }

  private barPercentFromEvent(e: PointerEvent): number {
    const bar = this.renderRoot.querySelector('.bar') as HTMLElement;
    const r = bar.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
  }

  private onBarPointerDown = (e: PointerEvent): void => {
    if (e.button === 2) return;
    const g = this.gLayer();
    if (!g) return;
    const pct = this.barPercentFromEvent(e);
    const unit = this.stopUnit();
    const val = unit === 'deg' ? `${round((pct / 100) * 360, 1)}deg` : `${round(pct, 2)}%`;
    // Colour: reuse the nearest existing stop's colour.
    const near = g.stops
      .filter((s): s is ColorStop => s.kind === 'stop')
      .sort((a, b) => Math.abs(this.handleLeft(a) - pct) - Math.abs(this.handleLeft(b) - pct))[0];
    this.edit('stop-add', () => {
      const idx = insertStop(g, pct, near ? near.color : '#ffffff');
      (g.stops[idx] as ColorStop).pos = val;
      this.activeStop = idx;
    });
  };

  private onStopPointerDown(e: PointerEvent, index: number): void {
    e.stopPropagation();
    e.preventDefault();
    if (e.button === 2) return;
    this.flushColor();
    this.activeStop = index;
    this.dragStop = index;
    this.dragAnchor = this.value;
    // window-level so the listeners survive the re-renders that previewChange triggers.
    window.addEventListener('pointermove', this.onStopPointerMove);
    window.addEventListener('pointerup', this.onStopPointerUp);
    window.addEventListener('keydown', this.onStopDragKey, true);
  }
  private onStopPointerMove = (e: PointerEvent): void => {
    if (this.dragStop < 0) return;
    const g = this.gLayer();
    if (!g) return;
    const pct = this.barPercentFromEvent(e);
    const s = g.stops[this.dragStop] as ColorStop;
    s.pos = this.stopUnit() === 'deg' ? `${round((pct / 100) * 360, 1)}deg` : `${round(pct, 2)}%`;
    this.model = { layers: [...this.model.layers] };
    this.previewChange();
  };
  private onStopPointerUp = (): void => {
    this.endStopDrag();
    if (this.dragStop < 0) return;
    const g = this.gLayer();
    const moved = g?.stops[this.dragStop];
    this.dragStop = -1;
    if (!g || !moved) return;
    // Re-sort stops by position and keep the selection on the moved one.
    this.edit('stop-move', () => {
      g.stops.sort((a, b) => this.sortKey(a) - this.sortKey(b));
      this.activeStop = g.stops.indexOf(moved);
    });
  };
  private onStopDragKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.dragStop >= 0) {
      e.preventDefault();
      this.endStopDrag();
      this.dragStop = -1;
      this.cancelPreview(this.dragAnchor);
    }
  };
  private endStopDrag(): void {
    window.removeEventListener('pointermove', this.onStopPointerMove);
    window.removeEventListener('pointerup', this.onStopPointerUp);
    window.removeEventListener('keydown', this.onStopDragKey, true);
  }
  private sortKey(s: { kind: string; pos?: string; hint?: string }): number {
    const raw = s.kind === 'hint' ? s.hint : s.pos;
    if (!raw) return -1;
    return /deg$/.test(raw) ? parseFloat(raw) / 3.6 : parsePercent(raw);
  }

  private onStopColor(v: string): void {
    const g = this.gLayer();
    const s = g?.stops[this.activeStop];
    if (!g || !s || s.kind !== 'stop') return;
    s.color = v;
    this.model = { layers: [...this.model.layers] };
    this.previewChange();
    clearTimeout(this.colorTimer);
    this.colorTimer = window.setTimeout(() => {
      this.colorTimer = 0;
      this.commit('stop-color');
    }, 250);
  }
  private onStopPos(e: Event): void {
    const g = this.gLayer();
    const s = g?.stops[this.activeStop];
    if (!g || !s || s.kind !== 'stop') return;
    const n = parseFloat((e.target as HTMLInputElement).value);
    if (!Number.isFinite(n)) return;
    this.edit('stop-pos', () => {
      s.pos = `${n}${this.stopUnit()}`;
    });
  }
  private deleteStop(): void {
    const g = this.gLayer();
    if (!g || this.activeStop < 0) return;
    const stopsOnly = g.stops.filter((s) => s.kind === 'stop');
    if (stopsOnly.length < 3) return;
    this.edit('stop-remove', () => {
      g.stops.splice(this.activeStop, 1);
      this.activeStop = -1;
    });
  }

  // --- geometry ops ------------------------------------------------

  private setKind(kind: GradientKind): void {
    const g = this.gLayer();
    if (!g || g.kind === kind) return;
    this.edit('type', () => {
      const wasConic = g.kind === 'conic';
      g.kind = kind;
      if (kind === 'conic' || wasConic) {
        // % <-> deg positions don't translate; drop them.
        g.stops.forEach((s) => {
          if (s.kind === 'stop') {
            delete s.pos;
            delete s.pos2;
          }
        });
      }
      if (kind === 'linear') {
        g.angle = g.angle ?? '90deg';
        delete g.shape;
        delete g.size;
        delete g.from;
      } else if (kind === 'radial') {
        g.position = g.position ?? 'center';
        g.size = g.size ?? 'farthest-corner';
        delete g.angle;
        delete g.from;
      } else {
        g.from = g.from ?? '0deg';
        g.position = g.position ?? 'center';
        delete g.angle;
        delete g.shape;
        delete g.size;
      }
    });
  }
  private toggleRepeating(): void {
    const g = this.gLayer();
    if (!g) return;
    this.edit('repeating', () => {
      g.repeating = !g.repeating;
    });
  }
  private setAngle(v: string, commit: boolean): void {
    const g = this.gLayer();
    if (!g) return;
    this.flushColor();
    g.angle = v;
    this.model = { layers: [...this.model.layers] };
    if (commit) this.commit('angle');
    else this.previewChange();
  }
  private setFrom(v: string, commit: boolean): void {
    const g = this.gLayer();
    if (!g) return;
    this.flushColor();
    g.from = v;
    this.model = { layers: [...this.model.layers] };
    if (commit) this.commit('from');
    else this.previewChange();
  }
  private setField(key: 'shape' | 'size' | 'position', v: string): void {
    const g = this.gLayer();
    if (!g) return;
    this.edit(key, () => {
      if (v) (g as GradientLayer)[key] = v;
      else delete (g as GradientLayer)[key];
    });
  }
  private setSolidColor(v: string): void {
    const l = this.model.layers[this.activeLayer];
    if (!l || l.type !== 'solid') return;
    l.color = v;
    this.model = { layers: [...this.model.layers] };
    this.previewChange();
    clearTimeout(this.colorTimer);
    this.colorTimer = window.setTimeout(() => {
      this.colorTimer = 0;
      this.commit('solid-color');
    }, 250);
  }

  // --- render ----------------------------------------------------

  private renderLayers() {
    return html`
      <div class="layers">
        ${this.model.layers.map(
          (l, i) => html`<button
            class="layer-swatch"
            ?data-active=${i === this.activeLayer}
            style="background-image:${l.type === 'solid' ? 'none' : layerToString(l)};background-color:${l.type === 'solid' ? l.color : 'transparent'}"
            title="Layer ${i + 1}"
            @click=${() => this.selectLayer(i)}
          ></button>`
        )}
        <button class="mini" title="Move layer up" ?disabled=${this.activeLayer <= 0} @click=${() => this.moveLayer(-1)}>▲</button>
        <button class="mini" title="Move layer down" ?disabled=${this.activeLayer >= this.model.layers.length - 1} @click=${() => this.moveLayer(1)}>▼</button>
        <button class="mini" title="Remove layer" ?disabled=${this.model.layers.length < 2} @click=${() => this.removeLayer()}>✕</button>
        <span class="grow"></span>
        <button class="mini" style="width:auto;padding:0 .35rem" title="Add gradient layer" @click=${() => this.addLayer('linear')}>＋▤</button>
        <button class="mini" style="width:auto;padding:0 .35rem" title="Add solid layer" @click=${() => this.addLayer('solid')}>＋■</button>
      </div>
    `;
  }

  private renderStopTrack(g: GradientLayer) {
    const single = layerToString({ ...g, repeating: false });
    return html`
      <div class="bar-wrap">
        <div class="bar" @pointerdown=${this.onBarPointerDown}>
          <div class="bar-fill" style="background-image:${single}"></div>
        </div>
        ${g.stops.map((s, i) =>
          s.kind === 'stop'
            ? html`<button
                class="stop-handle"
                ?data-active=${i === this.activeStop}
                style="left:${this.handleLeft(s)}%;background:${s.color}"
                title=${s.color + ' ' + (s.pos ?? '')}
                @pointerdown=${(e: PointerEvent) => this.onStopPointerDown(e, i)}
                @click=${() => (this.activeStop = i)}
              ></button>`
            : null
        )}
      </div>
    `;
  }

  private renderStopEditor(g: GradientLayer) {
    const s = g.stops[this.activeStop];
    if (!s || s.kind !== 'stop') {
      return html`<div class="lbl">Click the bar to add a stop, or a handle to edit it.</div>`;
    }
    const stopsOnly = g.stops.filter((x) => x.kind === 'stop').length;
    return html`
      <div class="row">
        <juel-colour .value=${s.color} @value-changed=${(e: CustomEvent) => this.onStopColor(e.detail.value)}></juel-colour>
        <input
          type="number"
          .value=${String(parsePercent(s.pos))}
          step="1"
          @change=${(e: Event) => this.onStopPos(e)}
        />
        <span class="lbl">${this.stopUnit()}</span>
        <button class="mini" style="width:auto;padding:0 .4rem" ?disabled=${stopsOnly < 3} @click=${() => this.deleteStop()}>Delete</button>
      </div>
    `;
  }

  private renderGeometry(g: GradientLayer) {
    const anchorGrid = (cur: string | undefined, set: (v: string) => void) => html`
      <div class="anchors">
        ${ANCHORS.map(
          ([v, glyph]) => html`<button
            title=${v}
            style=${cur === v ? 'outline:2px solid var(--primary,#4f46e5)' : ''}
            @click=${() => set(v)}
          >${glyph}</button>`
        )}
      </div>
    `;

    if (g.kind === 'linear') {
      const deg = /deg$/.test(g.angle ?? '') ? parseFloat(g.angle as string) : 90;
      return html`
        <div class="row">
          <span class="lbl">Angle</span>
          <input type="range" min="0" max="360" .value=${String(deg)}
            @input=${(e: Event) => this.setAngle(`${(e.target as HTMLInputElement).value}deg`, false)}
            @change=${(e: Event) => this.setAngle(`${(e.target as HTMLInputElement).value}deg`, true)} />
          <input type="number" min="0" max="360" .value=${String(deg)}
            @change=${(e: Event) => this.setAngle(`${(e.target as HTMLInputElement).value}deg`, true)} />
          <span class="lbl">deg</span>
        </div>
        <div class="row">
          <span class="lbl">or</span>
          <select @change=${(e: Event) => this.setAngle((e.target as HTMLSelectElement).value, true)}>
            <option value="" ?selected=${!LINEAR_SIDES.includes(g.angle ?? '')}>custom angle</option>
            ${LINEAR_SIDES.map((v) => html`<option value=${v} ?selected=${g.angle === v}>${v}</option>`)}
          </select>
        </div>
      `;
    }

    if (g.kind === 'radial') {
      const customSize = !RADIAL_SIZES.includes(g.size ?? '');
      return html`
        <div class="row">
          <span class="lbl">Shape</span>
          <button class="type-btn" ?data-active=${(g.shape ?? 'ellipse') === 'ellipse'} @click=${() => this.setField('shape', 'ellipse')}>ellipse</button>
          <button class="type-btn" ?data-active=${g.shape === 'circle'} @click=${() => this.setField('shape', 'circle')}>circle</button>
        </div>
        <div class="row">
          <span class="lbl">Size</span>
          <select @change=${(e: Event) => {
            const v = (e.target as HTMLSelectElement).value;
            this.setField('size', v === '__custom' ? '50% 50%' : v);
          }}>
            ${RADIAL_SIZES.map((v) => html`<option value=${v} ?selected=${g.size === v}>${v}</option>`)}
            <option value="__custom" ?selected=${customSize}>custom…</option>
          </select>
          ${customSize
            ? html`<input type="text" .value=${g.size ?? ''} placeholder="e.g. 60% 40%"
                @change=${(e: Event) => this.setField('size', (e.target as HTMLInputElement).value)} />`
            : null}
        </div>
        <div class="row">
          <span class="lbl">Center</span>
          <input type="text" .value=${g.position ?? 'center'} placeholder="at …"
            @change=${(e: Event) => this.setField('position', (e.target as HTMLInputElement).value)} />
          ${anchorGrid(g.position, (v) => this.setField('position', v))}
        </div>
      `;
    }

    // conic
    const from = /deg$/.test(g.from ?? '') ? parseFloat(g.from as string) : 0;
    return html`
      <div class="row">
        <span class="lbl">From</span>
        <input type="range" min="0" max="360" .value=${String(from)}
          @input=${(e: Event) => this.setFrom(`${(e.target as HTMLInputElement).value}deg`, false)}
          @change=${(e: Event) => this.setFrom(`${(e.target as HTMLInputElement).value}deg`, true)} />
        <input type="number" min="0" max="360" .value=${String(from)}
          @change=${(e: Event) => this.setFrom(`${(e.target as HTMLInputElement).value}deg`, true)} />
        <span class="lbl">deg</span>
      </div>
      <div class="row">
        <span class="lbl">Center</span>
        <input type="text" .value=${g.position ?? 'center'} placeholder="at …"
          @change=${(e: Event) => this.setField('position', (e.target as HTMLInputElement).value)} />
        ${anchorGrid(g.position, (v) => this.setField('position', v))}
      </div>
    `;
  }

  protected renderControls() {
    const l = this.model.layers[this.activeLayer];
    const g = this.gLayer();
    return html`
      ${this.renderLayers()}
      ${l && l.type === 'solid'
        ? html`<div class="row">
            <span class="lbl">Colour</span>
            <juel-colour .value=${l.color} @value-changed=${(e: CustomEvent) => this.setSolidColor(e.detail.value)}></juel-colour>
          </div>`
        : g
          ? html`
              <div class="row">
                <button class="type-btn" ?data-active=${g.kind === 'linear'} @click=${() => this.setKind('linear')}>Linear</button>
                <button class="type-btn" ?data-active=${g.kind === 'radial'} @click=${() => this.setKind('radial')}>Radial</button>
                <button class="type-btn" ?data-active=${g.kind === 'conic'} @click=${() => this.setKind('conic')}>Conic</button>
                <label class="lbl" style="display:flex;align-items:center;gap:.2rem;margin-left:.4rem">
                  <input type="checkbox" .checked=${g.repeating} @change=${() => this.toggleRepeating()} /> repeat
                </label>
              </div>
              ${this.renderStopTrack(g)}
              ${this.renderStopEditor(g)}
              ${this.renderGeometry(g)}
            `
          : null}
      <div class="row foot">
        <code class="se-readout" part="readout" style="flex:1">${this.value}</code>
      </div>
    `;
  }
}
