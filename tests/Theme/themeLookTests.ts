import { ThemeModule } from "../../src/_Modules/Theme/ThemeModule";
import { LookAttribute, LookCss, LookStyleId } from "../../src/_Modules/Theme/ThemeLook";

const tokenNames = (css: string) => new Set(Array.from(css.matchAll(/(--juel-[a-z0-9-]+)\s*:/g), m => m[1]));

describe("Juel's opt-in look", () => {
    afterEach(() => {
        document.documentElement.removeAttribute(LookAttribute);
        document.documentElement.removeAttribute("data-theme");
        document.getElementById(LookStyleId)?.remove();
        localStorage.clear();
    });

    test("is off by default: no attribute, no token stylesheet", () => {
        expect(ThemeModule.usesLook()).toBe(false);
        expect(document.getElementById(LookStyleId)).toBeNull();
    });

    test("useLook() marks <html> and adds the token stylesheet once", () => {
        ThemeModule.useLook();
        ThemeModule.useLook();
        expect(document.documentElement.hasAttribute(LookAttribute)).toBe(true);
        expect(document.querySelectorAll(`#${LookStyleId}`)).toHaveLength(1);
        expect(document.getElementById(LookStyleId)!.textContent).toBe(LookCss);
        ThemeModule.useLook(false);
        expect(ThemeModule.usesLook()).toBe(false);
    });

    test("every rule is scoped to the opt-in attribute", () => {
        const selectors = Array.from(LookCss.matchAll(/^\s*([^{}@\s][^{}]*)\{/gm), m => m[1].trim());
        expect(selectors.length).toBeGreaterThan(0);
        for (const selector of selectors) expect(selector).toContain(`[${LookAttribute}]`);
    });

    test("light and dark define the same colour tokens", () => {
        const blocks = LookCss.split(/\}\s*/);
        const light = tokenNames(blocks[0]);
        const dark = tokenNames(blocks[1]);
        for (const name of ["--juel-surface", "--juel-raised", "--juel-sunken", "--juel-border", "--juel-text",
            "--juel-muted", "--juel-selection", "--juel-danger", "--juel-shadow-1", "--juel-shadow-2"]) {
            expect(light.has(name)).toBe(true);
            expect(dark.has(name)).toBe(true);
        }
        for (const name of ["--juel-accent", "--juel-accent-contrast", "--juel-radius-sm", "--juel-radius-md",
            "--juel-radius-lg", "--juel-space-1", "--juel-text-md"])
            expect(light.has(name)).toBe(true);
    });

    test("clear() drops the light/dark choice so the system decides", () => {
        ThemeModule.set("dark");
        expect(ThemeModule.getStored()).toBe("dark");
        const seen: unknown[] = [];
        const listen = (e: Event) => seen.push((e as CustomEvent).detail.theme);
        document.addEventListener(ThemeModule.changedEvent, listen);
        ThemeModule.clear();
        document.removeEventListener(ThemeModule.changedEvent, listen);
        expect(ThemeModule.get()).toBeNull();
        expect(ThemeModule.getStored()).toBeNull();
        expect(seen).toEqual([null]);
    });
});

describe("the look and init()'s light/dark guess", () => {
    afterEach(() => {
        document.documentElement.removeAttribute(LookAttribute);
        document.documentElement.removeAttribute("data-theme");
        document.getElementById(LookStyleId)?.remove();
        localStorage.clear();
    });

    test("useLook() drops the guess so the system decides, but keeps a stored choice", () => {
        ThemeModule.init();
        expect(ThemeModule.get()).not.toBeNull();
        ThemeModule.useLook();
        expect(ThemeModule.get()).toBeNull();

        ThemeModule.useLook(false);
        ThemeModule.set("dark");
        ThemeModule.useLook();
        expect(ThemeModule.get()).toBe("dark");
    });

    test("init() on a page that opted in in its HTML doesn't pin a guess", () => {
        document.documentElement.setAttribute(LookAttribute, "");
        ThemeModule.init();
        expect(ThemeModule.get()).toBeNull();
        ThemeModule.init("dark");
        expect(ThemeModule.get()).toBe("dark");
    });

    test("without the look, init() guesses as before", () => {
        ThemeModule.init();
        expect(["light", "dark"]).toContain(ThemeModule.get());
    });
});
