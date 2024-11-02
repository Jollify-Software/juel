import '../jquery-tabbable';
import { createPopper, Instance } from "@popperjs/core";
import { property } from "lit/decorators";
import { RippleInitialiser } from "../_Utils/RippleModule";
import { JuelComponent } from "./JuelComponent";
import { createRef } from 'lit/directives/ref'
import { CSSResultGroup, html, PropertyValueMap, unsafeCSS } from "lit";
import bind from "bind-decorator";
import { RenderStyles } from '../_Core/RenderStyles';
import { AlertTypes } from '../_Core/AlertTypes';
import { InputTypes } from '../_Templates/InputTypes';
import { choose } from 'lit/directives/choose';
import { ButtonTemplate } from '../_Templates/ButtonTemplate';
import { TextTemplate } from '../_Templates/TextTemplate';
import { JuelText } from '../Input/Text/Text';
import { JuelButton } from '../Button/Button';
import Styles from "../_CommonStyles/InputGroup.less";

export class InputBase extends JuelComponent {
    static InputElementNames: string = "juel-text, juel-memo, juel-range, juel-tickbox, juel-radio";

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property() value: any;
    @property() type: AlertTypes;
    @property({ attribute: "render-style" }) renderStyle: RenderStyles;
    @property({ type: Boolean }) addonActive: boolean;
    @property() label: string;
    @property() name: string;
    @property({ type: Boolean }) active: boolean;

    inputType: InputTypes;

    input = createRef<HTMLInputElement>();
    $this: JQuery<HTMLElement>;

    dropdownShown: boolean = false;
    dropdown: Instance;

    isRipple: string;
    r: RippleInitialiser;

    constructor() {
        super();
        this.type = AlertTypes.Primary;
        this.renderStyle = RenderStyles.Default;
    }

    firstUpdated() {
        super.firstUpdated();
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
    }

    //#region " Dropdown "

    dropdownSlotChange(e: Event) {
        let slot = e.target as HTMLSlotElement;
        $(slot).before(
                $('<button id="dropdown-toggle" />').on("click", this.toggleDropdown)
            );
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

    protected render(): unknown {
        return html`<div part="input-group" class="input-group">
            <slot name="prepend"></slot>
            ${choose(this.inputType, [
                [ InputTypes.Button, () => ButtonTemplate(this as unknown as JuelButton, "") ],
                [ InputTypes.Text, () => TextTemplate(this as unknown as JuelText, "") ]
            ])}
            <slot @slotchange="${this.dropdownSlotChange}" name="dropdown" style="display: none"></slot>
            <slot name="append"></slot>
        </div>`;
    }
}