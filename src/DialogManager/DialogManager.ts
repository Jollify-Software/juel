import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import { Dialog } from "../_Core/Dialog";

import styles from './DialogManager.css';
import { DialogManagerService } from "./DialogManagerService";

@customElement("juel-dialog-manager")
export class DialogManager extends LitElement {

    static styles = unsafeCSS(styles);

    service: DialogManagerService;

    constructor() {
        super();
        this.service = new DialogManagerService();
    }

    firstUpdated() {
        this.service.init(this.shadowRoot.querySelector("#container"));
    }

    show(id: string) {
        console.log("Show")
        this.service.showDialog(id);
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