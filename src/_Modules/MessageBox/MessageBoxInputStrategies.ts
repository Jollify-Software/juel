import { ChangedEventArgs } from "../../../../juel/src/_Core/Events/ChangedEventArgs";
import { EventNames } from "../../../../juel/src/_Core/Events/EventNames";
import { upperFirst } from "../../_Utils/String/upperFirst";
/*import { JuelMarkdownEditor } from "../../MarkdownEditor/MarkdownEditor";
import { MarkdownEditorEvents } from "../../MarkdownEditor/MarkdownEditorEvents";*/
import { MessageBoxArgs } from "./MessageBoxArgs";
import { MessageBoxPromptField } from "./MessageBoxPromptField";

var MessageBoxInputStrategies: {[id: string]: (args: MessageBoxArgs, msgBox: JQuery<HTMLElement>, field?: MessageBoxPromptField | null ) => void } = {};

MessageBoxInputStrategies["text"] = (args, msgBox, field) => { 
    let input: JQuery<HTMLElement>;
    if (!field) {
        input = $(`<juel-text style="flex-basis: 100%" value="${args.value ?? ""}"></juel-text>`);
    } else {
        input = $(`<juel-text style="flex-basis: 100%" label="${upperFirst(field.name)}" value="${field.value ?? ""}"></juel-text>`);
    }
    input.on(EventNames.ValueChanged as any, (e: CustomEvent<ChangedEventArgs>) => {
        if (field) {
            let obj = {};
            obj[field.name] = e.detail.value;
            args.value = $.extend({}, args.value, obj);
        } else {
            args.value = e.detail.value;
        }
    });
    msgBox.find("#dialog-body").append(input);
};
/*
MessageBoxInputStrategies["markdown"] = (args, msgBox) => {
    let input = $(`<juel-markdown-editor style="flex-basis: 100%"${args.attr ? Object.keys(args.attr).map(key => {
        return ` ${key}="${args.attr[key]}"`;
    }) : ``}></juel-markdown-editor>`);
    let editor = input[0] as JuelMarkdownEditor;
    if (args.value) {
        editor.setContent(args.value);
    }
    input.on(MarkdownEditorEvents.editorChanges, (e: CustomEvent<ChangedEventArgs>) => {
            args.value = e.detail.value;
        });
    msgBox.find("#dialog-body").append(input);
};*/
export default MessageBoxInputStrategies;
