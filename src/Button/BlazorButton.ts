import { removeFunctions } from "../_Utils/RemoveFunctions";

export module BlazorButtonFunctions {
    export var register = (id: string, dotNet: DotNet.DotNetObject) => {
        let el = document.getElementById(id);
        if (el) {
            el.addEventListener('ButtonClick', function(event: CustomEvent) {
                var e = event.detail as MouseEvent;
                let obj = {
                    detail: e.detail,
                    screenX: e.screenX,
                    screenY: e.screenY,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    offsetX: e.offsetX,
                    offsetY: e.offsetY,
                    button: e.button,
                    buttons: e.buttons,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                    altKey: e.altKey,
                    metaKey: e.metaKey,
                    type: e.type
                }
                dotNet.invokeMethodAsync('OnButtonClick', obj)
            });
        }
    }
}