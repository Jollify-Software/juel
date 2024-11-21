import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./TextEdit.less';

@customElement("juel-text")
export class JuelText extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

  // Properties
  @property({ type: String }) value: string = ""; // The value of the input
  @property({ type: String }) placeholder: string = "Enter text"; // Placeholder text
  @property({ type: Boolean }) disabled: boolean = false; // Disabled state
  @property({ type: Boolean }) required: boolean = false; // Required state

// Event handler for input changes
private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(new CustomEvent("value-changed", { detail: { value: this.value } }));
  }

  render() {
    return html`
      <div class="input-container">
        <input
          type="text"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?required=${this.required}
          @input=${this.handleInput}
        />
      </div>
    `;
  }
}