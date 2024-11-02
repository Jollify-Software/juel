import { MessageBoxArgs } from "./MessageBoxArgs";
import { MessageBoxIcon } from "./MessageBoxIcon";
import { IconsModule } from '../IconsModule'

var MessageBoxIconStrategies: { [id: number ]: (args: MessageBoxArgs, msgBox: JQuery<HTMLElement>) => void } = {};

MessageBoxIconStrategies[MessageBoxIcon.Asterisk] = (ars, msgBox) => {
    let icn = $(IconsModule.get("asterisk"));
    msgBox.find("#dialog-body").append(icn);
}
MessageBoxIconStrategies[MessageBoxIcon.Error] = (ars, msgBox) => {
    let icn = $(IconsModule.get("error"));
    msgBox.find("#dialog-body").append(icn);
}
MessageBoxIconStrategies[MessageBoxIcon.Exclamation] = (ars, msgBox) => {
    let icn = $(IconsModule.get("exclamation"));
    msgBox.find("#dialog-body").append(icn);
}
MessageBoxIconStrategies[MessageBoxIcon.Hand] = (ars, msgBox) => {
    let icn = $(IconsModule.get("hand"));
    msgBox.find("#dialog-body").append(icn);
}
MessageBoxIconStrategies[MessageBoxIcon.Information] = (ars, msgBox) => {
    let icn = $(IconsModule.get("info"));
    msgBox.find("#dialog-body").append(icn);
}
MessageBoxIconStrategies[MessageBoxIcon.Question] = (ars, msgBox) => {
    let icn = $(IconsModule.get("question"));
    msgBox.find("#dialog-body").append(icn);
}
MessageBoxIconStrategies[MessageBoxIcon.Stop] = (ars, msgBox) => {
    let icn = $(IconsModule.get("stop"));
    msgBox.find("#dialog-body").append(icn);
}
MessageBoxIconStrategies[MessageBoxIcon.Success] = (ars, msgBox) => {
    let icn = $(IconsModule.get("success"));
    msgBox.find("#dialog-body").append(icn);
}
MessageBoxIconStrategies[MessageBoxIcon.Warning] = (ars, msgBox) => {
    let icn = $(IconsModule.get("warning"));
    msgBox.find("#dialog-body").append(icn);
}

export default MessageBoxIconStrategies;