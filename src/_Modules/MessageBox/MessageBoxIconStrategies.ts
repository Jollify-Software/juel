import { MessageBoxArgs } from "./MessageBoxArgs";
import { MessageBoxIcon } from "./MessageBoxIcon";
import { IconsModule } from '../Icons/IconsModule'
import { ElementFromHtml } from "../../_Utils/dom/ElementFromHtml";

var MessageBoxIconStrategies: { [id: number ]: (args: MessageBoxArgs, msgBox: HTMLElement) => void } = {};

MessageBoxIconStrategies[MessageBoxIcon.Asterisk] = (ars, msgBox) => {
    let icn = ElementFromHtml(IconsModule.get("asterisk"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}
MessageBoxIconStrategies[MessageBoxIcon.Error] = (ars, msgBox) => {
    let icn = ElementFromHtml(IconsModule.get("error"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}
MessageBoxIconStrategies[MessageBoxIcon.Exclamation] = (ars, msgBox) => {
    let icn = ElementFromHtml(IconsModule.get("exclamation"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}
MessageBoxIconStrategies[MessageBoxIcon.Hand] = (ars, msgBox) => {
    let icn = ElementFromHtml(IconsModule.get("hand"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}
MessageBoxIconStrategies[MessageBoxIcon.Information] = (ars, msgBox) => {
    let icn = ElementFromHtml(IconsModule.get("info"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}
MessageBoxIconStrategies[MessageBoxIcon.Question] = (ars, msgBox) => {
    let icn = ElementFromHtml(IconsModule.get("question"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}
MessageBoxIconStrategies[MessageBoxIcon.Stop] = (ars, msgBox) => {
    // No dedicated "stop" icon exists in the icon set — Stop/Hand/Error
    // were historically the same icon in the Win32/VB6 MsgBox API this
    // enum mirrors (MB_ICONSTOP, MB_ICONHAND, and MB_ICONERROR were
    // literal aliases for one constant), so reuse "hand" rather than
    // point at a nonexistent asset.
    let icn = ElementFromHtml(IconsModule.get("hand"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}
MessageBoxIconStrategies[MessageBoxIcon.Success] = (ars, msgBox) => {
    let icn = ElementFromHtml(IconsModule.get("success"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}
MessageBoxIconStrategies[MessageBoxIcon.Warning] = (ars, msgBox) => {
    let icn = ElementFromHtml(IconsModule.get("warning"));
    if (icn) {
        msgBox.querySelector("#dialog-body").append(icn);
    }
}

export default MessageBoxIconStrategies;
