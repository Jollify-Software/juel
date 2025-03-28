import { createPopper, Instance } from "@popperjs/core";
import { property } from "lit/decorators";
import { RippleEffect } from "../_Utils/RippleEffect";
import { JuelComponent } from "./JuelComponent";
import { createRef } from 'lit/directives/ref'
import { CSSResultGroup, html, PropertyValues, unsafeCSS } from "lit";
import { RenderStyles } from '../_Core/RenderStyles';
import { AlertTypes } from '../_Core/AlertTypes';
import { InputTypes } from '../_Templates/InputTypes';
import { bind } from "../_Utils/Bind";
import { when } from "lit/directives/when";
import { classMap } from "lit/directives/class-map";

export class InputBase extends JuelComponent {

    static InputElementNames: string = "juel-text, juel-memo, juel-range, juel-tickbox, juel-radio";

    ///static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property() value: any;
    @property() type: AlertTypes;
    @property({ attribute: "render-style" }) renderStyle: RenderStyles;
    @property({ type: Boolean }) addonActive: boolean;
    @property() label: string;
    @property() glyph: string;
    @property({ type: Boolean, attribute: "hide-label" })
    hideLabel: boolean;
    @property() name: string;
    @property({ type: Boolean }) active: boolean;
    @property({ attribute: "label-position" }) labelPosition: string;

    inputType: InputTypes;

    input = createRef<HTMLInputElement>();
    $this: JQuery<HTMLElement>;

    dropdownShown: boolean = false;
    dropdown: Instance;

    hasPrepend: boolean;
    hasAppend: boolean;
    hasDropdown: boolean;

    isRipple: string;

    constructor() {
        super();
        this.type = AlertTypes.Primary;
        this.renderStyle = RenderStyles.Default;
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        super.firstUpdated();
        RippleEffect.init(this.shadowRoot);
        this.$this = $(this);
        this.addEventListener("keyup", e => {
            if (e.key == "Enter") {
                this.nextOrSubmit();
            }
        });
        /*if (this.input.value) {
            this.input.value.focus();
        }*/
    }

    @bind
    nextOrSubmit() {
        let next = this.$this.nextAll(InputBase.InputElementNames);
        if (next.length == 0) {
            let steps = this.closest("juel-steps") as any;
            if (steps) {
                steps.next();
                (<any>$).tabNext();
            } else {
                let frm = this.closest("form") as HTMLFormElement;
                if (frm && 'requestSubmit' in frm) {
                    frm.requestSubmit();
                } else if (frm) {
                    frm.submit();
                }
            }
        } else {
            (<any>$).tabNext();
        }
    }

    focus(options?: FocusOptions): void {
        if (this.input.value) {
            this.input.value.focus();
        } else {
            super.focus(options);
        }
    }

    onClick(e: Event) {
        RippleEffect.createRipple(e as MouseEvent);
    }

    //#region " Dropdown "

    prependSlotChange(e: Event) {
        let slot = e.target as HTMLSlotElement;
        let assigned = slot.assignedNodes();
        if (assigned.length > 0 && (!this.hasPrepend)) {
            this.hasPrepend = true;
            this.requestUpdate();
        }
    }

    appendSlotChange(e: Event) {
        let slot = e.target as HTMLSlotElement;
        let assigned = slot.assignedNodes();
        if (assigned.length > 0 && (!this.hasAppend)) {
            this.hasAppend = true;
            this.requestUpdate();
        }
    }

    dropdownSlotChange(e: Event) {
        let slot = e.target as HTMLSlotElement;
        let assigned = slot.assignedNodes();
        if (assigned.length > 0 && (!this.hasDropdown)) {
            this.hasDropdown = true;
            this.requestUpdate();
        }
    }

    @bind
    toggleDropdown() {
        var items = this.shadowRoot.querySelector('slot[name="dropdown"]') as HTMLElement;
        if (this.dropdownShown == false) {
            this.dropdown = createPopper(
                this.shadowRoot.querySelector('#dropdown-toggle'),
                items,
                {
                    placement: "bottom-end"
                }
            );
            items.style.display = "initial";
            this.dropdownShown = true;
        } else {
            this.dropdown.destroy();
            items.style.display = "none";
            this.dropdownShown = false;
        }
    }

    //#endregion

    protected getInputClass() {
        let klass: string = this.type;
        if (this.renderStyle) {
            klass += ` ${this.renderStyle}`;
        }
        return klass;
    }

    protected renderInput(): unknown {
        return;
    }

    protected render(): unknown {
        let klass: any = {
            "input-group": true,
        };
        if (!("renderStyle" in this.parentElement)) {
            klass[`${this.type}-border`] = true;
        }
        /*
        if (this.labelPosition) {
            if (this.labelPosition == 'vertical') {
                klass["labels-vertical"] = true;
            } else if (this.labelPosition == 'horizontal') {
                klass["labels-horizontal"] = true;
            }
        } else if ('labelPosition' in this.parentElement) {
            let layout = this.parentElement as any;
            if (layout.labelPosition == 'vertical') {
                klass["labels-vertical"] = true;
            } else if (layout.labelPosition == 'horizontal') {
                klass["labels-horizontal"] = true;
            }
        }
*/
        return html`${when(!this.hideLabel, () => html`<label part="label" for="text"><slot>${this.label}</slot></label>`)}
        <div part="input-group" class="${classMap(klass)}"> 
            <div><slot name="prepend"></slot>
                ${this.renderInput()}
            ${when(this.hasDropdown, () => html`<button id="dropdown-toggle" @click="${this.toggleDropdown}"></button>`)}
            <slot @slotchange="${this.dropdownSlotChange}" name="dropdown" style="display: none"></slot>
            <slot name="append"></slot></div>
        </div>`;
    }
}