import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';

@customElement('juel-email')
export class JuelEmail extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: String }) value = '';

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }

    label {
      display: block;
      margin-bottom: 4px;
      font-weight: bold;
    }

    input {
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    input:focus {
      border-color: #0078d4;
      outline: none;
    }
  `;

  private handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    const changeEvent = new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(changeEvent);
  }

  render() {
    return html`
      ${this.label
        ? html`<label for="email-input">${this.label}</label>`
        : null}
      <input
        id="email-input"
        type="email"
        .value=${this.value}
        @input=${this.handleInput}
      />
    `;
  }
}