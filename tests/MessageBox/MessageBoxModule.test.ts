import { MessageBoxResultStatus } from "../../src/_Modules/MessageBox/MessageBoxResultStatus";

// MessageBoxModule keeps a module-level `shown` singleton flag, so each test
// re-imports it fresh (jest.resetModules) to avoid state leaking between tests.
function loadModule() {
    jest.resetModules();
    return require("../../src/_Modules/MessageBox/MessageBoxModule").MessageBoxModule;
}

function click(selector: string) {
    let el = document.querySelector(selector);
    el.dispatchEvent(new CustomEvent("button-clicked"));
}

describe("MessageBoxModule", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("show() appends an overlay with the given title and text", () => {
        let MessageBoxModule = loadModule();

        MessageBoxModule.show({ title: "Hello", text: "World" });

        expect(document.querySelector("#overlay")).not.toBeNull();
        expect(document.querySelector("#dialog-title span").textContent).toBe("Hello");
        expect(document.querySelector("#dialog-body p").textContent).toBe("World");
    });

    test("the default OK button resolves with OK status and removes the overlay", async () => {
        let MessageBoxModule = loadModule();

        let promise = MessageBoxModule.show({ title: "Hi", text: "" });
        click("juel-button");
        let result = await promise;

        expect(result).toEqual({ status: MessageBoxResultStatus.OK });
        expect(document.querySelector("#overlay")).toBeNull();
    });

    test("error() defaults the title to 'Error'", () => {
        let MessageBoxModule = loadModule();

        MessageBoxModule.error("Something broke");

        expect(document.querySelector("#dialog-title span").textContent).toBe("Error");
    });

    test("error() uses a supplied title instead of the default", () => {
        let MessageBoxModule = loadModule();

        MessageBoxModule.error("Something broke", "Oh no");

        expect(document.querySelector("#dialog-title span").textContent).toBe("Oh no");
    });

    test("question() renders Yes/No buttons and resolves with the clicked status", async () => {
        let MessageBoxModule = loadModule();

        let promise = MessageBoxModule.question("Are you sure?", "Confirm");
        expect(document.querySelector("#dialog-title span").textContent).toBe("Confirm");

        click("#yes");
        let result = await promise;

        expect(result).toEqual({ status: MessageBoxResultStatus.Yes });
    });

    test("a second show() while one is already open is ignored", () => {
        let MessageBoxModule = loadModule();

        MessageBoxModule.show({ title: "First", text: "" });
        let second = MessageBoxModule.show({ title: "Second", text: "" });

        expect(second).toBeUndefined();
        expect(document.querySelector("#dialog-title span").textContent).toBe("First");
    });

    test("once the open message box resolves, a new show() works again", async () => {
        let MessageBoxModule = loadModule();

        let first = MessageBoxModule.show({ title: "First", text: "" });
        click("juel-button");
        await first;

        let second = MessageBoxModule.show({ title: "Second", text: "" });
        expect(second).toBeDefined();
        expect(document.querySelector("#dialog-title span").textContent).toBe("Second");
    });

    test("close: true adds a close button that resolves the promise", async () => {
        let MessageBoxModule = loadModule();

        let promise = MessageBoxModule.show({ title: "Closable", text: "", close: true });
        document.querySelector("#dialog-title .close").dispatchEvent(new MouseEvent("click"));
        let result = await promise;

        expect(result).toBe(0);
        expect(document.querySelector("#overlay")).toBeNull();
    });
});
