import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./Toggle.less';

const CheckChange: string = "check-change";

@customElement("juel-toggle")
export class JuelToggle extends LitElement {

    static styles = unsafeCSS(style);

    defaultWidth = 60;
    defaultHeight = 34;

    @property({ type: Boolean })
    rounded: boolean = false;
    @property({ type: Boolean })
    singular: boolean = false;
    @property({ type: Boolean })
    contained: boolean = false;
    @property({ type: String })
    container: string = ".container";
    @property({ type: String })
    type: string = null;

    @property({ type: String })
    content: string = null;
    @property({ type: Boolean })
    custom: boolean = false;

    @property({ type: Number })
    width: number = null;
    @property({ type: Number })
    height: number = null;

    @property({ type: Boolean })
    checked: boolean = false;

    firstUpdated() {
      let trigger = this.shadowRoot.getElementById('trigger') as HTMLDivElement;

      if (!this.width) {
        this.style.width = `${this.width}px`;
      } else if (trigger) {
        this.style.width = trigger.style.width;
      } else {
        this.style.width = `${this.defaultWidth}px`;
      }
      if (!this.height) {
        this.style.height = `${this.height}px`;
      } else if (trigger) {
        this.style.height = trigger.style.height;
      } else {
        this.style.height = `${this.defaultHeight}px`;
      }

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
    console.log(this.checked)
    var event = new CustomEvent(CheckChange, {
      detail: {
        checked: this.checked
      }
    });
    this.dispatchEvent(event);
  }

  reset() {
    this.checked = false;
    (<HTMLInputElement>this.shadowRoot.getElementById("checkbox")).checked = false;
  }

  private check(index, ele: JuelToggle) {
    if (ele.checked) {
      if ((ele.type != null || this.type != null) && (ele.type != this.type)) {
        return;
      } else {
        ele.toggle();
      }
    }
  }

  private singularCheck() {
    if (this.contained == false) {
      let siblings = $(this).siblings('juel-toggle');
      siblings.each(this.check.bind(this));
    } else {
      $(this).parentsUntil(this.container).parent()
        .find('juel-toggle').not(this).each(this.check.bind(this));
    }
  }

  checkChange(e: Event) {
    let check = e.target as HTMLInputElement;
    this.checked = check.checked;
    var event = new CustomEvent(CheckChange, {
        detail: {
          checked: this.checked
        }
    });
    this.dispatchEvent(event);
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
          (this.custom) ?  html`<slot name="${this.checked ? "checked" : "unchecked"}"></slot>`:
          (this.content) ? html`<button id="trigger">${this.content}</button>` :
            html`<span class="${this.rounded == false ? 'slider' : 'slider rounded'}"></span>`
        }
      </label>`;
    }
}