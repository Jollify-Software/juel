import { Colour } from "./Colour";

export module BlazorColourFunctions {
    export var register = (id: string, dotNet: DotNet.DotNetObject) => {
        let el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('change', event.detail.colour)
            });
        }
    }
    export var setColour = (id: string, colour: string) => {
        let el = document.getElementById(id) as Colour;
        if (el) {
            el.setColour(colour);
        }
    }
}