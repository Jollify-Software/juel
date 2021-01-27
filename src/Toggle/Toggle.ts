import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import style from 'bundle-text:./Toggle.less';

@customElement("juel-toggle")
export class JuelToggle extends LitElement {

    static styles = unsafeCSS(style);

    @property({ type: Boolean })
    rounded: boolean = false;

    checked: boolean = false;

    firstUpdated() {
      let trigger = this.firstElementChild as HTMLDivElement;
      if (trigger) {
        $(trigger).on('click', () => {
          this.toggle();
        })
      }
    }

  private toggle() {
    this.checked = !this.checked;
    let checkbox = $(this.shadowRoot.getElementById("checkbox"));
    if (this.checked) {
      checkbox.attr('checked', 'checked');
    } else {
      checkbox.removeAttr('checked');
    }
  }

    render() {
        return html`<label class="switch">
        <input type="checkbox" id="checkbox">
        ${
          (this.childElementCount > 0) ? html`<slot></slot>` :
            html`<span class="${this.rounded == false ? 'slider' : 'slider rounded'}"></span>`
        }
      </label>`;
    }
}