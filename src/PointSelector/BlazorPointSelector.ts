
export module BlazorPointSelectorFunctions {
    export var register = (id: string, dotNet: DotNet.DotNetObject) => {
        let select = document.getElementById(id);
        if (select) {
            select.addEventListener('point_selected', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('OnPointSelected', event.detail)
            });
        }
    }
}