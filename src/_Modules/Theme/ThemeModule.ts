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

    // Applies the stored theme (if any), else defaultTheme, else a
    // light/dark guess from the OS preference — without persisting again or
    // firing theme-changed (this is a restore, not a selection).
    export var init = (defaultTheme?: string): void => {
        const theme = getStored() || defaultTheme || (systemPrefersDark() ? "dark" : "light");
        set(theme, { persist: false, notify: false });
    }
}
