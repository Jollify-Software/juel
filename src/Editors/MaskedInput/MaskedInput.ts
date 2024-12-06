import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./MaskedInput.less';

@customElement('juel-masked-input')
export class JuelMaskedInput extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

  // Mask property (e.g., "XX-XX-XX" or "99999999")
  @property({ type: String }) mask: string = '';
  
  // Value of the input
  @property({ type: String }) value: string = '';

// Handles input and applies mask
private handleInput(e: InputEvent): void {
  const input = e.target as HTMLInputElement;
  let rawValue = input.value.replace(/[^a-zA-Z0-9]/g, ''); // Remove non-alphanumeric characters
  const mask = this.mask;
  let maskedValue = '';

  let rawIndex = 0;
  for (const char of mask) {
    if (rawIndex >= rawValue.length) break;

    if (char === 'X') {
      if (/[a-zA-Z]/.test(rawValue[rawIndex])) {
        maskedValue += rawValue[rawIndex++];
      } else {
        break;
      }
    } else if (char === '9') {
      if (/[0-9]/.test(rawValue[rawIndex])) {
        maskedValue += rawValue[rawIndex++];
      } else {
        break;
      }
    } else {
      maskedValue += char;
    }
  }

  this.value = maskedValue;
  this.requestUpdate();
  this.dispatchEvent(new CustomEvent('value-change', { detail: this.value }));
}

render() {
  return html`
    <input
      .value="${this.value}"
      @input="${this.handleInput}"
      placeholder="${this.mask.replace(/X/g, 'A').replace(/9/g, '0')}"
    />
  `;
}

}