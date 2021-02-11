import { BlazorSelectFunctions } from "./Select/BlazorSelect";
import { BlazorDialogManagerFunctions } from "./DialogManager/BlazorDialogManager";
import { BlazorColourFunctions } from "./Colour/BlazorColour";
import { BlazorListFunctions } from "./List/BlazorList";

(<any>window).juel = {};
import $ from "jquery";

(<any>window).$ = $;
(<any>window).jQuery = $;

module Blazor {
    export var dialog = BlazorDialogManagerFunctions
    export var colour = BlazorColourFunctions
    export var select = BlazorSelectFunctions
    export var list = BlazorListFunctions
}

(<any>window).juel.blazor = Blazor;