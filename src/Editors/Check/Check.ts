import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';
import { styleMap } from 'lit/directives/style-map';

@customElement('juel-check')
export class JuelCheck extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
    }
    .checkbox-container {
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-container input[type="checkbox"] {
      appearance: none;
      width: 24px;
      height: 24px;
      border: 2px solid #007bff;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }
    .checkbox-container input[type="checkbox"]:checked {
      background-color: #007bff;
      border-color: #007bff;
    }
    .checkbox-container input[type="checkbox"]:checked::after {
      content: '';
      display: block;
      width: 20px;
      height: 20px;
      mask-image: var(--glyph, var(--icon-tick));
      mask-repeat: no-repeat;
      background-color: white;
    }
    .checkbox-container label {
      margin-left: 8px;
      font-size: 14px;
      color: #333;
    }
  `;

  @property({ type: String })
  label = '';
  @property({ type: String })
  glyph;

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
    let style = {};
    if (this.glyph) {
        style['--glyph'] = `var(--icon-${this.glyph})`;
    }

    return html`
      <div class="checkbox-container" style="${styleMap(style)}">
        <input
          id="checkbox"
          type="checkbox"
          .checked="${this.value}"
          @change="${this._onCheckboxChange}"
        />
        ${this.label ? html`<label for="checkbox">${this.label}</label>` : ''}
      </div>
    `;
  }
}