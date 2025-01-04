import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('juel-text')
export class JuelText extends LitElement {
  @property({ type: String }) label: string | undefined;
  @property({ type: String }) value: string = '';

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
    }

    input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }
  `;

  private _onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value }
    }));
  }

  render() {
    return html`
      ${this.label ? html`<label for="text-input">${this.label}</label>` : ''}
      <input id="text-input" type="text" .value="${this.value}" @input="${this._onInput}" />
    `;
  }
}
