import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

/**
 * A labelled text field. `value-changed` (bubbling, composed) fires on
 * every edit, and `value-committed` when an edit is done (the native
 * `change`: Enter, or leaving the field) — `change` itself isn't composed,
 * so it doesn't reach listeners on the host. Enter submits the closest
 * form: the inner <input> lives in this element's shadow root, so the
 * browser's own implicit submission can't see a light-DOM form.
 * `rows` above 1 makes it a multi-line field (a textarea), where Enter is a
 * new line; `monospace` for code.
 */
@customElement('juel-text')
export class JuelText extends LitElement {
  @property({ type: String }) label: string | undefined;
  @property({ type: String }) value: string = '';
  @property({ type: String }) type: 'text' | 'url' | 'search' | 'email' | 'tel' | 'password' = 'text';
  @property({ type: String }) placeholder: string | undefined;
  @property({ type: String }) name: string | undefined;
  @property({ type: String }) inputmode: string | undefined;
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** More than 1: a multi-line field (a textarea) this many rows tall. Enter then makes a new line. */
  @property({ type: Number }) rows = 1;
  @property({ type: Boolean }) monospace = false;

  @query('input, textarea') private input!: HTMLInputElement | HTMLTextAreaElement;

  static styles = css`
    :host {
      display: block;
      font: inherit;
    }

    label {
      display: block;
      margin-bottom: var(--text-label-gap, 3px);
      font-size: var(--text-label-size, 0.75rem);
      color: var(--text-label-color, inherit);
    }

    input, textarea {
      width: 100%;
      padding: var(--text-padding, 5px 7px);
      font: inherit;
      color: inherit;
      background: var(--text-background, var(--juel-surface, #fff));
      border: 1px solid var(--border-color, var(--juel-border, #bbb));
      border-radius: var(--juel-radius-sm, 4px);
      box-sizing: border-box;
    }

    textarea {
      display: block;
      resize: vertical;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 0.8125rem;
    }

    input:focus-visible, textarea:focus-visible {
      outline: 2px solid var(--juel-focus, var(--primary, #0d6efd));
      outline-offset: 1px;
    }
  `;

  override focus(options?: FocusOptions) {
    (this.input ?? this).focus(options);
  }

  /** Select the whole value (like HTMLInputElement.select()). */
  select() {
    this.input?.select();
  }

  /** The inner input's validity: e.g. `required` with no value is invalid. */
  checkValidity(): boolean {
    return this.input ? this.input.checkValidity() : true;
  }

  private _onChange() {
    this.dispatchEvent(new CustomEvent('value-committed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  private _onInput(event: Event) {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  private _onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.isComposing || this.rows > 1) return;
    const form = this.closest('form');
    if (!form) return;
    event.preventDefault();
    form.requestSubmit();
  }

  render() {
    if (this.rows > 1) {
      return html`
        ${this.label ? html`<label part="label" for="text-input">${this.label}</label>` : ''}
        <textarea id="text-input" part="input" class=${this.monospace ? 'mono' : ''} rows=${this.rows} .value=${this.value ?? ''}
          placeholder=${ifDefined(this.placeholder)} name=${ifDefined(this.name)} ?required=${this.required} ?disabled=${this.disabled}
          spellcheck=${this.monospace ? 'false' : 'true'}
          aria-label=${ifDefined(this.label ? undefined : this.placeholder)}
          @input=${this._onInput} @change=${this._onChange}></textarea>
      `;
    }
    return html`
      ${this.label ? html`<label part="label" for="text-input">${this.label}</label>` : ''}
      <input id="text-input" part="input" class=${this.monospace ? 'mono' : ''} type=${this.type} .value=${this.value ?? ''}
        placeholder=${ifDefined(this.placeholder)} name=${ifDefined(this.name)}
        inputmode=${ifDefined(this.inputmode as any)} ?required=${this.required} ?disabled=${this.disabled}
        aria-label=${ifDefined(this.label ? undefined : this.placeholder)}
        @input=${this._onInput} @change=${this._onChange} @keydown=${this._onKeydown} />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'juel-text': JuelText }
}
