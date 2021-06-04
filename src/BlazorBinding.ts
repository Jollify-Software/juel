import "./JuelGlobal";
import { BlazorSelectFunctions } from "./Select/BlazorSelect";
import { BlazorDialogManagerFunctions } from "./DialogManager/BlazorDialogManager";
import { BlazorColourFunctions } from "./Colour/BlazorColour";
import { BlazorListFunctions } from "./List/BlazorList";
import { BlazorEmojiPickerFunctions } from "./EmojiPicker/BlazorEmojiPicker";
import { BlazorButtonFunctions } from "./Button/BlazorButton";
import { BlazorRadialMenuFunctions } from "./RadialMenu/BlazorRadialMenu";

module Blazor {
    export var button = BlazorButtonFunctions;
    export var dialog = BlazorDialogManagerFunctions;
    export var colour = BlazorColourFunctions;
    export var select = BlazorSelectFunctions;
    export var list = BlazorListFunctions;
    export var emoji = BlazorEmojiPickerFunctions;
    export var radialMenu = BlazorRadialMenuFunctions;
}

(<any>window).juel.blazor = Blazor;