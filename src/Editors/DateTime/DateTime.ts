import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';

@customElement('juel-date-time')
export class JuelDateTime extends LitElement {
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
      padding: 4px;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 3px rgba(0, 123, 255, 0.25);
    }
  `;

  @property({ type: String }) label: string | undefined;
  @property({ type: String }) value: string = '';
  @property({ type: String }) type: 'date' | 'month' | 'time' | 'week' = 'date';

  private handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      ${this.label
        ? html`<label for="input">${this.label}</label>`
        : ''}
      <input
        id="input"
        .value=${this.value}
        @input=${this.handleInput}
        type=${this.type}
      />
    `;
  }
}

// Example usage:
// <date-time-edit label="Select Date" type="date"></date-time-edit>
