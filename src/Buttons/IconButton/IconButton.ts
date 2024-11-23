import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./IconButton.less';

@customElement('juel-icon-button')
export class CircleIconButton extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    // Icon content for the button
  @property({ type: String })
  icon: string = '';

  // Accessible label for the button
  @property({ type: String })
  label: string = 'Button';

  // Render the button
  render() {
    return html`
      <button @click=${this._handleClick} aria-label="${this.label}">
        <span class="icon">${this.icon}</span>
      </button>
    `;
  }

  // Emit a custom event when the button is clicked
  private _handleClick() {
    this.dispatchEvent(new Event('icon-button-click'));
  }
}