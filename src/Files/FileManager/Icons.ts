// The file manager's icons: 24×24 outlines in currentColor (the folder is
// filled, as in OneDrive). Self-contained, so the component needs no icon font.
import { svg, SVGTemplateResult } from 'lit';
import { FileKind } from '../Storage/Paths';

const Paths: Record<string, SVGTemplateResult> = {
    'new-folder': svg`<path d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9a1.5 1.5 0 0 0-1.5-1.5h-8L9.5 5h-5A1.5 1.5 0 0 0 3 6.5z"/><path d="M12 11v6M9 14h6"/>`,
    upload: svg`<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"/>`,
    download: svg`<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"/>`,
    open: svg`<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>`,
    rename: svg`<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14 8l3 3"/>`,
    move: svg`<path d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9a1.5 1.5 0 0 0-1.5-1.5h-8L9.5 5h-5A1.5 1.5 0 0 0 3 6.5z"/><path d="M8 13.5h7M12.5 11l2.5 2.5-2.5 2.5"/>`,
    copy: svg`<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>`,
    duplicate: svg`<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8M14 11v6M11 14h6"/>`,
    delete: svg`<path d="M4 7h16M9 7V4.5h6V7M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M10 11v6M14 11v6"/>`,
    sort: svg`<path d="M7 4v16M4 17l3 3 3-3M13 6h7M13 11h5M13 16h3"/>`,
    list: svg`<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>`,
    grid: svg`<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>`,
    close: svg`<path d="M6 6l12 12M18 6L6 18"/>`,
    more: svg`<circle cx="5.5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor"/>`,
    dash: svg`<path d="M6 12h12"/>`,
    check: svg`<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
    chevron: svg`<path d="M9 6l6 6-6 6"/>`,
    'chevron-down': svg`<path d="M6 9l6 6 6-6"/>`,
    up: svg`<path d="M12 19V5M6 11l6-6 6 6"/>`,
    info: svg`<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01"/>`,
    search: svg`<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>`,
    'chevron-left': svg`<path d="M15 6l-6 6 6 6"/>`,
    insert: svg`<path d="M12 5v14M5 12h14"/>`,
    // File kinds
    file: svg`<path d="M6 3h8l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M14 3v5h5"/>`,
    picture: svg`<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="9" cy="9.5" r="1.6"/><path d="M4 17l5-5 4 4 2.5-2.5L20 18"/>`,
    video: svg`<rect x="3" y="6" width="13" height="12" rx="1.5"/><path d="M16 10.5l5-3v9l-5-3"/>`,
    sound: svg`<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>`,
    font: svg`<path d="M5 20L11 4h2l6 16M7.5 14h9"/>`,
    data: svg`<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>`,
    text: svg`<path d="M6 3h8l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M14 3v5h5M8.5 12.5h7M8.5 16h7"/>`,
    document: svg`<path d="M6 3h8l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M14 3v5h5M8.5 15.5h2a1.5 1.5 0 0 0 0-3h-2v5"/>`,
    archive: svg`<path d="M6 3h8l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M11 3v2h2v2h-2v2h2v2h-2v2.5"/><rect x="10" y="13.5" width="4" height="3.5" rx=".8"/>`,
};

/** An outline icon by name. */
export function icon(name: string) {
    return svg`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${Paths[name] ?? Paths.file}</svg>`;
}

/** A file kind's icon; folders are filled, as in OneDrive. */
export function kindIcon(kind: FileKind) {
    if (kind === 'folder') {
        return svg`<svg class="icon kind folder" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="var(--file-manager-folder-back, #e8a93a)" d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5.3l2 2.2H20a1.5 1.5 0 0 1 1.5 1.5V9H2.5z"/>
            <path fill="var(--file-manager-folder, #f7c548)" d="M2.5 8.8h19v9.7a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5z"/></svg>`;
    }
    return svg`<svg class="icon kind ${kind}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${Paths[kind] ?? Paths.file}</svg>`;
}
