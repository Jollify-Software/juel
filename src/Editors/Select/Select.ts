import { LitElement, html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import '../../Buttons/Button/Button';

@customElement('juel-select')
export class JuelSelect extends LitElement {
  @property({ type: String }) label: string = '';
  // Leaves the label's words off the page (a select in a title bar, say); they still name the list for a screen reader.
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel: boolean = false;
  // An attribute value is JSON when it parses as JSON (value='{"id":1}',
  // value="3"), else a plain string (value="tea"); Lit's own Object
  // converter would turn a plain string into null.
  @property({
    converter: {
      fromAttribute: (v: string | null) => {
        if (v === null) return null;
        try { return JSON.parse(v); } catch { return v; }
      },
      toAttribute: (v: any) => typeof v === 'string' ? v : JSON.stringify(v),
    },
  }) value: any = null;
  @property({ type: Array }) data: Array<any> = [];
  @property({ type: Boolean, attribute: "enable-search" }) enableSearch: boolean = false;
  @property({ type: String, attribute: "text-field" }) textField: string = 'text';
  @property({ type: String, attribute: "value-field" }) valueField: string = 'value';
  @property({ type: String, attribute: "children-field" }) childrenField: string = 'children';
  // An item field holding a style for its option (e.g. a font list in each
  // font). Unset: options are unstyled, as before.
  @property({ type: String, attribute: "style-field" }) styleField: string | undefined;
  @property({ type: String }) placeholder: string = '-- Select an option --';
  // Shows a Clear button next to the list. Off by default: the empty
  // (placeholder) option already clears a value.
  @property({ type: Boolean }) clearable: boolean = false;
  @property({ type: String }) name: string | undefined;
  // One of the options must be chosen: no placeholder, so "-- Select an option --" isn't offered as a choice
  // (a list that always has a value, as "Which package" does). With an empty value nothing shows as chosen.
  @property({ type: Boolean, reflect: true }) required: boolean = false;

  @state() private searchTerm: string = '';
  @state() private filteredData: Array<any> = [];
  private searchSubject = new Subject<string>();

  @query('select') selectElement!: HTMLSelectElement;

  static styles = css`
    :host {
      display: inline-block;
      font: inherit;
    }

    label {
      display: block;
      margin-bottom: var(--select-label-gap, 3px);
      font-size: var(--select-label-size, 0.75rem);
    }

    .row {
      display: flex;
      align-items: center;
      gap: 0.5em;
    }

    input {
      width: calc(100% - 2em);
      padding: 0.5em;
      margin-bottom: 0.5em;
      font-size: 1em;
      border: 1px solid var(--juel-border, #ccc);
      background: var(--juel-surface, Field);
      color: var(--juel-text, FieldText);
      border-radius: var(--juel-radius-sm, 4px);
      box-sizing: border-box;
    }

    select {
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
      padding: var(--select-padding, 5px 7px);
      font: inherit;
      color: inherit;
      background: var(--select-background, var(--juel-surface, #fff));
      border: 1px solid var(--border-color, var(--juel-border, #bbb));
      border-radius: var(--juel-radius-sm, 4px);
      box-sizing: border-box;
    }

    select:focus {
      outline: none;
      border-color: var(--juel-focus, #0078d4);
      box-shadow: 0 0 3px rgba(0, 120, 212, 0.5);
    }

    .clear-button {
      --padding: var(--select-padding, 5px 7px);
      --font-size: inherit;
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
    // The placeholder option's value is '' (not JSON): it means no value.
    // An option whose own value is '' or null (see emptyOption) reports that value.
    this.value = selectedOption && selectedOption.value !== '' ? JSON.parse(selectedOption.value) : null;
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  // New data (a select reused for another list): the options follow it,
  // through the search in force.
  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('data') && this.isConnected) this.filterData();
  }

  // Set the select's value after its options have rendered: bound in the
  // template it would be applied before the options exist, and an option's
  // `selected` attribute stops counting once the user has picked one.
  protected updated() {
    if (!this.selectElement) return;
    const empty = this.value === null || this.value === undefined || this.value === '';
    const own = this.emptyOption();
    this.selectElement.value = !empty ? JSON.stringify(this.value) : own ? JSON.stringify(own.value) : '';
    // Required, with no value and no option for none: nothing chosen, rather than the first option seeming to be.
    if (empty && !own && this.required) this.selectElement.selectedIndex = -1;
  }

  /**
   * The first option whose own value is empty ('' or null), as "The top level" or "Automatic" is: it
   * stands for no value, so it's shown when the value is empty, and the placeholder is left out.
   * (Before 2026-11-12 the placeholder always came first and hid that option's words.)
   */
  private emptyOption(): { value: '' | null } | undefined {
    const find = (items: Array<Record<string, unknown>>): { value: '' | null } | undefined => {
      for (const item of items ?? []) {
        if (item && this.childrenField in item && Array.isArray(item[this.childrenField])) {
          const inner = find(item[this.childrenField] as Array<Record<string, unknown>>);
          if (inner) return inner;
        } else if (item && (item[this.valueField] === '' || item[this.valueField] === null)) return { value: item[this.valueField] as '' | null };
      }
      return undefined;
    };
    return find(this.data);
  }

  override focus(options?: FocusOptions) {
    (this.selectElement ?? this).focus(options);
  }

  private handleClear() {
    this.value = null;
    const own = this.emptyOption();
    this.selectElement.value = own ? JSON.stringify(own.value) : '';
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
          <option value='${JSON.stringify(item[this.valueField])}' ?selected="${JSON.stringify(this.value) === JSON.stringify(item[this.valueField])}"
            style=${ifDefined(this.styleField ? item[this.styleField] : undefined)}>
            ${item[this.textField]}
          </option>
        `;
      }
    });
  }

  render() {
    let data = this.filteredData.length > 0 ? this.filteredData : this.data;

    return html`
      ${this.label && !this.hideLabel
        ? html`<label for="select-element">${this.label}</label>`
        : ''}
      ${this.enableSearch
        ? html`<input
            type="text"
            placeholder="Search..."
            @input="${this.handleInputChange}"
          />`
        : ''}
      <div class="row" part="row">
        <select
          id="select-element"
          part="select"
          name=${this.name ?? ''}
          ?required=${this.required}
          aria-label=${ifDefined(this.label && this.hideLabel ? this.label : undefined)}
          @change="${this.handleChange}"
        >
          ${this.emptyOption() || this.required ? '' : html`<option value="" ?selected="${this.value === null || this.value === undefined || this.value === ''}">${this.placeholder}</option>`}
          ${data.length > 0
            ? this.renderOptionsList(data)
            : html`<option disabled>No matches found</option>`}
        </select>
        ${this.clearable ? html`<juel-button type="light" class="clear-button" part="clear" label="Clear" @click="${this.handleClear}"></juel-button>` : ''}
      </div>
    `;
  }
}
