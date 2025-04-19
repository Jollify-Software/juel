import { html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { property, customElement, state } from "lit/decorators";
import style from 'bundle-text:./Toggle.less';
import { ChangedEventArgs } from "../../_Core/Events/ChangedEventArgs";
import { Dispatch } from "../../_Core/DispatchFunction";
import { EventNames } from "../../_Core/Events/EventNames";
import { ToggleEvents } from "./ToggleEvents";
import { InputBase } from "../../_Base/InputBase";
import { when } from "lit/directives/when";
import { styleMap } from "lit/directives/style-map";
import { ArrayConverter } from "../../_Converters/ArrayConverter";
import { classMap } from "lit/directives/class-map";
import { forwardProperties } from "../../_Directives/ForwardPropertiesDirective";

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
    checked: boolean = false;
    @property({ type: String, converter: ArrayConverter('|') })
    states: string[] = [ 'secondary', 'primary' ];

    @state()
    index: number = 0;

    get currentState() {
        return this.states[this.index];
    }

  private toggle() {
    this.checked = !this.checked; // Optional: Keep checked boolean for backward compatibility
    this.index = (this.index + 1) % this.states.length;
    const currentState = this.states[this.index];
    this.classList.remove(...this.states);
    this.classList.add(currentState);

    const args: ChangedEventArgs = {
      value: currentState
    };
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
    //Dispatch(this, ToggleEvents.Toggled, args);
    //this.requestUpdate();
  }

  toggleClicked(e: Event) {
    e.stopPropagation(); // Prevent event from bubbling up
    super.onClick(e);
    this.toggle();
    if (this.singular == true) {
      this.singularCheck();
    }
  }

  renderChecked(label: string, glyph: string) {
    let style = {};
    if (glyph) {
      style['mask-image'] = `var(--icon-${glyph})`;
      style['mask-repeat'] = 'no-repeat';
      style['mask-position'] = label ? 'left' : 'center';
    }

    return html`<slot name="${this.checked ? 'checked' : 'unchecked'}">${when((!label) && glyph,
      () => html`<juel-icon-button ${this.glyph ? forwardProperties({
        keys : this.glyph.split('|').map((g) => `--icon-${g}`),
      }) : ''} icon="${glyph}"></juel-icon-button>`,
      () => when(label || glyph,
        () => html`<juel-button ${this.glyph ? forwardProperties({
        keys : this.glyph.split('|').map((g) => `--icon-${g}`),
      }) : ''} type="${this.currentState}" label="${label}" glyph="${glyph}" id="trigger">${label}</juel-button`,
        () => html`<span class="${this.rounded  ? 'slider rounded' : 'slider'}"></span>`))}</slot>`;
  }

  render() {
    let label;
    if (this.label && this.label.includes('|')) {
      let splity = this.label.split('|');
      if (this.index >= 0 && this.index < splity.length) {
        label = splity[this.index];
      }
    }

    let glyph;
    if (this.glyph && this.glyph.includes('|')) {
      let splity = this.glyph.split('|');
      if (this.index >= 0 && this.index < splity.length) {
        glyph = splity[this.index];
      }
    }

    let klass = {};
    if (this.checked) {
      klass['checked'] = true;
    } else {
      klass['unchecked'] = true;
    }
    if (this.custom) {
      klass['custom'] = true;
    } else if ((!label) && (!glyph)) {
      klass['switch'] = true;
    }

    return html`<label class="${classMap(klass)}" @click="${this.toggleClicked}">
      ${when(this.checked,
        () => this.renderChecked(label, glyph),
        () => this.renderChecked(label, glyph))}
    </label>`;
  }
}