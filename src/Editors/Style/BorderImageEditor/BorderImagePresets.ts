// The pictures juel-border-image-editor offers before you bring your own. Every one is drawn here, for
// Juel (no third-party artwork), as an SVG of 90 × 90 cut into thirds: the corners stay whole and the
// middle third of each side is what repeats, so an edge's pattern has a period that divides 30.
//
// The source is percent-encoded with no `;` or `(`, so a CSS parser that stops at either keeps it whole.

import type { BorderImageRepeat } from './BorderImageValue';

export interface BorderImagePreset {
    id: string;
    label: string;
    /** The whole `<svg>`. */
    svg: string;
    /** Its main colour: what a chosen colour replaces exactly. Its other tones move with it (`tintSvg`). */
    colour: string;
    /** `border-image-slice`, in the picture's px. */
    slice: string;
    /** The border's width to start from. */
    width: string;
    repeat: BorderImageRepeat;
    /** Fill the middle with the picture's centre. */
    fill?: boolean;
    /** Drawn to show on a dark background, so its tile is dark. */
    onDark?: boolean;
}

const drawing = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">${inner}</svg>`;

/** The same part on all four sides: drawn for the top, turned for the others. */
const fourSides = (part: string) => [0, 90, 180, 270].map(a => `<g transform="rotate(${a} 45 45)">${part}</g>`).join('');

/** A solid band from `y` a little past the middle third's ends: without it, tiles scaled to fit show a hairline at each join. */
const bleed = (y: number) => `<rect x="29" y="${y}" width="32" height="${30 - y}"/>`;

/** The eight cells around the middle's centres, as `[x, y, isCorner]`. */
const Ring: [number, number, boolean][] = [
    [15, 15, true], [45, 15, false], [75, 15, true], [75, 45, false],
    [75, 75, true], [45, 75, false], [15, 75, true], [15, 45, false],
];

const presets: Omit<BorderImagePreset, 'slice'>[] = [
    {
        id: 'classic', label: 'Classic', colour: '#1f3a5f', width: '20px', repeat: 'stretch',
        svg: drawing(`<g fill="none" stroke="#1f3a5f"><rect x="4" y="4" width="82" height="82" stroke-width="4"/><rect x="13" y="13" width="64" height="64" stroke-width="1.5"/></g>`
            + fourSides('<rect x="9" y="9" width="8" height="8" fill="#1f3a5f"/>')),
    },
    {
        id: 'deco', label: 'Deco', colour: '#a67c1e', width: '24px', repeat: 'stretch',
        svg: drawing(fourSides('<g fill="none" stroke="#a67c1e" stroke-linecap="square"><path d="M60 6H18V12H12V18H6V30" stroke-width="2.5"/><path d="M60 12H24V18H18V24H12V30" stroke-width="1"/></g><path d="M25 21l4 4-4 4-4-4z" fill="#a67c1e"/>')),
    },
    {
        id: 'gilt', label: 'Gilt', colour: '#c9962b', width: '24px', repeat: 'stretch',
        svg: drawing(`<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="30"><stop offset="0" stop-color="#fff1b8"/><stop offset=".3" stop-color="#c9962b"/><stop offset=".55" stop-color="#8a6418"/><stop offset=".8" stop-color="#f0cf6b"/><stop offset="1" stop-color="#a97c1f"/></linearGradient></defs>`
            + fourSides('<polygon points="0,0 90,0 60,30 30,30" fill="url(#g)"/><path d="M30 29.5H60" stroke="#5c4310"/>')
            + '<polygon points="90,0 90,90 60,60 60,30" fill="#000" opacity=".1"/><polygon points="0,90 90,90 60,60 30,60" fill="#000" opacity=".16"/>'),
    },
    {
        id: 'stitch', label: 'Stitch', colour: '#7c4a1e', width: '22px', repeat: 'round',
        svg: drawing('<rect x="15" y="15" width="60" height="60" fill="none" stroke="#7c4a1e" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 5"/>'),
    },
    {
        id: 'sketch', label: 'Sketch', colour: '#343a40', width: '20px', repeat: 'stretch',
        svg: drawing('<g fill="none" stroke="#343a40" stroke-width="1.6" stroke-linecap="round"><path d="M7 9C27 5 62 12 83 7C86 28 80 62 85 84C62 81 29 87 6 83C9 60 4 29 7 9Z"/><path d="M11 6C33 9 60 4 80 11C79 32 88 58 81 80C58 85 28 79 9 86C5 62 12 31 11 6Z"/></g>'),
    },
    {
        id: 'dots', label: 'Dots', colour: '#e8590c', width: '20px', repeat: 'round',
        svg: drawing(Ring.map(([x, y, corner]) => `<circle cx="${x}" cy="${y}" r="9" fill="${corner ? '#f59f00' : '#e8590c'}"/>`).join('')),
    },
    {
        id: 'pearls', label: 'Pearls', colour: '#868e96', width: '18px', repeat: 'round',
        svg: drawing('<defs><radialGradient id="p" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#e9ecef"/><stop offset="1" stop-color="#868e96"/></radialGradient></defs>'
            + fourSides('<g fill="url(#p)"><circle cx="15" cy="15" r="11"/><circle cx="37.5" cy="15" r="7"/><circle cx="52.5" cy="15" r="7"/></g>')),
    },
    {
        id: 'stripes', label: 'Stripes', colour: '#d6336c', width: '14px', repeat: 'repeat',
        svg: drawing('<defs><pattern id="s" width="15" height="15" patternUnits="userSpaceOnUse"><rect width="15" height="15" fill="#fff"/><path d="M-4 4L4 -4M0 15L15 0M11 19L19 11" stroke="#d6336c" stroke-width="5"/></pattern></defs><rect width="90" height="90" fill="url(#s)"/>'),
    },
    {
        id: 'checks', label: 'Checks', colour: '#212529', width: '14px', repeat: 'round',
        svg: drawing('<defs><pattern id="c" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#fff"/><rect width="15" height="15" fill="#212529"/><rect x="15" y="15" width="15" height="15" fill="#212529"/></pattern></defs><rect width="90" height="90" fill="url(#c)"/>'),
    },
    {
        id: 'ticket', label: 'Ticket', colour: '#fff3d6', width: '22px', repeat: 'round', fill: true,
        svg: drawing('<path d="M12 0H78A12 12 0 0 0 90 12V78A12 12 0 0 0 78 90H12A12 12 0 0 0 0 78V12A12 12 0 0 0 12 0Z" fill="#fff3d6"/><rect x="12" y="12" width="66" height="66" fill="none" stroke="#b08968" stroke-width="1.5" stroke-dasharray="6 4"/>'),
    },
    {
        id: 'film', label: 'Film', colour: '#16181d', width: '22px', repeat: 'round',
        svg: drawing('<rect width="90" height="90" fill="#16181d"/>' + fourSides('<g fill="#f1f3f5"><rect x="11" y="11" width="8" height="8" rx="1.5"/><rect x="33.5" y="11" width="8" height="8" rx="1.5"/><rect x="48.5" y="11" width="8" height="8" rx="1.5"/></g>')),
    },
    {
        id: 'corners', label: 'Corners', colour: '#495057', width: '20px', repeat: 'stretch',
        svg: drawing(fourSides('<path d="M6 28V6H28" fill="none" stroke="#495057" stroke-width="5" stroke-linecap="square"/>')),
    },
    {
        id: 'waves', label: 'Waves', colour: '#1098ad', width: '18px', repeat: 'round',
        svg: drawing(fourSides(`<g fill="#1098ad">${bleed(14)}<path d="M30 30V14Q37.5 2 45 14T60 14V30Z M30 14A16 16 0 0 0 14 30H30Z"/></g>`)),
    },
    {
        id: 'scallop', label: 'Scallop', colour: '#e64980', width: '16px', repeat: 'round',
        svg: drawing(fourSides(`<g fill="#e64980">${bleed(15)}<path d="M30 30V15A7.5 7.5 0 0 1 45 15A7.5 7.5 0 0 1 60 15V30Z M30 15A15 15 0 0 0 15 30H30Z"/></g><circle cx="37.5" cy="18" r="2" fill="#fff"/><circle cx="52.5" cy="18" r="2" fill="#fff"/><circle cx="24" cy="24" r="2" fill="#fff"/>`)),
    },
    {
        id: 'pinking', label: 'Pinking', colour: '#5f3dc4', width: '16px', repeat: 'round',
        svg: drawing(fourSides(`<g fill="#5f3dc4">${bleed(20)}<path d="M30 30V20L37.5 6L45 20L52.5 6L60 20V30Z M30 20L8 8L20 30H30Z"/></g>`)),
    },
    {
        id: 'key', label: 'Key', colour: '#0b7285', width: '24px', repeat: 'round',
        svg: drawing(fourSides('<g fill="none" stroke="#0b7285" stroke-width="2.5" stroke-linecap="square"><rect x="4" y="4" width="22" height="22"/><rect x="11" y="11" width="8" height="8"/><path d="M26 26H64M56 26V4H36V19H48V11H42"/></g>')),
    },
    {
        id: 'vine', label: 'Vine', colour: '#2f9e44', width: '24px', repeat: 'round',
        svg: drawing(fourSides('<path d="M30 20Q37.5 8 45 20T60 20M30 20Q20 20 20 30" fill="none" stroke="#2f9e44" stroke-width="2"/><g fill="#40c057"><ellipse cx="36" cy="9" rx="5" ry="2.5" transform="rotate(-30 36 9)"/><ellipse cx="54" cy="27" rx="5" ry="2.5" transform="rotate(-30 54 27)"/><ellipse cx="22" cy="10" rx="5" ry="2.5" transform="rotate(20 22 10)"/><ellipse cx="10" cy="22" rx="5" ry="2.5" transform="rotate(70 10 22)"/></g><circle cx="13" cy="13" r="3" fill="#f59f00"/>')),
    },
    {
        id: 'neon', label: 'Neon', colour: '#22d3ee', width: '24px', repeat: 'stretch', onDark: true,
        svg: drawing('<defs><filter id="n" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter></defs><rect x="15" y="15" width="60" height="60" rx="10" fill="none" stroke="#22d3ee" stroke-width="5" filter="url(#n)"/><rect x="15" y="15" width="60" height="60" rx="10" fill="none" stroke="#e0fbff" stroke-width="2"/>'),
    },
];

/** The pictures offered by default. */
export const BorderImagePresets: readonly BorderImagePreset[] = presets.map(p => ({ ...p, slice: '30' }));

type Hsl = [h: number, s: number, l: number];

/** `#rgb` or `#rrggbb` as `#rrggbb`, lower case; null for anything else. */
export function normalHex(colour: string): string | null {
    const text = colour.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(text)) return text;
    return /^#[0-9a-f]{3}$/.test(text) ? `#${[...text.slice(1)].map(c => c + c).join('')}` : null;
}

function toHsl(hex: string): Hsl {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const high = Math.max(r, g, b), low = Math.min(r, g, b), range = high - low, l = (high + low) / 2;
    if (!range) return [0, 0, l];
    const h = high === r ? ((g - b) / range + 6) % 6 : high === g ? (b - r) / range + 2 : (r - g) / range + 4;
    return [h * 60, range / (1 - Math.abs(2 * l - 1)), l];
}

function toHex([h, s, l]: Hsl): string {
    const channel = (n: number) => {
        const k = (n + h / 30) % 12;
        const value = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(value * 255).toString(16).padStart(2, '0');
    };
    return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** Lighter than this is the paper a picture is drawn on (Film's holes, Stripes' white): it stays. */
const PaperLightness = 0.95;

/**
 * `svg` with `base` turned into `colour`, exactly, and its other tones moved with it: the same step around
 * the colour wheel, the same relative strength, and a lightness scale that bends at the new colour without
 * crushing shades together, so a bevel stays a bevel. Black (a drawn shadow) and near-white stay as they are.
 */
export function tintSvg(svg: string, base: string, colour: string): string {
    const from = normalHex(base), to = normalHex(colour);
    if (!from || !to || from === to) return svg;
    const [baseHue, baseStrength, baseLight] = toHsl(from);
    const [hue, strength, light] = toHsl(to);
    // Three hex digits or six, so a `url(#g)` reference, which is shorter, isn't a colour.
    return svg.replace(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi, found => {
        const hex = normalHex(found)!;
        if (hex === from) return to;
        const [h, s, l] = toHsl(hex);
        if (hex === '#000000' || l >= PaperLightness) return found;
        const moved = l <= baseLight
            ? l * light / (baseLight || 1)
            : light + (l - baseLight) * (1 - light) / ((1 - baseLight) || 1);
        const stronger = baseStrength ? s / baseStrength : 1;
        return toHex([(hue + h - baseHue + 360) % 360, Math.min(1, strength * stronger), Math.min(1, Math.max(0, moved))]);
    });
}

const sourceOf = (svg: string) =>
    `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/[()'!*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}")`;

/**
 * A preset's `border-image-source`, in its own colours or tinted: all of it in the CSS, so it needs no file
 * and works wherever the CSS goes. A tinted one says which picture and colour it is, for `readPresetSource`.
 */
export function presetSource(preset: BorderImagePreset, colour = ''): string {
    const hex = normalHex(colour);
    if (!hex || hex === normalHex(preset.colour)) return sourceOf(preset.svg);
    return sourceOf(tintSvg(preset.svg, preset.colour, hex).replace('<svg ', `<svg data-preset="${preset.id}" data-colour="${hex}" `));
}

/** Which preset a source is, and its tint ('' for its own colours); null for any other picture. */
export function readPresetSource(source: string, presets: readonly BorderImagePreset[]): { preset: BorderImagePreset; colour: string } | null {
    const own = presets.find(p => presetSource(p) === source);
    if (own) return { preset: own, colour: '' };
    const encoded = /^\s*url\("data:image\/svg\+xml,([^"]*)"\)\s*$/.exec(source)?.[1];
    if (!encoded) return null;
    let svg: string;
    try { svg = decodeURIComponent(encoded); } catch { return null; }
    const marks = /^<svg data-preset="([^"]+)" data-colour="(#[0-9a-f]{6})"/.exec(svg);
    const preset = marks && presets.find(p => p.id === marks[1]);
    return preset ? { preset, colour: marks![2] } : null;
}
