import { LitElement, html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@customElement('juel-select')
export class JuelSelect extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: Object }) value: any = null;
  @property({ type: Array }) data: Array<any> = [];
  @property({ type: Boolean, attribute: "enable-search" }) enableSearch: boolean = false;
  @property({ type: String, attribute: "text-field" }) textField: string = 'text';
  @property({ type: String, attribute: "value-field" }) valueField: string = 'value';
  @property({ type: String, attribute: "children-field" }) childrenField: string = 'children';
  @property({ type: String }) placeholder: string = '-- Select an option --';

  @state() private searchTerm: string = '';
  @state() private filteredData: Array<any> = [];
  private searchSubject = new Subject<string>();

  @query('select') selectElement!: HTMLSelectElement;

  static styles = css`
    :host {
      display: inline-block;
      font-family: Arial, sans-serif;
    }

    label {
      display: block;
      margin-bottom: 0.5em;
      font-weight: bold;
    }

    input {
      width: calc(100% - 2em);
      padding: 0.5em;
      margin-bottom: 0.5em;
      font-size: 1em;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }

    select {
      width: calc(100% - 2em);
      padding: 0.5em;
      font-size: 1em;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }

    select:focus {
      outline: none;
      border-color: #0078d4;
      box-shadow: 0 0 3px rgba(0, 120, 212, 0.5);
    }

    .clear-button {
      margin-left: 0.5em;
      padding: 0.5em;
      font-size: 1em;
      background-color: #f5f5f5;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
    }

    .clear-button:hover {
      background-color: #e0e0e0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.filteredData = JSON.parse(JSON.stringify(this.data));

    // Subscribe to search input changes with debounce
    this.searchSubject.pipe(debounceTime(300)).subscribe(term => {
      this.searchTerm = term.toLowerCase();
      this.filterData();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.searchSubject.unsubscribe(); // Clean up the subscription
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.searchSubject.next(target.value || ''); // Push input value into the subject
  }

  private handleChange() {
    const selectedOption = this.selectElement.selectedOptions[0];
    this.value = selectedOption ? JSON.parse(selectedOption.value) : null;
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  private handleClear() {
    this.value = null;
    this.selectElement.value = '';
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  private filterData() {
    const matches = (item: any) => {
      return Object.keys(item).some(key => {
        if (key === this.childrenField && Array.isArray(item[key])) {
          item[key] = item[key].filter(matches);
          return item[key].length > 0;
        } else {
          return String(item[key]).toLowerCase().includes(this.searchTerm);
        }
      });
    };
    this.filteredData = JSON.parse(JSON.stringify(this.data)).filter(matches);
  }

  private renderOptionsList(data: Array<any>) {
    return data.map(item => {
      if (this.childrenField in item && Array.isArray(item[this.childrenField])) {
        return html`
          <optgroup label="${item[this.textField]}">
            ${this.renderOptionsList(item[this.childrenField])}
          </optgroup>
        `;
      } else {
        return html`
          <option value='${JSON.stringify(item[this.valueField])}' ?selected="${JSON.stringify(this.value) === JSON.stringify(item[this.valueField])}">
            ${item[this.textField]}
          </option>
        `;
      }
    });
  }

  render() {
    let data = this.filteredData.length > 0 ? this.filteredData : this.data;

    return html`
      ${this.label
        ? html`<label for="select-element">${this.label}</label>`
        : ''}
      ${this.enableSearch
        ? html`<input
            type="text"
            placeholder="Search..."
            @input="${this.handleInputChange}"
          />`
        : ''}
      <div style="display: flex; align-items: center;">
        <select
          id="select-element"
          @change="${this.handleChange}"
          .value="${JSON.stringify(this.value) || ''}"
        >
          <option value="" ?selected="${!this.value}">${this.placeholder}</option>
          ${data.length > 0
            ? this.renderOptionsList(data)
            : html`<option disabled>No matches found</option>`}
        </select>
        <button class="clear-button" @click="${this.handleClear}">Clear</button>
      </div>
    `;
  }
}
