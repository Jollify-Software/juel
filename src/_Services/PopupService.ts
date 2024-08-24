import { createPopper } from "@popperjs/core";
import { PopupServiceBase } from "./PopupServiceBase";
import { generateGetBoundingClientRect } from "../_Core/VirtualElement";
import { Point } from "../_Core/Point";
import { headingNodeNames } from "../_Strings/HeadingNodeNames";

export class PopupService extends PopupServiceBase {

    /**
     *
     */
    constructor() {
        super();
        this.config = { placement: 'auto' };
    }

    popup(content: string | HTMLElement[],
        target: HTMLElement | string | MouseEvent | Point) {
        if (!this.element) {
            let heading: HTMLElement;
            if (Array.isArray(content)) {
                heading = content.find(el => headingNodeNames.includes(el.nodeName.toLowerCase()))
                content = content.filter(el => el != heading);
            }
            let tip = $('<div class="popup">')
                .append(
                    $('<div class="popup-header">').append(
                        $('<span class="close">').on("click", () => {
                            setTimeout(() => {
                                this.closePopup();
                            })
                        }))
                )
                .append($('<div class="popup-body">'));
            if (heading) {
                tip.find(".popup-header").prepend(heading);
            }
            tip.find(".popup-body").append($(content as any));
            this.element = tip[0];
        }
        this.createPopup(target);
    }

}