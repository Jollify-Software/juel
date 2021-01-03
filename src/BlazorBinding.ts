import { BlazorSelectFunctions } from "./Select/BlazorSelect";



(<any>window).juel = {};

import $ from "jquery";
import { BlazorDialogManagerFunctions } from "./DialogManager/BlazorDialogManager";
import { BlazorColourFunctions } from "./Colour/BlazorColour";
(<any>window).$ = $;
(<any>window).jQuery = $;

module Blazor {
    export var dialog = BlazorDialogManagerFunctions
    export var colour = BlazorColourFunctions
    export var select = BlazorSelectFunctions
}

(<any>window).juel.blazor = Blazor;