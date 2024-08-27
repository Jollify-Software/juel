import { createPopper, Instance } from "@popperjs/core";
import { generateGetBoundingClientRect, virtualElement } from "../_Core/VirtualElement";
import { PopupServiceBase } from "./PopupServiceBase";

export class TooltipService extends PopupServiceBase {

    tooltip(text: string, target: HTMLElement | string | MouseEvent) {
        if (!this.element) {
            let tip = $('<div class="tooltip">').append(text);
            this.element = tip[0];
            document.body.append(this.element);
        }
        this.createPopup(target, true);
    }
    
}