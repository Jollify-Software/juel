import { createPopper } from "@popperjs/core";
import { MailToReverse } from "../_Utils/MailToReverseFunction";
import { ReverseString } from "../_Utils/ReverseStringFunction";
import bind from "bind-decorator";

(window as any).reverseString = ReverseString;
(window as any).mailToReverse = MailToReverse;

export module WindowModule {
    
    var documentClickListeners: { [id: string]: (e: MouseEvent) => void };

    export var appendDocumentClick = (id: string, listener: (e: MouseEvent) => void) => {
        if (!documentClickListeners) {
            documentClickListeners = {};
        }
        if (!(id in documentClickListeners)) {
            documentClickListeners[id] = listener;
        }
    }

    export var removeDocumentClick = (id: string) => {
        if (documentClickListeners && id in documentClickListeners) {
            delete documentClickListeners[id];
        }
    }

    export var documentClick = () => {
        document.addEventListener("click", handleDocumentClick)
    }
    
    function handleDocumentClick(e: MouseEvent) {
        if (documentClickListeners) {
            for (let id in documentClickListeners) {
                let listener = documentClickListeners[id];
                listener(e);
            }
        }
    }

}