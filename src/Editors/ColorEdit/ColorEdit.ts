import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./ColorEdit.less';
import { EventNames } from "../../_Core/Events/EventNames";
import { JuelComponent } from "../../_Base/JuelComponent";
import { ChangedEventArgs } from "../../_Core/Events/ChangedEventArgs";

@customElement('juel-color-edit')
export class JuelColorEdit extends JuelComponent {

  static styles?: CSSResultGroup = unsafeCSS(Styles);

  @property({ type: String }) value: string = '#ffffff'; // Default color

  private handleColorChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    let args: ChangedEventArgs = {
      value: this.value
    };
    this.fire(EventNames.Changed, args);
  }

  render() {
    return html`
      <div class="color-picker">
        <div
          class="color-preview"
          style="--selected-color: ${this.value}"
        ></div>
        <input
          type="color"
          .value="${this.value}"
          @input="${this.handleColorChange}"
        />
        <input
          type="text"
          .value="${this.value}"
          @input="${this.handleColorChange}"
        />
      </div>
    `;
  }
}