import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

/**
 * A labelled single-line text field. `value-changed` (bubbling, composed)
 * fires on every edit; the native `input`/`change` events are composed, so
 * they reach listeners on the host too. Enter submits the closest form —
 * the inner <input> lives in this element's shadow root, so the browser's
 * own implicit submission can't see a light-DOM form.
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

  @query('input') private input!: HTMLInputElement;

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

    input {
      width: 100%;
      padding: var(--text-padding, 5px 7px);
      font: inherit;
      color: inherit;
      background: var(--text-background, #fff);
      border: 1px solid var(--border-color, #bbb);
      border-radius: 4px;
      box-sizing: border-box;
    }

    input:focus-visible {
      outline: 2px solid var(--primary, #0d6efd);
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

  private _onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  private _onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.isComposing) return;
    const form = this.closest('form');
    if (!form) return;
    event.preventDefault();
    form.requestSubmit();
  }

  render() {
    return html`
      ${this.label ? html`<label part="label" for="text-input">${this.label}</label>` : ''}
      <input id="text-input" part="input" type=${this.type} .value=${this.value ?? ''}
        placeholder=${ifDefined(this.placeholder)} name=${ifDefined(this.name)}
        inputmode=${ifDefined(this.inputmode as any)} ?required=${this.required} ?disabled=${this.disabled}
        aria-label=${ifDefined(this.label ? undefined : this.placeholder)}
        @input=${this._onInput} @keydown=${this._onKeydown} />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'juel-text': JuelText }
}
