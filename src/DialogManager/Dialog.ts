import { customElement, property, state } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { Dialog } from "../_Core/Dialog";
import { CSSResultGroup, html, PropertyValueMap, unsafeCSS } from "lit";
import { ItemBase } from "../_Base/ItemBase";
import { JuelDialogManager } from "./DialogManager";
import { ArrayConverter } from "../_Converters/ArrayConverter";
import Styles from "bundle-text:./Dialog.less";
import { DialogOptions } from "../_Core/DialogOptions";
import { createRef, ref, Ref } from "lit/directives/ref";
import { classMap } from "lit/directives/class-map";
import { IsMobile } from "../_Utils/IsMobile";
import interact from "@interactjs/interactjs";
import { DragMoveListener2 } from "../_Utils/DragMoveListener";

@customElement("juel-dialog")
export class JuelDialog extends ItemBase {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property() title: string;
    @property() location: string;
    @property() size: string;
    @property() trigger: string;
    @property({ converter: ArrayConverter()}) group: string[];
    @property() model: boolean = false;
    @property() draggable: boolean = false;

    dialog: Ref<HTMLElement> = createRef();

    @state() shown: boolean;
    @state() initial: boolean = true;

//    dialog: Dialog;

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if ('addItem' in this.parentElement) {
            let parent = this.parentElement as JuelDialogManager;
            parent.addItem(this);

            if (this.trigger) {
                let trigger = document.querySelector(this.trigger);
                console.log(trigger)
                if (trigger) {
                    let me = this;
                    trigger.addEventListener('click', () => {
                        me.show();
                    })
                }
            }

            if ((!IsMobile()) && this.draggable) {
                interact(this.dialog.value)
                    .draggable({
                        inertia: true,
                        allowFrom: ".titlebar",
                        listeners: {
                            move: DragMoveListener2(true),
                            start: (event) => {
                                this.initial = false;
                            },
                            end(event) {
                            }
                        }
                    })
            } else { // Is mobile
                if (this.location && this.size) {
                    switch (this.location) {
                        case 'top':
                            this.style.top = `calc(var(--vh) * -${this.size})`;
                            this.style.height = `calc(var(--vh) * ${this.size})`;
                            break;
                    }
                }
            }
        }
    }

    show() {
        this.shown = true;
    }

    close() {
        this.shown = false;
    }

    protected render(): unknown {
        let klass = {
            "dialog": true,
            "shown": this.shown,
            "initial": this.initial
        };
        return html`<div part="dialog" class="${classMap(klass)}"  ${ref(this.dialog)}>
                        <div part="dialog-title" class="titlebar">
                            <slot name="title"><span>${this.title}</span></slot>
                            <div class="close" @click="${this.close}"></div>
                        </div>
                        <div part="dialog-body" class="dialog-body">
                            <slot></slot>
                        </div>
                    </div>`;
    }

}