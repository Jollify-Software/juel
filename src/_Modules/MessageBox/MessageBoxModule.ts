import { MessageBoxArgs } from "./MessageBoxArgs"
import { MessageBoxButtons } from "./MessageBoxButtons";
import MessageBoxButtonStrategies from "./MessageBoxButtonStrategies";
import { MessageBoxIcon } from "./MessageBoxIcon";
import MessageBoxIconStrategies from "./MessageBoxIconStrategies";
import MessageBoxInputStrategies from "./MessageBoxInputStrategies";
import Styles from 'bundle-text:./MessageBoxStyles.less'

export module MessageBoxModule {

    let shown: boolean = false;

    export var error = (text: string, title = null) => {
        let args: MessageBoxArgs = {
            title: title ?? "Error",
            text: text,
            icon: MessageBoxIcon.Error
        };
        return show(args);
    }

    export var success = (text: string, title: string) => {
        let args: MessageBoxArgs = {
            title: title ?? "Success",
            text: text,
            icon: MessageBoxIcon.Success,
            buttons: MessageBoxButtons.Success
        };
        return show(args);
    }

    export var warning = (text: string, title: string) => {
        let args: MessageBoxArgs = {
            title: title ?? "Warning",
            text: text,
            icon: MessageBoxIcon.Warning
        };
        return show(args);
    }

    export var question = (text: string, title: string) => {
        let args: MessageBoxArgs = {
            title: title ?? "Question",
            text: text,
            icon: MessageBoxIcon.Question,
            buttons: MessageBoxButtons.YesNo
        };
        return show(args);
    }

    export var show = (args: MessageBoxArgs) => { // TODO: Return Promise of MessageBox result
        if (shown) {
            return;
        }
        shown = true;
        return new Promise((resolve, reject) => {
            const resolvePromise = (value: unknown) => {
                shown = false;
                resolve(value);
            };

            let msgBox = $(`<style>${Styles}</style><div id="overlay">
        <div id="dialog">
        <div id="dialog-title">
        <span>${args.title}</span>
        </div>
        <div id="dialog-body">
        ${args.text ? `<p>${args.text}</p>` : ``}
        </div>
        </div>
        </div>`);

            let prompt: boolean = false;
            
            if ('icon' in args) {
                if (args.icon in MessageBoxIconStrategies) {
                    MessageBoxIconStrategies[args.icon](args, msgBox);
                }
            }
            if ('prompt' in args) {
                prompt = true;
                if (args.prompt.prompt == "color") {
                    args.prompt.prompt = "colour";
                }
                if (args.prompt.prompt in MessageBoxInputStrategies) {
                    MessageBoxInputStrategies[args.prompt.prompt](args, msgBox);
                }
            } else {
                prompt = false;
            }
            if ('buttons' in args) {
                // TODO: If object
                if (args.buttons in MessageBoxButtonStrategies) {
                    MessageBoxButtonStrategies[args.buttons](args, msgBox, resolvePromise, reject);
                }
            } else {
                MessageBoxButtonStrategies[MessageBoxButtons.OK](args, msgBox, resolvePromise, reject);
            }
            if (prompt == false) {
                msgBox.find("juel-button").trigger('focus');
            }
            if (args.close && args.close == true) {
                let closeBtn = $(`<div class="close"></div>`);
                closeBtn.on("click", () => {
                    msgBox.remove();
                    resolvePromise(0);
                });
                msgBox.find("#dialog-title").append(closeBtn);
            }
            $(document.body).append(msgBox);
        });
    }
}