import { LitElement, PropertyValueMap, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import interact from '@interactjs/interactjs';
import { Dialog } from "../_Core/Dialog";

import styles from 'bundle-text:./DialogManager.css';
import { DialogManagerService } from "./DialogManagerService";
import { ListBase } from "../_Base/ListBase";
import { createRef, ref, Ref } from "lit/directives/ref";

@customElement("juel-dialog-manager")
export class JuelDialogManager extends ListBase {

    static styles = unsafeCSS(styles);

    service: DialogManagerService;

    container: HTMLElement;

    constructor() {
        super();
        if (!('interact' in window)) {
        window['interact'] = interact;
        }
        this.service = new DialogManagerService(this);
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.container = this.shadowRoot.querySelector("#container");
    }

    show(id: string) {
        this.service.showDialog(id);
    }

    close(id: string, value: any) {
        this.service.close(id, value);
    }

    render() {
        return html`<div class="container">
            <slot></slot>
            </div>`;
    }

}