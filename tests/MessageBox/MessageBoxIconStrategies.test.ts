import MessageBoxIconStrategies from "../../src/_Modules/MessageBox/MessageBoxIconStrategies";
import { MessageBoxIcon } from "../../src/_Modules/MessageBox/MessageBoxIcon";
import { MessageBoxArgs } from "../../src/_Modules/MessageBox/MessageBoxArgs";

function createMsgBox(): HTMLElement {
    let msgBox = document.createElement("div");
    msgBox.innerHTML = `<div id="dialog-body"></div>`;
    document.body.append(msgBox);
    return msgBox;
}

describe("MessageBoxIconStrategies", () => {
    // In this test environment there is no --icon-* CSS custom property defined,
    // so IconsModule.get() returns an empty string. Regression test for a bug where
    // appending the parsed (null) element inserted the literal text "null" into the DOM.
    test("does not insert a literal 'null' text node when the icon markup is empty", () => {
        let msgBox = createMsgBox();
        let args: MessageBoxArgs = { title: "T", text: "" };

        MessageBoxIconStrategies[MessageBoxIcon.Error](args, msgBox);

        expect(msgBox.querySelector("#dialog-body").textContent).toBe("");
    });
});
