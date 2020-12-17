import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import interact from '@interactjs/interactjs';
import { Dialog } from "../_Core/Dialog";

import styles from 'bundle-text:./DialogManager.css';
import { DialogManagerService } from "./DialogManagerService";

@customElement("juel-dialog-manager")
export class DialogManager extends LitElement {

    static styles = unsafeCSS(styles);

    service: DialogManagerService;

    constructor() {
        super();
        if (!('interact' in window)) {
            console.log("Assign interact");
        window['interact'] = interact;
        }
        this.service = new DialogManagerService();
    }

    firstUpdated() {
        this.service.init(this.shadowRoot.querySelector("#dialog-container"));
    }

    show(id: string) {
        console.log("Show")
        this.service.showDialog(id);
    }

    close(id: string, value: any) {
        console.log("Show")
        this.service.close(id, value);
    }

    render() {
        return html`<div id="dialog-container">
            ${(Array.prototype.slice.call(this.children) as HTMLElement[])
                .map((ele, index) => {
                    let id = ele.id;
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