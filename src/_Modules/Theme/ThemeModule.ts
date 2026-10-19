import { LookAttribute, LookCss, LookStyleId } from "./ThemeLook";

export module ThemeModule {
    const storageKey = "juel-theme";
    export const changedEvent = "theme-changed";

    export type SetOptions = {
        persist?: boolean;
        notify?: boolean;
    };

    // The one thing every theme UI (toggle, select, swatches, whatever a
    // developer builds) actually needs: apply a theme name to the document
    // so :root-scoped CSS can react to it (e.g. :root[data-theme="dark"]),
    // persist it, and tell the rest of the page it changed.
    export var set = (theme: string, options: SetOptions = {}): void => {
        const { persist = true, notify = true } = options;
        document.documentElement.setAttribute("data-theme", theme);
        if (persist) {
            try {
                localStorage.setItem(storageKey, theme);
            } catch {
                // storage disabled/unavailable (private browsing, etc.) — theme
                // still applies for this page view, it just won't be remembered
            }
        }
        if (notify) {
            document.dispatchEvent(new CustomEvent(changedEvent, { detail: { theme } }));
        }
    }

    export var get = (): string | null => {
        return document.documentElement.getAttribute("data-theme");
    }

    export var getStored = (): string | null => {
        try {
            return localStorage.getItem(storageKey);
        } catch {
            return null;
        }
    }

    export var systemPrefersDark = (): boolean => {
        return typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    // Forgets the stored choice and drops data-theme, so the page follows
    // the system again (the "System" in a Light / Dark / System choice).
    export var clear = (options: SetOptions = {}): void => {
        const { persist = true, notify = true } = options;
        document.documentElement.removeAttribute("data-theme");
        if (persist) {
            try {
                localStorage.removeItem(storageKey);
            } catch {
                // storage unavailable: nothing was remembered
            }
        }
        if (notify) {
            document.dispatchEvent(new CustomEvent(changedEvent, { detail: { theme: null } }));
        }
    }

    // Juel's opt-in look (ThemeLook.ts): `--juel-…` tokens, light and dark,
    // that the components follow. Off by default, so existing pages keep
    // today's look. `useLook()` turns it on (data-juel-look on <html>, plus
    // the token stylesheet); a page can also put data-juel-look in its HTML,
    // and the stylesheet is added when Juel loads. With no stored choice it
    // drops init()'s one-off light/dark guess, so the look follows the
    // system live (prefers-color-scheme) until the page sets a theme.
    export var useLook = (on: boolean = true): void => {
        const root = document.documentElement;
        if (on) {
            root.setAttribute(LookAttribute, "");
            ensureLookStyle();
            if (getStored() === null) root.removeAttribute("data-theme");
        } else {
            root.removeAttribute(LookAttribute);
        }
    }

    export var usesLook = (): boolean => {
        return document.documentElement.hasAttribute(LookAttribute);
    }

    const ensureLookStyle = (): void => {
        if (document.getElementById(LookStyleId)) return;
        const style = document.createElement("style");
        style.id = LookStyleId;
        style.textContent = LookCss;
        document.head.prepend(style);
    }

    if (typeof document !== "undefined" && document.documentElement?.hasAttribute(LookAttribute)) {
        ensureLookStyle();
    }

    // init() runs when Juel loads (JuelGlobal.ts); on a page that opted in
    // in its HTML, don't let its guess pin light or dark.
    const initGuess = (theme: string | null): void => {
        if (theme === null || !usesLook()) return;
        document.documentElement.removeAttribute("data-theme");
    }

    // Applies the stored theme (if any), else defaultTheme, else a
    // light/dark guess from the OS preference — without persisting again or
    // firing theme-changed (this is a restore, not a selection).
    export var init = (defaultTheme?: string): void => {
        const theme = getStored() || defaultTheme || (systemPrefersDark() ? "dark" : "light");
        set(theme, { persist: false, notify: false });
        if (!getStored() && !defaultTheme) initGuess(theme);
    }
}
