import { html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import Styles from "bundle-text:./Modal.less";

@customElement("juel-modal")
export class JuelModal extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property() trigger: string;

    load() {
        if (this.trigger) {
            $(this.trigger).on('click', () => {
                this.open();
            });
        }
    }

    open() {
        $(this.shadowRoot.querySelector(".modal"))
            .addClass("open");
    }

    close() {
        $(this.shadowRoot.querySelector(".modal"))
            .removeClass("open");
    }

    render() {
        return html`<div class="modal">
            <div class="container">
            <div class="header"><slot name="title"></slot><span class="close" @click="${this.close}"></span></div>
            <div class="content">
            <slot></slot>
            </div>
            </div>
        </div>`;
    }
}