import { LitElement, html, css, PropertyValues, CSSResultGroup, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RenderStyles } from '../../_Core/RenderStyles';
import { AlertTypes } from '../../_Core/AlertTypes';
import { AlertEvents } from './AlertEvents';
import Styles from 'bundle-text:./Alert.less';

@customElement('juel-alert')
export class JuelAlert extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

  // Alert title
  @property({ type: String }) title: string = '';

  // Whether to show a close button
  @property({ type: Boolean }) closeable: boolean = false;

  // Whether to show an icon (your CSS can style based on this)
  @property({ type: Boolean }) icon: boolean = false;

  @property() type: AlertTypes;
      @property({ attribute: "render-style" }) renderStyle: RenderStyles;

  // Elevation (1-24 like MudBlazor)
  @property({ type: Number }) elevation: number = 0;

  // Dense mode (less padding)
  @property({ type: Boolean }) dense: boolean = false;

  // Internal flag to hide after close
  private _visible: boolean = true;

  private _handleClose() {
    this._visible = false;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent(AlertEvents.Closed));
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!this._visible) {
      this.setAttribute('hidden', '');
    }
    const elevation = Math.min(Math.max(this.elevation, 0), 24);
    this.style.boxShadow = elevation
      ? `0 ${Math.ceil(elevation / 3)}px ${Math.ceil(elevation / 1.5)}px rgba(0, 0, 0, ${(0.1 + elevation * 0.01).toFixed(2)})`
      : '';
  }

  render() {
    if (!this._visible) return html``;

    let klass: string = `alert ${this.type}`;
        if (this.renderStyle) {
            klass += ` ${this.renderStyle}`;
        }
        if (this.dense) {
            klass += ` dense`;
        }

    return html`
      <div class="${klass}" role="alert">
        ${this.icon ? html`<slot name="icon" class="icon-slot"></slot>` : ''}
        <div class="content">
          ${this.title ? html`<div class="title">${this.title}</div>` : ''}
          <slot></slot>
        </div>
        ${this.closeable
          ? html`<button class="close-button" aria-label="Close" @click="${this._handleClose}"></button>`
          : ''}
      </div>
    `;
  }
}