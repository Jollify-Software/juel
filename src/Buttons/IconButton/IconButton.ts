import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./IconButton.less';
import { IconGet } from "../../_Modules/Icons/IconGetFunction";
import { when } from "lit/directives/when";
import { InputBase } from "../../_Base/InputBase";
import { IconExists } from "../../_Modules/Icons/IconExistsFunction";

@customElement('juel-icon-button')
export class CircleIconButton extends InputBase {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    // Icon content for the button
  @property({ type: String })
  icon: string = '';
  
  // Accessible label for the button
  @property({ type: String })
  label: string = 'Button';

  exists: boolean;

  connectedCallback(): void {
    super.connectedCallback();
    this.exists = IconExists(this.icon);
    console.log(this.exists) 
  }

  // Render the button
  render() {
    const styles = this.exists ? `mask-image: var(--icon-${this.icon});` : '';
    const klass = this.getInputClass();

    return html`
      <button @click=${this._handleClick} style="${styles}" class="${klass}" aria-label="${this.label}">
      ${when(this.exists == false, () => html`<span class="icon">${this.icon}</span>`)}
      </button>
    `;
  }

  // Emit a custom event when the button is clicked
  private _handleClick(e) {
    super.onClick(e);
    this.dispatchEvent(new Event('icon-button-click'));
  }
}