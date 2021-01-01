export module BlazorDialogManagerFunctions {
    export var register = (id: string, dotNet: DotNet.DotNetObject) => {
        let dm = document.getElementById(id);
        if (dm) {
            dm.addEventListener('closed', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('closed', event.detail)
            });
        }
    }
}