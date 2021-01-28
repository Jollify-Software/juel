import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import style from 'bundle-text:./Toggle.less';

@customElement("juel-toggle")
export class JuelToggle extends LitElement {

    static styles = unsafeCSS(style);

    @property({ type: Boolean })
    rounded: boolean = false;
    @property({ type: Boolean })
    singular: boolean = false;
    @property({ type: Boolean })
    contained: boolean = false;
    @property({ type: String })
    container: string = ".container";

    checked: boolean = false;

    firstUpdated() {
      let trigger = this.firstElementChild as HTMLDivElement;
      if (trigger) {
        $(trigger).on('click', () => {
          this.toggle();
          if (this.singular == true) {
            this.singularCheck();
          }
        })
      }
    }

  private toggle() {
    this.checked = !this.checked;
    let checkbox = $(this.shadowRoot.getElementById("checkbox"));
    checkbox.prop('checked', this.checked);
  }

  private singularCheck() {
    if (this.contained == false) {
      let siblings = $(this).siblings('juel-toggle');
      siblings.each((index, ele: JuelToggle) => {
        if (ele.checked) {
          ele.toggle();
        }
      });
    } else {
      $(this).parentsUntil(this.container).parent()
        .find('juel-toggle').not(this).each((index, ele: JuelToggle) => {
          if (ele.checked) {
            ele.toggle();
          }
        });
    }
  }

  checkChange(e: Event) {
    let check = e.target as HTMLInputElement;
    this.checked = check.checked;
  }

  toggleClicked(e: Event) {
    if (this.singular == true) {
      this.singularCheck();
    }
  }

    render() {
        return html`<label class="switch" @click="${this.toggleClicked}">
        <input type="checkbox" id="checkbox" @change="${this.checkChange}">
        ${
          (this.childElementCount > 0) ? html`<slot></slot>` :
            html`<span class="${this.rounded == false ? 'slider' : 'slider rounded'}"></span>`
        }
      </label>`;
    }
}