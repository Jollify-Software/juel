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

@customElement('juel-form')
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
      result[field.name] = formData.get(field.name) as string;
    });
    this.dispatchEvent(new CustomEvent('form-submit', { detail: result }));
  }

  private renderField(field: FormField) {
    return html`
      <label for="${field.name}">${field.name}</label>
      ${field.type === 'select' && field.options ? html`
        <select name="${field.name}" id="${field.name}">
          ${field.options.map(option => html`<option value="${option}">${option}</option>`) }
        </select>
      ` : html`
        <input 
          type="${field.type}" 
          name="${field.name}" 
          id="${field.name}" 
          .value="${field.defaultValue || ''}" 
        />
      `}
    `;
  }

  render() {
    return html`
      <form @submit="${this.handleSubmit}">
        ${this.formDefinition && this.formDefinition.fields ? html`${this.formDefinition.fields.map(field => this.renderField(field))}
        <button type="submit">Submit</button>
      </form>` : ``}
    `;
  }
}