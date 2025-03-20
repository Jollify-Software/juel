import { html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./Toggle.less';
import { ChangedEventArgs } from "../../_Core/Events/ChangedEventArgs";
import { Dispatch } from "../../_Core/DispatchFunction";
import { EventNames } from "../../_Core/Events/EventNames";
import { ToggleEvents } from "./ToggleEvents";
import { InputBase } from "../../_Base/InputBase";
import { when } from "lit/directives/when";

@customElement("juel-toggle")
export class JuelToggle extends InputBase {

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
    content: string = null;
    @property({ type: Boolean })
    custom: boolean = false;

    @property({ type: Number })
    width: number = null;
    @property({ type: Number })
    height: number = null;

    @property({ type: Boolean })
    checked: boolean;

    state: number;

    /**
     *
     */
    constructor() {
      super();
      this.checked = false;
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
      super.firstUpdated(_changedProperties);
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

      if (this.checked) {
        this.classList.remove("unchecked");
        this.classList.add("checked");
      } else {
        this.classList.remove("checked");
        this.classList.add("unchecked");
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
    let checkbox = this.shadowRoot.getElementById("checkbox") as HTMLInputElement;
    checkbox.checked = this.checked;
    if (this.checked) {
      this.classList.remove("unchecked");
      this.classList.add("checked");
    } else {
      this.classList.remove("checked");
      this.classList.add("unchecked");
    }
    let args: ChangedEventArgs = {
      value: this.checked
    }
    Dispatch(this, ToggleEvents.Toggled, args);
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
    if (this.checked) {
      this.classList.remove("unchecked");
      this.classList.add("checked");
    } else {
      this.classList.remove("checked");
      this.classList.add("unchecked");
    }
    let args: ChangedEventArgs = {
      value: this.checked
    }
    Dispatch(this, ToggleEvents.Toggled, args);
    this.requestUpdate();
  }

  toggleClicked(e: Event) {
    super.onClick(e);
    if (this.singular == true) {
      this.singularCheck();
    }
  }

  renderChecked(label: string) {
    return html`<slot name="${this.checked ? 'checked' : 'unchecked'}">${when(label,
      () => html`<button id="trigger">${label}</button`,
      () => html`<span class="${this.rounded  ? 'slider rounded' : 'slider'}"></span>`)}</slot>`;
  }

    render() {
      let labelChecked = this.label;
      let labelUnchecked = this.label;
      if (this.label && this.label.includes(',')) {
        let splity = this.label.split(',');
        labelChecked = splity[0];
        labelUnchecked = splity[1];
      }

        return html`<label class="${this.custom ? 'custom' : 'switch'}" @click="${this.toggleClicked}">
        <input type="checkbox" id="checkbox" .checked=${this.checked} @change="${this.checkChange}">
        ${when(this.checked,
          () => this.renderChecked(labelChecked),
          () => this.renderChecked(labelUnchecked))}
      </label>`;
    }
}