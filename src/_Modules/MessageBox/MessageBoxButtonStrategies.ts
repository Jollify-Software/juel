import { MessageBoxButtons } from './MessageBoxButtons';
import { MessageBoxResultStatus } from './MessageBoxResultStatus';
import { MessageBoxArgs } from './MessageBoxArgs';
import { MessageBoxResult } from './MessageBoxResult';

var MessageBoxButtonStrategies: {[id: number]: (args: MessageBoxArgs, msgBox: JQuery<HTMLElement>, resolve: (value: MessageBoxResult) => void, resect: (reason?: any) => void ) => void } = {};

function GetLabel(args: MessageBoxArgs, name: string, label: string) {
    return args.labels && name in args.labels ? args.labels["ok"] : label;
}

MessageBoxButtonStrategies[MessageBoxButtons.OK] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "ok", "OK");
    let okBtn = $(`<juel-button label="${lbl}" style="flex-basis: 100%;padding: .25rem;"></juel-button>`);
    let okClick = () => {
        resolve({ status: MessageBoxResultStatus.OK, value: args.value });
        msgBox.remove();
    };
    $(okBtn).on("button-clicked keyup", okClick);
    msgBox.find("#dialog-body").append(okBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.OKCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "ok", "OK");
    let lbl2 = GetLabel(args, "cancel", "Cancel");
    let content = $(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="ok" label="${lbl}"></juel-button><juel-button id="cancel" label="${lbl2}></juel-button></div>`);
    let okClick = () => {
        resolve({ status: MessageBoxResultStatus.OK, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel });
        msgBox.remove();
    };
    msgBox.find('#dialog').on('keyup', (e) => {
        if (e.key == "Escape") {
            cancelClick();
        }
    });
    content.find("#ok").on("button-clicked", okClick);
    content.find("#cancel").on("button-clicked", cancelClick);
    msgBox.find("#dialog-body").append(content);
}
MessageBoxButtonStrategies[MessageBoxButtons.Success] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "success", "Success");
    let okBtn = $(`<juel-button label="${lbl}" style="--background: var(--success);flex-basis: 100%;padding: .25rem;"></juel-button>`);
    let okClick = () => {
        resolve({ status: MessageBoxResultStatus.OK, value: args.value });
        msgBox.remove();
    };
    okBtn.on("button-clicked", okClick);
    msgBox.find("#dialog-body").append(okBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.YesNo] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "yes", "Yes");
    let lbl2 = GetLabel(args, "no", "No");
    let content = $(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="yes" style="--background: --success" label="${lbl}"></juel-button><juel-button id="no" style="--background: --danger" label="${lbl2}"></juel-button></div>`);
    let yesClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let noClick = () => {
        resolve({ status: MessageBoxResultStatus.No, value: args.value });
        msgBox.remove();
    };
    content.find("#yes").on("button-clicked", yesClick);
    content.find("#no").on("button-clicked", noClick);
    msgBox.find("#dialog-body").append(content);
}
MessageBoxButtonStrategies[MessageBoxButtons.YesNoCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "yes", "Yes");
    let lbl2 = GetLabel(args, "no", "No");
    let lbl3 = GetLabel(args, "cancel", "Cancel");
    let content = $(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="yes" style="--background: --success" label="${lbl}"></juel-button><juel-button id="no" style="--background: --danger" label="${lbl2}"></juel-button><juel-button id="cancel" label="${lbl3}"></juel-button></div>`);
    let yesClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };
    content.find("#yes").on("button-clicked", yesClick);
    content.find("#no").on("button-clicked", () => {
        resolve({ status: MessageBoxResultStatus.No });
        msgBox.remove();
    });
    content.find("#cancel").on("button-clicked", cancelClick);
    msgBox.find("#dialog-body").append(content);
}
MessageBoxButtonStrategies[MessageBoxButtons.RetryCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "retry", "Retry");
    let lbl2 = GetLabel(args, "cancel", "Cancel");
    let content = $(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="retry" style="--background: --success" label="${lbl}"></juel-button><juel-button id="cancel" label="${lbl2}"></juel-button></div>`);
    let retryClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };
    content.find("#retry").on("button-clicked", retryClick);
    content.find("#cancel").on("button-clicked", cancelClick);
    msgBox.find("#dialog-body").append(content);
}
MessageBoxButtonStrategies[MessageBoxButtons.AbortRetryIgnore] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "abort", "Abort");
    let lbl2 = GetLabel(args, "retry", "Retry");
    let lbl3 = GetLabel(args, "cancel", "Cancel");
    let content = $(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="abort" style="--background: --danger" label="${lbl}"></juel-button><juel-button id="retry" style="--background: --success" label="${lbl2}"></juel-button><juel-button id="cancel" label="${lbl3}"></juel-button></div>`);
    let retryClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };
    
    content.find("#abort").on("button-clicked", () => {
        resolve({ status: MessageBoxResultStatus.No });
        msgBox.remove();
    });
    content.find("#retry").on("button-clicked", retryClick);
    content.find("#cancel").on("button-clicked", cancelClick);
    msgBox.find("#dialog-body").append(content);
}
export default MessageBoxButtonStrategies;