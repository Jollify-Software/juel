import { RadialMenu } from "./RadialMenu";

export module BlazorRadialMenuFunctions {
    export var register = (id: string, dotNet: DotNet.DotNetObject) => {
        let select = document.getElementById(id);
        if (select) {
            select.addEventListener('menu-open', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('OnMenuOpen')
            });
            select.addEventListener('menu-close', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('OnMenuClose')
            });
        }
    }
}