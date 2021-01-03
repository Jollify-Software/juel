import { DialogManager } from "./DialogManager";

export module BlazorDialogManagerFunctions {
    export var register = (dotNet: DotNet.DotNetObject) => {
        let dm = document.querySelector('juel-dialog-manager') as DialogManager;
        if (dm) {
            dm.addEventListener('closed', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('closed', event.detail)
            });
        }
    }
}