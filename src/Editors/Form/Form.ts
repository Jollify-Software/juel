import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface FormField {
  name: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select';
  defaultValue?: string | number;
  options?: string[];
}

interface FormDefinition {
  fields: FormField[];
}

@customElement('juel-form-layout')
export class JuelForm extends LitElement {
  static styles = css`
    form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    label {
      font-weight: bold;
    }
  `;

  @property({ type: Object })
  formDefinition: FormDefinition = { fields: [] };

  private handleSubmit(event: Event) {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const result: Record<string, string | number> = {};
    this.formDefinition.fields.forEach(field => {
      const raw = (formData.get(field.name) as string) ?? '';
      result[field.name] = field.type === 'number' && raw !== '' ? Number(raw) : raw;
    });
    this.dispatchEvent(new CustomEvent('form-submit', { detail: result }));
  }

  private renderField(field: FormField) {
    const value = field.defaultValue ?? '';
    return html`
      <label for="${field.name}">${field.name}</label>
      ${field.type === 'select' && field.options ? html`
        <select name="${field.name}" id="${field.name}">
          ${field.options.map(option => html`<option value="${option}" ?selected="${String(value) === option}">${option}</option>`) }
        </select>
      ` : html`
        <input
          type="${field.type}"
          name="${field.name}"
          id="${field.name}"
          .value="${String(value)}"
        />
      `}
    `;
  }

  render() {
    const fields = this.formDefinition?.fields ?? [];
    return html`
      <form @submit="${this.handleSubmit}">
        ${fields.map(field => this.renderField(field))}
        ${fields.length ? html`<button type="submit">Submit</button>` : ''}
      </form>
    `;
  }
}