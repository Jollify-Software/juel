import MessageBoxInputStrategies from "../../src/_Modules/MessageBox/MessageBoxInputStrategies";
import { MessageBoxArgs } from "../../src/_Modules/MessageBox/MessageBoxArgs";
import { MessageBoxPromptField } from "../../src/_Modules/MessageBox/MessageBoxPromptField";

function createMsgBox(): HTMLElement {
    let msgBox = document.createElement("div");
    msgBox.innerHTML = `<div id="dialog-body"></div>`;
    document.body.append(msgBox);
    return msgBox;
}

function changeValue(el: Element, value: unknown) {
    el.dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));
}

describe("MessageBoxInputStrategies", () => {
    let msgBox: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = "";
        msgBox = createMsgBox();
    });

    test("text (no field): renders a juel-text bound to args.value and updates it on value-changed", () => {
        let args: MessageBoxArgs = { title: "T", text: "", value: "initial" };

        MessageBoxInputStrategies["text"](args, msgBox);

        let input = msgBox.querySelector("#dialog-body juel-text");
        expect(input).not.toBeNull();
        expect(input.getAttribute("value")).toBe("initial");

        changeValue(input, "updated");

        expect(args.value).toBe("updated");
    });

    test("text (with field): merges the changed field into args.value by field name", () => {
        let args: MessageBoxArgs = { title: "T", text: "" };
        let field: MessageBoxPromptField = { name: "email", type: "text", value: "" };

        MessageBoxInputStrategies["text"](args, msgBox, field);

        let input = msgBox.querySelector("#dialog-body juel-text");
        expect(input.getAttribute("label")).toBe("Email");

        changeValue(input, "a@b.com");

        expect(args.value).toEqual({ email: "a@b.com" });
    });

    test("text (with field): a second field's change is merged alongside the first, not replacing it", () => {
        let args: MessageBoxArgs = { title: "T", text: "" };
        let nameField: MessageBoxPromptField = { name: "name", type: "text", value: "" };
        let emailField: MessageBoxPromptField = { name: "email", type: "text", value: "" };

        MessageBoxInputStrategies["text"](args, msgBox, nameField);
        let nameInput = msgBox.querySelectorAll("#dialog-body juel-text")[0];
        changeValue(nameInput, "Ada");

        MessageBoxInputStrategies["text"](args, msgBox, emailField);
        let emailInput = msgBox.querySelectorAll("#dialog-body juel-text")[1];
        changeValue(emailInput, "ada@example.com");

        expect(args.value).toEqual({ name: "Ada", email: "ada@example.com" });
    });
});
