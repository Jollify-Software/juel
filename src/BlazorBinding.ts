import { BlazorSelectFunctions } from "./Select/BlazorSelect";


(<any>window).juel = {};

import $ from "jquery";
(<any>window).$ = $;
(<any>window).jQuery = $;

module Blazor {
    export var select = BlazorSelectFunctions
}

(<any>window).juel.blazor = Blazor;