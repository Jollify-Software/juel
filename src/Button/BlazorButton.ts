import { Trigger } from "../_CommonInteropFunctions/Trigger";
import { TriggerClick } from "../_CommonInteropFunctions/TriggerClick";
import { removeFunctions } from "../_Utils/RemoveFunctions";
import { JuelButton } from "./Button";

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
    export var setActive = (id: string, value: boolean) => {
        let el = document.getElementById(id) as JuelButton;
        el.active = value;
    }
    export var trigger = Trigger;
    export var triggerClick = TriggerClick;
}