import { MessageBoxButtons } from './MessageBoxButtons';
import { MessageBoxResultStatus } from './MessageBoxResultStatus';
import { MessageBoxArgs } from './MessageBoxArgs';
import { MessageBoxResult } from './MessageBoxResult';
import { ElementFromHtml } from '../../_Utils/dom/ElementFromHtml';

var MessageBoxButtonStrategies: {[id: number]: (args: MessageBoxArgs, msgBox: HTMLElement, resolve: (value: MessageBoxResult) => void, resect: (reason?: any) => void ) => void } = {};

function GetLabel(args: MessageBoxArgs, name: string, label: string) {
    return args.labels && name in args.labels ? args.labels["ok"] : label;
}

MessageBoxButtonStrategies[MessageBoxButtons.OK] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "ok", "OK");
    let okBtn = ElementFromHtml(`<juel-button label="${lbl}" style="flex-basis: 100%;padding: .25rem;"></juel-button>`);
    let okClick = () => {
        resolve({ status: MessageBoxResultStatus.OK, value: args.value });
        msgBox.remove();
    };
    okBtn.addEventListener("button-clicked", okClick);
    okBtn.addEventListener("keyup", okClick);
    msgBox.querySelector("#dialog-body").append(okBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.OKCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "ok", "OK");
    let lbl2 = GetLabel(args, "cancel", "Cancel");
    let content = ElementFromHtml(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="ok" label="${lbl}"></juel-button><juel-button id="cancel" label="${lbl2}"></juel-button></div>`);
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
    content.querySelector("#ok").addEventListener("button-clicked", okClick);
    content.querySelector("#cancel").addEventListener("button-clicked", cancelClick);
    msgBox.querySelector("#dialog-body").append(content);
}
MessageBoxButtonStrategies[MessageBoxButtons.Success] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "success", "Success");
    let okBtn = ElementFromHtml(`<juel-button label="${lbl}" style="--background: var(--success);flex-basis: 100%;padding: .25rem;"></juel-button>`);
    let okClick = () => {
        resolve({ status: MessageBoxResultStatus.OK, value: args.value });
        msgBox.remove();
    };
    okBtn.addEventListener("button-clicked", okClick);
    msgBox.querySelector("#dialog-body").append(okBtn);
}
MessageBoxButtonStrategies[MessageBoxButtons.YesNo] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "yes", "Yes");
    let lbl2 = GetLabel(args, "no", "No");
    let content = ElementFromHtml(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="yes" style="--background: --success" label="${lbl}"></juel-button><juel-button id="no" style="--background: --danger" label="${lbl2}"></juel-button></div>`);
    let yesClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let noClick = () => {
        resolve({ status: MessageBoxResultStatus.No, value: args.value });
        msgBox.remove();
    };
    content.querySelector("#yes").addEventListener("button-clicked", yesClick);
    content.querySelector("#no").addEventListener("button-clicked", noClick);
    msgBox.querySelector("#dialog-body").append(content);
}
MessageBoxButtonStrategies[MessageBoxButtons.YesNoCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "yes", "Yes");
    let lbl2 = GetLabel(args, "no", "No");
    let lbl3 = GetLabel(args, "cancel", "Cancel");
    let content = ElementFromHtml(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="yes" style="--background: --success" label="${lbl}"></juel-button><juel-button id="no" style="--background: --danger" label="${lbl2}"></juel-button><juel-button id="cancel" label="${lbl3}"></juel-button></div>`);
    let yesClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };
    content.querySelector("#yes").addEventListener("button-clicked", yesClick);
    content.querySelector("#no").addEventListener("button-clicked", () => {
        resolve({ status: MessageBoxResultStatus.No });
        msgBox.remove();
    });
    content.querySelector("#cancel").addEventListener("button-clicked", cancelClick);
    msgBox.querySelector("#dialog-body").append(content);
}
MessageBoxButtonStrategies[MessageBoxButtons.RetryCancel] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "retry", "Retry");
    let lbl2 = GetLabel(args, "cancel", "Cancel");
    let content = ElementFromHtml(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="retry" style="--background: --success" label="${lbl}"></juel-button><juel-button id="cancel" label="${lbl2}"></juel-button></div>`);
    let retryClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };
    content.querySelector("#retry").addEventListener("button-clicked", retryClick);
    content.querySelector("#cancel").addEventListener("button-clicked", cancelClick);
    msgBox.querySelector("#dialog-body").append(content);
}
MessageBoxButtonStrategies[MessageBoxButtons.AbortRetryIgnore] = function(args, msgBox, resolve, reject) {
    let lbl = GetLabel(args, "abort", "Abort");
    let lbl2 = GetLabel(args, "retry", "Retry");
    let lbl3 = GetLabel(args, "cancel", "Cancel");
    let content = ElementFromHtml(`<div style="flex-basis: 100%;padding: .25rem;"><juel-button id="abort" style="--background: --danger" label="${lbl}"></juel-button><juel-button id="retry" style="--background: --success" label="${lbl2}"></juel-button><juel-button id="cancel" label="${lbl3}"></juel-button></div>`);
    let retryClick = () => {
        resolve({ status: MessageBoxResultStatus.Yes, value: args.value });
        msgBox.remove();
    };
    let cancelClick = () => {
        resolve({ status: MessageBoxResultStatus.Cancel, value: args.value });
        msgBox.remove();
    };

    content.querySelector("#abort").addEventListener("button-clicked", () => {
        resolve({ status: MessageBoxResultStatus.No });
        msgBox.remove();
    });
    content.querySelector("#retry").addEventListener("button-clicked", retryClick);
    content.querySelector("#cancel").addEventListener("button-clicked", cancelClick);
    msgBox.querySelector("#dialog-body").append(content);
}
export default MessageBoxButtonStrategies;
