import { css } from 'lit';

// Tokens on the host, light by default; dark when the page's Juel theme is
// dark (`<html data-theme="dark">`, where :host-context works) or the element
// has `theme="dark"`. Every token can be set from outside:
// `--file-manager-background`, `-color`, `-muted`, `-border`, `-hover`,
// `-selected`, `-selected-hover`, `-accent`, `-danger`, `-menu-background`,
// `-shadow`, `-radius`, `-row-height`, `-font`, `-folder`, `-folder-back`.
export const FileManagerStyles = css`
    :host {
        --_bg: var(--file-manager-background, #ffffff);
        --_fg: var(--file-manager-color, #242424);
        --_muted: var(--file-manager-muted, #616161);
        --_border: var(--file-manager-border, #e3e3e3);
        --_hover: var(--file-manager-hover, #f5f5f5);
        --_selected: var(--file-manager-selected, #e5f0fb);
        --_selected-hover: var(--file-manager-selected-hover, #d6e7f8);
        --_accent: var(--file-manager-accent, #0f6cbd);
        --_danger: var(--file-manager-danger, #c42b1c);
        --_menu-bg: var(--file-manager-menu-background, #ffffff);
        --_shadow: var(--file-manager-shadow, 0 8px 24px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12));
        --_radius: var(--file-manager-radius, 8px);
        --_row: var(--file-manager-row-height, 2.75rem);

        display: flex;
        flex-direction: column;
        min-height: 12rem;
        container-type: inline-size;
        color: var(--_fg);
        background: var(--_bg);
        font: var(--file-manager-font, 0.875rem/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
        box-sizing: border-box;
        position: relative;
    }
    :host([theme="dark"]) {
        --_bg: var(--file-manager-background, #1f1f1f);
        --_fg: var(--file-manager-color, #f0f0f0);
        --_muted: var(--file-manager-muted, #adadad);
        --_border: var(--file-manager-border, #383838);
        --_hover: var(--file-manager-hover, #2a2a2a);
        --_selected: var(--file-manager-selected, #1f3a5a);
        --_selected-hover: var(--file-manager-selected-hover, #264872);
        --_accent: var(--file-manager-accent, #5aa9f0);
        --_danger: var(--file-manager-danger, #ff7b6b);
        --_menu-bg: var(--file-manager-menu-background, #2b2b2b);
        --_shadow: var(--file-manager-shadow, 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.5));
    }
    /* A rule of its own: a browser without :host-context (Firefox) drops just this one. */
    :host-context([data-theme="dark"]) {
        --_bg: var(--file-manager-background, #1f1f1f);
        --_fg: var(--file-manager-color, #f0f0f0);
        --_muted: var(--file-manager-muted, #adadad);
        --_border: var(--file-manager-border, #383838);
        --_hover: var(--file-manager-hover, #2a2a2a);
        --_selected: var(--file-manager-selected, #1f3a5a);
        --_selected-hover: var(--file-manager-selected-hover, #264872);
        --_accent: var(--file-manager-accent, #5aa9f0);
        --_danger: var(--file-manager-danger, #ff7b6b);
        --_menu-bg: var(--file-manager-menu-background, #2b2b2b);
        --_shadow: var(--file-manager-shadow, 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.5));
    }
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }

    .icon { width: 1.25rem; height: 1.25rem; flex: none; }
    button {
        font: inherit;
        color: inherit;
        background: none;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
    }
    button:focus-visible, [tabindex]:focus-visible, input:focus-visible {
        outline: 2px solid var(--_accent);
        outline-offset: -2px;
    }
    button:disabled { opacity: 0.45; cursor: default; }

    /* The command bar */
    .bar {
        display: flex;
        align-items: center;
        gap: 0.125rem;
        min-height: 2.75rem;
        padding: 0.25rem 0.5rem;
        border-bottom: 1px solid var(--_border);
    }
    /* One line, always: a bar that wrapped when the selection changed would move the list under the pointer. */
    .bar .commands, .bar .end { display: flex; align-items: center; gap: 0.125rem; }
    .bar .commands { min-width: 0; overflow: hidden; }
    .bar .end { flex: none; margin-left: auto; }
    .bar.compact .commands .text { display: none; }
    .bar.compact .commands .command { padding: 0 0.5rem; }
    .command {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        height: 2.25rem;
        padding: 0 0.6rem;
        white-space: nowrap;
    }
    .command:hover:not(:disabled) { background: var(--_hover); }
    .command[aria-pressed="true"] { background: var(--_selected); }
    .search {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        height: 2rem;
        padding: 0 0.6rem;
        margin: 0.5rem 0.75rem 0 auto;
        border: 1px solid var(--_border);
        border-radius: 999px;
        color: var(--_muted);
    }
    .search:focus-within { border-color: var(--_accent); }
    .search .icon { width: 1rem; height: 1rem; }
    .search input { width: 10rem; padding: 0; border: 0; outline: none; font: inherit; color: var(--_fg); background: none; }
    .command.danger:hover { color: var(--_danger); }
    .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        height: 2rem;
        padding: 0 0.75rem 0 0.5rem;
        margin-left: 0.25rem;
        border: 1px solid var(--_border);
        border-radius: 999px;
    }
    .chip:hover { background: var(--_hover); }
    .chip .icon { width: 1rem; height: 1rem; }
    .chevron { display: contents; }

    /* Where we are, and search */
    .where-bar { display: flex; align-items: flex-start; flex-wrap: wrap; }
    .crumbs {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.125rem;
        padding: 0.75rem 0.75rem 0.5rem;
        font-size: 1.25rem;
    }
    .crumb {
        padding: 0.125rem 0.375rem;
        font-size: inherit;
        color: var(--_muted);
    }
    .crumb:hover { background: var(--_hover); color: var(--_fg); }
    .crumb[aria-current="page"] { color: var(--_fg); font-weight: 600; cursor: default; }
    .crumb[aria-current="page"]:hover { background: none; }
    .crumbs .sep { display: inline-grid; color: var(--_muted); }
    .crumbs .results { padding: 0.125rem 0.375rem; font-weight: 600; }
    .crumbs .sep .icon { width: 1rem; height: 1rem; }

    /* The list (and the details pane beside it) */
    .body { flex: 1; min-height: 0; display: flex; }
    .list {
        min-width: 0;
        flex: 1;
        overflow: auto;
        padding: 0 0.5rem 0.5rem;
        outline: none;
    }
    /* Files from the desktop over the view. */
    .list.dropping { outline: 2px dashed var(--_accent); outline-offset: -2px; border-radius: var(--_radius); }
    /* ...or over a folder row or crumb: that gets the outline, and a badge. */
    .item.drop-target, .crumb.drop-target { outline: 2px dashed var(--_accent); outline-offset: -2px; border-radius: var(--_radius); }
    .drop-badge {
        flex: none;
        margin-left: 0.5rem;
        padding: 0 0.5rem;
        border-radius: 999px;
        background: var(--_accent);
        color: #fff;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.25rem;
        pointer-events: none;
    }
    .row {
        display: grid;
        grid-template-columns: 2.5rem minmax(8rem, 1fr) var(--file-manager-modified-width, 11rem) var(--file-manager-size-width, 7rem);
        align-items: center;
        min-height: var(--_row);
        border-bottom: 1px solid var(--_border);
        border-radius: 0;
    }
    .row > .cell { min-width: 0; padding: 0 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .head {
        position: sticky;
        top: 0;
        z-index: 1;
        min-height: 2.5rem;
        background: var(--_bg);
        color: var(--_muted);
        font-weight: 600;
    }
    .head .sort {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        height: 2rem;
        padding: 0 0.375rem;
        margin-left: -0.375rem;
        color: inherit;
        font-weight: inherit;
    }
    .head .sort:hover { background: var(--_hover); color: var(--_fg); }
    .head .sort .icon { width: 0.875rem; height: 0.875rem; }
    .head .sort .icon.up { transform: rotate(180deg); }
    .item { cursor: default; user-select: none; -webkit-user-select: none; border-radius: 6px; border-bottom-color: transparent; position: relative; }
    .row.item::after { content: ""; position: absolute; left: 0.5rem; right: 0.5rem; bottom: -1px; border-bottom: 1px solid var(--_border); }
    .item:hover { background: var(--_hover); }
    .item[aria-selected="true"] { background: var(--_selected); }
    .item[aria-selected="true"]:hover { background: var(--_selected-hover); }
    .row.item[aria-selected="true"]::after, .row.item:hover::after { border-color: transparent; }
    .list:focus-visible .item.focus { outline: 2px solid var(--_accent); outline-offset: -2px; }
    .muted { color: var(--_muted); }

    .check {
        display: grid;
        place-items: center;
        width: 1.25rem;
        height: 1.25rem;
        margin: auto;
        padding: 0;
        border: 1.5px solid var(--_muted);
        border-radius: 50%;
        background: var(--_bg);
        color: transparent;
        opacity: 0;
    }
    .check .icon { width: 0.875rem; height: 0.875rem; stroke-width: 2.5; }
    .item:hover .check, .check:focus-visible, :host([selecting]) .check, .head .check.some { opacity: 1; }
    .check[aria-checked="true"], .check[aria-checked="mixed"] { opacity: 1; background: var(--_accent); border-color: var(--_accent); color: #fff; }
    .head .check:hover, .head .check:focus-visible { opacity: 1; }

    .name { display: flex; align-items: center; gap: 0.625rem; }
    .name .label { overflow: hidden; text-overflow: ellipsis; }
    .name .kind { width: 1.5rem; height: 1.5rem; color: var(--_muted); }
    .name .kind.picture, .name .kind.video { color: #8a5cd1; }
    .name .kind.sound { color: #c2410c; }
    .name .kind.data { color: #107c41; }
    .name .kind.font { color: #b4009e; }
    .name .kind.document { color: #c42b1c; }
    .item .actions { margin-left: auto; display: flex; opacity: 0; }
    .item:hover .actions, .item.focus .actions, .item .actions:focus-within, .item[aria-selected="true"] .actions { opacity: 1; }
    .icon-button { display: grid; place-items: center; width: 2rem; height: 2rem; padding: 0; }
    .icon-button:hover { background: var(--_selected-hover); }
    .rename {
        flex: 1;
        min-width: 0;
        height: 2rem;
        padding: 0 0.5rem;
        font: inherit;
        color: inherit;
        background: var(--_bg);
        border: 1px solid var(--_accent);
        border-radius: 4px;
    }
    .name .where { flex: none; max-width: 40%; overflow: hidden; text-overflow: ellipsis; font-size: 0.75rem; }

    /* Tiles */
    .list.grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--file-manager-tile-width, 9.5rem), 1fr));
        align-content: start;
        gap: 0.5rem;
        padding: 0.5rem;
    }
    .list.grid > .empty, .list.grid > .more { grid-column: 1 / -1; }
    .tile { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; padding: 0.5rem; border-radius: var(--_radius); }
    .tile .thumb {
        display: grid;
        place-items: center;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        border-radius: 6px;
        background: var(--_hover);
    }
    .tile:hover .thumb, .tile[aria-selected="true"] .thumb { background: var(--_bg); }
    .tile .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .tile .thumb .kind { width: 3rem; height: 3rem; color: var(--_muted); }
    .tile .thumb .kind.picture, .tile .thumb .kind.video { color: #8a5cd1; }
    .tile .thumb .kind.folder { width: 4rem; height: 4rem; }
    .tile .name { min-height: 2rem; gap: 0.25rem; }
    .tile .name .label { white-space: nowrap; }
    .tile .sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
    .tile .check { position: absolute; top: 0.875rem; left: 0.875rem; z-index: 1; margin: 0; }
    .tile .drop-badge { position: absolute; top: 0.875rem; right: 0.875rem; margin: 0; }
    .tile .rename { height: 1.75rem; }
    .list.grid:focus-visible .tile.focus { outline: 2px solid var(--_accent); outline-offset: -2px; }

    /* The details pane */
    .details {
        flex: none;
        width: var(--file-manager-details-width, 18rem);
        overflow: auto;
        padding: 0.75rem 1rem 1rem;
        border-left: 1px solid var(--_border);
    }
    .details .preview {
        display: grid;
        place-items: center;
        aspect-ratio: 4 / 3;
        margin-bottom: 0.75rem;
        overflow: hidden;
        border-radius: var(--_radius);
        background: var(--_hover);
        color: var(--_muted);
    }
    .details .preview img { width: 100%; height: 100%; object-fit: contain; }
    .details .preview .icon { width: 3.5rem; height: 3.5rem; }
    .details h3 { margin: 0 0 0.75rem; font-size: 1rem; font-weight: 600; overflow-wrap: anywhere; }
    .details dl { display: grid; grid-template-columns: auto 1fr; gap: 0.375rem 0.75rem; margin: 0 0 0.75rem; }
    .details dt { color: var(--_muted); }
    .details dd { margin: 0; overflow-wrap: anywhere; }

    .empty { padding: 3rem 1rem; text-align: center; color: var(--_muted); }
    .empty .icon { width: 3rem; height: 3rem; margin-bottom: 0.5rem; }
    .more { display: block; margin: 0.75rem auto; padding: 0.375rem 1rem; border: 1px solid var(--_border); }

    .status {
        min-height: 1.75rem;
        padding: 0.25rem 0.75rem;
        border-top: 1px solid var(--_border);
        color: var(--_muted);
        font-size: 0.8125rem;
    }
    .status.error { color: var(--_danger); }
    .quota {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.375rem 0.75rem;
        border-top: 1px solid var(--_border);
        color: var(--_muted);
        font-size: 0.8125rem;
    }
    .quota .meter { flex: none; width: 6rem; height: 0.375rem; overflow: hidden; border-radius: 999px; background: var(--_border); }
    .quota .meter > span { display: block; height: 100%; background: var(--_accent); }
    .quota.full .meter > span { background: var(--_danger); }
    .status:empty { display: none; }

    /* The ⋯ / sort / upload menu */
    .menu {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
        min-width: 12rem;
        padding: 0.25rem;
        background: var(--_menu-bg);
        border-radius: var(--_radius);
        box-shadow: var(--_shadow);
    }
    .menu button {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        width: 100%;
        height: 2.25rem;
        padding: 0 0.625rem;
        text-align: left;
        border-radius: 4px;
    }
    .menu button:hover, .menu button:focus-visible { background: var(--_hover); outline: none; }
    .menu button.danger:hover { color: var(--_danger); }
    .menu .tick { margin-left: auto; color: var(--_accent); }
    .menu hr { margin: 0.25rem 0.25rem; border: 0; border-top: 1px solid var(--_border); }

    /* Move to / Copy to */
    dialog {
        width: min(28rem, calc(100vw - 2rem));
        max-height: min(32rem, calc(100vh - 2rem));
        padding: 0;
        color: var(--_fg);
        background: var(--_menu-bg);
        border: 0;
        border-radius: var(--_radius);
        box-shadow: var(--_shadow);
    }
    dialog::backdrop { background: rgba(0, 0, 0, 0.35); }
    dialog form { display: flex; flex-direction: column; max-height: inherit; }
    dialog h2 { margin: 0; padding: 1rem 1.25rem 0.5rem; font-size: 1.125rem; font-weight: 600; }
    dialog .folders { flex: 1; overflow: auto; padding: 0.25rem 0.75rem; min-height: 8rem; }
    dialog button.folder {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        height: 2.25rem;
        padding: 0 0.5rem;
        text-align: left;
    }
    dialog button.folder:hover:not(:disabled) { background: var(--_hover); }
    dialog button.folder[aria-selected="true"] { background: var(--_selected); }
    dialog footer { display: flex; justify-content: flex-end; gap: 0.5rem; padding: 0.75rem 1.25rem 1rem; }
    dialog footer button { height: 2.25rem; padding: 0 1rem; border: 1px solid var(--_border); }
    dialog footer button.primary { color: #fff; background: var(--_accent); border-color: var(--_accent); }

    @container (max-width: 1100px) {
        .end .command .text { display: none; }
    }
    @container (max-width: 640px) {
        .command .text { display: none; }
        .command { padding: 0 0.5rem; }
        .search input { width: 6rem; }
        .chip .text, .end .chevron { display: none; }
        .chip { padding: 0 0.6rem 0 0.4rem; }
        .body { flex-direction: column; }
        .details { width: auto; max-height: 45%; border-left: 0; border-top: 1px solid var(--_border); }
        .details .preview { aspect-ratio: auto; height: 8rem; }
    }
    @container (max-width: 520px) {
        .row { grid-template-columns: 2.5rem minmax(6rem, 1fr) var(--file-manager-size-width, 6rem); }
        .row .modified { display: none; }
    }
`;
