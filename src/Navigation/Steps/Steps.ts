import { html, css, unsafeCSS } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { NavigationBase } from '../NavigationBase';
import { JuelComponent } from '../../_Base/JuelComponent';
import { StepsEvents } from './StepsEvents';
import Styles from 'bundle-text:./Steps.less';

@customElement('juel-step')
export class JuelStep extends JuelComponent {
  @property({ type: String }) label: string = '';
  @property({ type: Boolean, reflect: true }) active: boolean = false;

  static styles = css`
    :host {
      display: none;
    }
    :host([active]) {
      display: block;
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

@customElement('juel-steps')
export class JuelSteps extends NavigationBase {
  @property({ type: Number, attribute: 'total-steps' }) totalSteps: number = 0;
  @property({ type: Number }) current: number = 0;

  @queryAssignedElements({ selector: 'juel-step' })
  private _steps?: NodeListOf<JuelStep>;

  // How far the visitor has actually reached — clicking/tabbing back to an
  // earlier step is allowed, but jumping ahead to one never reached isn't.
  private _furthest: number = 0;

  static styles = unsafeCSS(Styles);

  constructor() {
    super();
    this.ripple = false;
  }

  private get _total(): number {
    return this._steps && this._steps.length > 0 ? this._steps.length : this.totalSteps;
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    this._syncActiveStep();
  }

  private _syncActiveStep() {
    this._steps?.forEach((step, index) => {
      step.active = index === this.current;
    });
  }

  private _handleSlotChange() {
    this.requestUpdate();
  }

  next() {
    this.goTo(this.current + 1);
  }

  previous() {
    this.goTo(this.current - 1);
  }

  goTo(index: number) {
    const total = this._total;
    if (total === 0) return;
    const clamped = Math.max(0, Math.min(index, total - 1));
    if (clamped === this.current) return;

    const previous = this.current;
    this.current = clamped;
    if (this.current > this._furthest) {
      this._furthest = this.current;
    }

    this.dispatchEvent(new CustomEvent(StepsEvents.StepChanged, {
      detail: { current: this.current, previous, total },
    }));
  }

  private _onStepClick(index: number) {
    if (index <= this._furthest) {
      this.goTo(index);
    }
  }

  private _onStepKeydown(e: KeyboardEvent, index: number) {
    if ((e.key === 'Enter' || e.key === ' ') && index <= this._furthest) {
      e.preventDefault();
      this.goTo(index);
    }
  }

  render() {
    const total = this._total;
    const hasSteps = !!this._steps && this._steps.length > 0;
    const indices = Array.from({ length: total }, (_, i) => i);

    return html`
      <ol class="steps-header" role="list">
        ${indices.map((i) => {
          const state = i < this.current ? 'completed' : i === this.current ? 'active' : 'upcoming';
          const reachable = i <= this._furthest;
          const label = hasSteps ? this._steps[i]?.label : '';
          return html`
            <li class="step ${state}">
              <div
                class="circle"
                role="button"
                tabindex="${reachable ? '0' : '-1'}"
                aria-current="${i === this.current ? 'step' : 'false'}"
                aria-disabled="${!reachable}"
                @click="${() => this._onStepClick(i)}"
                @keydown="${(e: KeyboardEvent) => this._onStepKeydown(e, i)}">
                ${state === 'completed' ? html`<span class="check"></span>` : html`${i + 1}`}
              </div>
              ${label ? html`<span class="label">${label}</span>` : ''}
            </li>`;
        })}
      </ol>
      <div class="step-content" ?hidden="${!hasSteps}">
        <slot @slotchange="${this._handleSlotChange}"></slot>
      </div>
    `;
  }
}
