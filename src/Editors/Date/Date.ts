import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';

@customElement('juel-date')
export class JuelDate extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #495057;
    }

    input {
      display: block;
      width: 100%;
      padding: 0.375rem 0.75rem;
      font-size: 1rem;
      line-height: 1.5;
      color: #495057;
      background-color: #fff;
      background-clip: padding-box;
      border: 1px solid #ced4da;
      border-radius: 0.25rem;
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }

    input:focus {
      color: #495057;
      background-color: #fff;
      border-color: #80bdff;
      outline: 0;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    input:hover {
      border-color: #86b7fe;
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
