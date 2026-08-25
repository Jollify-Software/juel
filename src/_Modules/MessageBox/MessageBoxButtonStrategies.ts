import { MessageBoxButtons } from './MessageBoxButtons';
import { MessageBoxResultStatus } from './MessageBoxResultStatus';
import { MessageBoxArgs } from './MessageBoxArgs';
import { MessageBoxResult } from './MessageBoxResult';
import { ElementFromHtml } from '../../_Utils/dom/ElementFromHtml';
import { EscapeHtml } from '../../_Utils/EscapeHtml';

var MessageBoxButtonStrategies: {[id: number]: (args: MessageBoxArgs, msgBox: HTMLElement, resolve: (value: MessageBoxResult) => void, resect: (reason?: any) => void ) => void } = {};

function GetLabel(args: MessageBoxArgs, name: string, label: string) {
    // Was hardcoded to args.labels["ok"] regardless of which button's name
    // was actually requested, so custom labels/`{ yes, no, ... }` etc. only
    // ever worked (by coincidence) for the "ok" button — every other one
    // rendered the literal string "undefined".
    let value = args.labels && name in args.labels ? args.labels[name] : label;
    return EscapeHtml(value);
}

MessageBoxButtonStrategies[MessageBoxButtons.OK] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "ok", "OK");
    let okBtn = ElementFromHtml(`<juel-button type="primary" label="${lbl}"></juel-button>`);
    let okClick = () => {
        resolve({ status: MessageBoxResultStatus.OK, value: args.value });
        msgBox.remove();
    };
    okBtn.addEventListener("button-clicked", okClick);
    okBtn.addEventListener("keyup", okClick);
    msgBox.querySelector("#dialog-footer").append(okBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.OKCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "ok", "OK");
    let lbl2 = GetLabel(args, "cancel", "Cancel");
    let cancelBtn = ElementFromHtml(`<juel-button id="cancel" type="secondary" render-style="outline" label="${lbl2}"></juel-button>`);
    let okBtn = ElementFromHtml(`<juel-button id="ok" type="primary" label="${lbl}"></juel-button>`);
    let okClick = () => {
        resolve({ status: MessageBoxResultStatus.OK, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel });
        msgBox.remove();
    };
    msgBox.querySelector('#dialog').addEventListener('keyup', (e: KeyboardEvent) => {
        if (e.key == "Escape") {
            cancelClick();
        }
    });
    okBtn.addEventListener("button-clicked", okClick);
    cancelBtn.addEventListener("button-clicked", cancelClick);
    msgBox.querySelector("#dialog-footer").append(cancelBtn, okBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.Success] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "success", "Success");
    let okBtn = ElementFromHtml(`<juel-button type="success" label="${lbl}"></juel-button>`);
    let okClick = () => {
        resolve({ status: MessageBoxResultStatus.OK, value: args.value });
        msgBox.remove();
    };
    okBtn.addEventListener("button-clicked", okClick);
    msgBox.querySelector("#dialog-footer").append(okBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.YesNo] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "yes", "Yes");
    let lbl2 = GetLabel(args, "no", "No");
    let noBtn = ElementFromHtml(`<juel-button id="no" type="danger" render-style="outline" label="${lbl2}"></juel-button>`);
    let yesBtn = ElementFromHtml(`<juel-button id="yes" type="success" label="${lbl}"></juel-button>`);
    let yesClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let noClick = () => {
        resolve({ status: MessageBoxResultStatus.No, value: args.value });
        msgBox.remove();
    };
    yesBtn.addEventListener("button-clicked", yesClick);
    noBtn.addEventListener("button-clicked", noClick);
    msgBox.querySelector("#dialog-footer").append(noBtn, yesBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.YesNoCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "yes", "Yes");
    let lbl2 = GetLabel(args, "no", "No");
    let lbl3 = GetLabel(args, "cancel", "Cancel");
    let cancelBtn = ElementFromHtml(`<juel-button id="cancel" type="secondary" render-style="outline" label="${lbl3}"></juel-button>`);
    let noBtn = ElementFromHtml(`<juel-button id="no" type="danger" render-style="outline" label="${lbl2}"></juel-button>`);
    let yesBtn = ElementFromHtml(`<juel-button id="yes" type="success" label="${lbl}"></juel-button>`);
    let yesClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };
    yesBtn.addEventListener("button-clicked", yesClick);
    noBtn.addEventListener("button-clicked", () => {
        resolve({ status: MessageBoxResultStatus.No });
        msgBox.remove();
    });
    cancelBtn.addEventListener("button-clicked", cancelClick);
    msgBox.querySelector("#dialog-footer").append(cancelBtn, noBtn, yesBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.RetryCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "retry", "Retry");
    let lbl2 = GetLabel(args, "cancel", "Cancel");
    let cancelBtn = ElementFromHtml(`<juel-button id="cancel" type="secondary" render-style="outline" label="${lbl2}"></juel-button>`);
    let retryBtn = ElementFromHtml(`<juel-button id="retry" type="primary" label="${lbl}"></juel-button>`);
    let retryClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };
    retryBtn.addEventListener("button-clicked", retryClick);
    cancelBtn.addEventListener("button-clicked", cancelClick);
    msgBox.querySelector("#dialog-footer").append(cancelBtn, retryBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.AbortRetryIgnore] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "abort", "Abort");
    let lbl2 = GetLabel(args, "retry", "Retry");
    let lbl3 = GetLabel(args, "cancel", "Cancel");
    let cancelBtn = ElementFromHtml(`<juel-button id="cancel" type="secondary" render-style="outline" label="${lbl3}"></juel-button>`);
    let abortBtn = ElementFromHtml(`<juel-button id="abort" type="danger" render-style="outline" label="${lbl}"></juel-button>`);
    let retryBtn = ElementFromHtml(`<juel-button id="retry" type="primary" label="${lbl2}"></juel-button>`);
    let retryClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };

    abortBtn.addEventListener("button-clicked", () => {
        resolve({ status: MessageBoxResultStatus.No });
        msgBox.remove();
    });
    retryBtn.addEventListener("button-clicked", retryClick);
    cancelBtn.addEventListener("button-clicked", cancelClick);
    msgBox.querySelector("#dialog-footer").append(abortBtn, cancelBtn, retryBtn);
}
export default MessageBoxButtonStrategies;
