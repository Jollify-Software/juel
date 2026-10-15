import { LitElement, html, css, nothing } from 'lit';
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
      display: block;
      margin-bottom: 4px;
      font-size: 0.85em;
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

  /** The input's bounds and step, as on `<input type="number">`. */
  @property({ type: Number }) min?: number;
  @property({ type: Number }) max?: number;
  @property({ type: Number }) step?: number;

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
          min=${this.min ?? nothing}
          max=${this.max ?? nothing}
          step=${this.step ?? nothing}
          @input=${this.handleInput}
        />
      </div>
    `;
  }
}