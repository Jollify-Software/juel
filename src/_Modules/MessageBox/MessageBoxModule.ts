import { MessageBoxArgs } from "./MessageBoxArgs"
import { MessageBoxButtons } from "./MessageBoxButtons";
import MessageBoxButtonStrategies from "./MessageBoxButtonStrategies";
import { MessageBoxIcon } from "./MessageBoxIcon";
import MessageBoxIconStrategies from "./MessageBoxIconStrategies";
import MessageBoxInputStrategies from "./MessageBoxInputStrategies";
import Styles from 'bundle-text:./MessageBoxStyles.less'
import { ElementFromHtml } from "../../_Utils/dom/ElementFromHtml";
import { EscapeHtml } from "../../_Utils/EscapeHtml";

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

            let msgBox = ElementFromHtml(`<div id="overlay">
        <style>${Styles}</style>
        <div id="dialog">
        <div id="dialog-title">
        <span>${EscapeHtml(args.title)}</span>
        </div>
        <div id="dialog-body">
        <div id="dialog-content">
        ${args.text ? `<p>${EscapeHtml(args.text)}</p>` : ``}
        </div>
        </div>
        <div id="dialog-footer"></div>
        </div>
        </div>`);

            // Clicking the dimmed backdrop doesn't dismiss the dialog (a
            // message box always needs an explicit choice via its buttons)
            // — but it shouldn't silently do nothing either, so pulse the
            // dialog to draw attention back to it. e.target === msgBox
            // (rather than some descendant) is exactly "clicked the
            // backdrop, not the dialog or anything in it."
            msgBox.addEventListener("click", (e: MouseEvent) => {
                if (e.target !== msgBox) {
                    return;
                }
                let dialog = msgBox.querySelector("#dialog") as HTMLElement;
                dialog.classList.remove("pulse");
                void dialog.offsetWidth; // restart the animation even if it's already mid-pulse
                dialog.classList.add("pulse");
            });

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
                if (args.prompt.fields && args.prompt.fields.length > 0) {
                    args.prompt.fields.forEach(field => {
                        MessageBoxInputStrategies[field.type](args, msgBox, field);
                    });

                } else if (args.prompt.prompt in MessageBoxInputStrategies) {
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
            if (args.close && args.close == true) {
                let closeBtn = ElementFromHtml(`<div class="close"></div>`);
                closeBtn.addEventListener("click", () => {
                    msgBox.remove();
                    resolvePromise(0);
                });
                msgBox.querySelector("#dialog-title").append(closeBtn);
            }

            // Appended before focusing — a disconnected element (or one of
            // its descendants) can't receive focus at all, and this used to
            // run in the opposite order.
            document.body.append(msgBox);

            if (prompt == false) {
                // The primary/confirm button isn't necessarily first in DOM
                // order any more (footer buttons are ordered secondary-then-
                // primary, left-to-right, to read naturally toward the
                // right-aligned confirm action) — so focus by role, not by
                // "whichever juel-button happens to come first."
                let primaryButton = msgBox.querySelector('#dialog-footer juel-button[type="primary"], #dialog-footer juel-button[type="success"]')
                    ?? msgBox.querySelector("#dialog-footer juel-button");
                // juel-button only just connected (above), so Lit hasn't
                // rendered its shadow DOM yet — its internal <button> (what
                // focus() actually needs to reach) doesn't exist until that
                // first render commits. updateComplete resolves exactly then.
                let updateComplete = (primaryButton as unknown as { updateComplete?: Promise<boolean> })?.updateComplete;
                if (updateComplete) {
                    updateComplete.then(() => (primaryButton as HTMLElement).focus());
                } else {
                    (primaryButton as HTMLElement)?.focus();
                }
            }
        });
    }
}