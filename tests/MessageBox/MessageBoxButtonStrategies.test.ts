import MessageBoxButtonStrategies from "../../src/_Modules/MessageBox/MessageBoxButtonStrategies";
import { MessageBoxButtons } from "../../src/_Modules/MessageBox/MessageBoxButtons";
import { MessageBoxResultStatus } from "../../src/_Modules/MessageBox/MessageBoxResultStatus";
import { MessageBoxArgs } from "../../src/_Modules/MessageBox/MessageBoxArgs";

function createMsgBox(): HTMLElement {
    let msgBox = document.createElement("div");
    msgBox.id = "overlay";
    msgBox.innerHTML = `<div id="dialog"><div id="dialog-title"><span></span></div><div id="dialog-body"></div></div>`;
    document.body.append(msgBox);
    return msgBox;
}

function click(el: Element) {
    el.dispatchEvent(new CustomEvent("button-clicked"));
}

describe("MessageBoxButtonStrategies", () => {
    let msgBox: HTMLElement;
    let args: MessageBoxArgs;
    let resolve: jest.Mock;
    let reject: jest.Mock;

    beforeEach(() => {
        document.body.innerHTML = "";
        msgBox = createMsgBox();
        args = { title: "Title", text: "Text", value: "the-value" };
        resolve = jest.fn();
        reject = jest.fn();
    });

    test("OK renders a single button that resolves with OK status and removes the overlay", () => {
        MessageBoxButtonStrategies[MessageBoxButtons.OK](args, msgBox, resolve, reject);

        let okBtn = msgBox.querySelector("#dialog-body juel-button");
        expect(okBtn).not.toBeNull();

        click(okBtn);

        expect(resolve).toHaveBeenCalledWith({ status: MessageBoxResultStatus.OK, value: "the-value" });
        expect(document.body.contains(msgBox)).toBe(false);
    });

    test("OKCancel renders well-formed markup for both buttons (regression: unterminated label attribute)", () => {
        MessageBoxButtonStrategies[MessageBoxButtons.OKCancel](args, msgBox, resolve, reject);

        let okBtn = msgBox.querySelector("#ok");
        let cancelBtn = msgBox.querySelector("#cancel");
        expect(okBtn).not.toBeNull();
        expect(cancelBtn).not.toBeNull();
        expect(cancelBtn.getAttribute("label")).toBe("Cancel");
    });

    test("OKCancel: clicking cancel resolves with Cancel status", () => {
        MessageBoxButtonStrategies[MessageBoxButtons.OKCancel](args, msgBox, resolve, reject);

        click(msgBox.querySelector("#cancel"));

        expect(resolve).toHaveBeenCalledWith({ status: MessageBoxResultStatus.Cancel });
        expect(document.body.contains(msgBox)).toBe(false);
    });

    test("OKCancel: pressing Escape inside the dialog resolves with Cancel status", () => {
        MessageBoxButtonStrategies[MessageBoxButtons.OKCancel](args, msgBox, resolve, reject);

        msgBox.querySelector("#dialog").dispatchEvent(new KeyboardEvent("keyup", { key: "Escape" }));

        expect(resolve).toHaveBeenCalledWith({ status: MessageBoxResultStatus.Cancel });
    });

    test("YesNo: clicking yes resolves with Yes status and the current value", () => {
        MessageBoxButtonStrategies[MessageBoxButtons.YesNo](args, msgBox, resolve, reject);

        click(msgBox.querySelector("#yes"));

        expect(resolve).toHaveBeenCalledWith({ status: MessageBoxResultStatus.Yes, value: "the-value" });
    });

    test("YesNo: clicking no resolves with No status", () => {
        MessageBoxButtonStrategies[MessageBoxButtons.YesNo](args, msgBox, resolve, reject);

        click(msgBox.querySelector("#no"));

        expect(resolve).toHaveBeenCalledWith({ status: MessageBoxResultStatus.No, value: "the-value" });
    });

    test("YesNoCancel renders three distinct buttons that each resolve independently", () => {
        MessageBoxButtonStrategies[MessageBoxButtons.YesNoCancel](args, msgBox, resolve, reject);

        expect(msgBox.querySelectorAll("#dialog-body juel-button").length).toBe(3);

        click(msgBox.querySelector("#cancel"));
        expect(resolve).toHaveBeenCalledWith({ status: MessageBoxResultStatus.Cancel, value: "the-value" });
    });
});
