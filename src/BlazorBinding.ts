import "./JuelGlobal";
import { BlazorSelectFunctions } from "./Select/BlazorSelect";
import { BlazorDialogManagerFunctions } from "./DialogManager/BlazorDialogManager";
import { BlazorColourFunctions } from "./Colour/BlazorColour";
import { BlazorListFunctions } from "./List/BlazorList";
import { BlazorEmojiPickerFunctions } from "./EmojiPicker/BlazorEmojiPicker";

module Blazor {
    export var dialog = BlazorDialogManagerFunctions
    export var colour = BlazorColourFunctions
    export var select = BlazorSelectFunctions
    export var list = BlazorListFunctions
    export var emoji = BlazorEmojiPickerFunctions
}

(<any>window).juel.blazor = Blazor;