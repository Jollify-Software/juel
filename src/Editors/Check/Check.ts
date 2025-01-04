import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';

@customElement('juel-check')
export class JuelCheck extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }
    label {
      margin-right: 8px;
    }
  `;

  @property({ type: String })
  label = '';

  @property({ type: Boolean, reflect: true })
  value = false;

  private _onCheckboxChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.checked;
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
          ? html`<label for="checkbox">${this.label}</label>`
          : ''}
        <input
          id="checkbox"
          type="checkbox"
          .checked="${this.value}"
          @change="${this._onCheckboxChange}"
        />
      </div>
    `;
  }
}