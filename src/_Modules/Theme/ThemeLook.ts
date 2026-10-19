// Juel's opt-in look: a set of `--juel-…` design tokens (colours, radii,
// spacing, type scale, shadows), light and dark. Nothing here applies until a
// page opts in with `data-juel-look` on <html> (ThemeModule.useLook() sets it),
// so pages that don't opt in look exactly as before.
//
// Juel's older global knob --active (Colours.less: selected tabs, tree rows,
// accordion headers) is set from the selection token too, as it is on :root.
//
// The --juel-<type>… tokens (light, primary, dark, danger) are what the
// button types fall back to (_CommonStyles/_Colours.less).
//
// Dark follows the system unless ThemeModule's `data-theme` says "light" or
// "dark" (the Light / Dark / System choice an app offers).

export const LookAttribute = "data-juel-look";
export const LookStyleId = "juel-look-tokens";

const shared = `
    --juel-radius-sm: 4px;
    --juel-radius-md: 8px;
    --juel-radius-lg: 12px;
    --juel-space-1: 4px;
    --juel-space-2: 8px;
    --juel-space-3: 12px;
    --juel-space-4: 16px;
    --juel-space-6: 24px;
    --juel-space-8: 32px;
    --juel-font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --juel-font-mono: ui-monospace, "Cascadia Code", Consolas, monospace;
    --juel-text-xs: 11px;
    --juel-text-sm: 12px;
    --juel-text-md: 13px;
    --juel-text-lg: 15px;
    --juel-text-xl: 18px;
    --juel-accent: #F4803C;
    --juel-accent-contrast: #1f1300;
    --juel-focus: var(--juel-accent);
    --active: var(--juel-selection);
    --active-text: var(--juel-selection-text);
    --juel-light: var(--juel-raised);
    --juel-light-text: var(--juel-text);
    --juel-light-border: var(--juel-border);
    --juel-light-hover: var(--juel-sunken);
    --juel-light-active-shadow: none;
    --juel-primary: var(--juel-accent);
    --juel-primary-text: var(--juel-accent-contrast);
    --juel-primary-hover: color-mix(in srgb, var(--juel-accent) 85%, black);
    --juel-primary-active-shadow: none;
    --juel-dark: #2b2d31;
    --juel-dark-text: #f1f2f4;
    --juel-dark-hover: #3a3c42;
    --juel-dark-active-shadow: none;
    --juel-danger-text: var(--juel-surface);
    --juel-danger-active-shadow: none;`;

const light = `
    color-scheme: light;
    --juel-surface: #ffffff;
    --juel-raised: #f7f7f8;
    --juel-sunken: #ebecef;
    --juel-border: #d9dbe0;
    --juel-text: #1d1f23;
    --juel-muted: #5f6570;
    --juel-hover: rgba(0, 0, 0, 0.06);
    --juel-pressed: rgba(0, 0, 0, 0.11);
    --juel-selection: #dbe6ff;
    --juel-selection-hover: #cad9fb;
    --juel-selection-text: #1d1f23;
    --juel-danger: #b3261e;
    --juel-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
    --juel-shadow-2: 0 6px 20px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.08);`;

const dark = `
    color-scheme: dark;
    --juel-surface: #1e1f22;
    --juel-raised: #26272b;
    --juel-sunken: #141517;
    --juel-border: #3a3c42;
    --juel-text: #e8e9ec;
    --juel-muted: #a2a7b0;
    --juel-hover: rgba(255, 255, 255, 0.07);
    --juel-pressed: rgba(255, 255, 255, 0.13);
    --juel-selection: #2c3f66;
    --juel-selection-hover: #344b78;
    --juel-selection-text: #e8e9ec;
    --juel-danger: #f2786d;
    --juel-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.5);
    --juel-shadow-2: 0 8px 24px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.4);`;

const root = `:root[${LookAttribute}]`;

export const LookCss = `
${root} {${shared}${light}
}
${root}[data-theme="dark"] {${dark}
}
@media (prefers-color-scheme: dark) {
    ${root}:not([data-theme="light"]) {${dark}
    }
}
${root} body {
    background: var(--juel-surface);
    color: var(--juel-text);
    font-family: var(--juel-font);
}
`;
