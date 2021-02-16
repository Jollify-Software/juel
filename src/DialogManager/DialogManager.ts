import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import interact from '@interactjs/interactjs';
import { Dialog } from "../_Core/Dialog";

import styles from 'bundle-text:./DialogManager.css';
import { DialogManagerService } from "./DialogManagerService";

@customElement("juel-dialog-manager")
export class JuelDialogManager extends LitElement {

    static styles = unsafeCSS(styles);

    service: DialogManagerService;

    constructor() {
        super();
        if (!('interact' in window)) {
        window['interact'] = interact;
        }
        this.service = new DialogManagerService(this);
    }

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
            setTimeout(() => this.service.init());
        });
        
    }

    show(id: string) {
        this.service.showDialog(id);
    }

    close(id: string, value: any) {
        this.service.close(id, value);
    }

    render() {
        return html`<div id="container">
            ${(Array.prototype.slice.call(this.children) as HTMLElement[])
                .map((ele, index) => {
                    let id = ele.id;
                    if (!id) {
                        id = `dialog-${index}`;
                    }
                    ele.setAttribute('slot', id);
                    this.service.dialogs.push(new Dialog(this.service, id, ele.dataset));
                    
                    return html`<div id="${id}" class="dialog">
                        <div class="titlebar">
                            <span>${(ele.dataset.title ? ele.dataset.title : "")}</span>
                            <div class="close">&#x274C;</div>
                        </div>
                        <div class="dialog-body">
                            <slot name="${id}"></slot>
                        </div>
                    </div>`;
                })}
            </div>`;
    }

}