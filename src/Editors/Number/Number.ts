import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';

@customElement('juel-number')
export class JuelNumber extends LitElement {
  // CSS styles for the component
  static styles = css`
    :host {
      display: inline-block;
      font-family: Arial, sans-serif;
    }
    label {
      margin-right: 8px;
      font-weight: bold;
    }
    input[type="number"] {
      padding: 4px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  `;

  /**
   * The label to display for the input field.
   */
  @property({ type: String })
  label: string | undefined;

  /**
   * The numeric value of the input field.
   */
  @property({ type: Number })
  value: number = 0;

  private handleInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.value = Number(inputElement.value);
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div>
        ${this.label
          ? html`<label for="number-input">${this.label}</label>`
          : ''}
        <input
          id="number-input"
          type="number"
          .value=${String(this.value)}
          @input=${this.handleInput}
        />
      </div>
    `;
  }
}