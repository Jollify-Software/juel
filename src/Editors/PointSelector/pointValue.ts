// A point on an element as CSS says it (`transform-origin`, `background-position`): `x% y%`. Keywords
// count as their percentages; anything else (px, calc) isn't a point this can place. Pure.

export interface PercentPoint { x: number; y: number }

const Keywords: Record<string, number> = { left: 0, top: 0, center: 50, centre: 50, right: 100, bottom: 100 };

/** `50% -150%`, `left top` or `center` as percentages; null when it can't be placed. */
export function parsePercentPoint(value: string | null | undefined): PercentPoint | null {
    const tokens = (value ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens.length > 2) return null;
    const read = (token: string) => {
        if (token in Keywords) return Keywords[token];
        const m = /^(-?(?:\d+\.?\d*|\.\d+))%$/.exec(token);
        if (m) return Number(m[1]);
        return /^-?0+(?:\.0+)?[a-z]*$/.test(token) ? 0 : null;
    };
    const first = read(tokens[0]), second = tokens.length > 1 ? read(tokens[1]) : 50;
    if (first === null || second === null) return null;
    // `top left` names the vertical one first; CSS allows it for keywords.
    if (/^(top|bottom)$/.test(tokens[0]) || /^(left|right)$/.test(tokens[1] ?? '')) return { x: second, y: first };
    return { x: first, y: second };
}

/** The CSS text for a point. */
export const percentPointText = (point: PercentPoint) => `${point.x}% ${point.y}%`;

/**
 * The point at a place in the picker's field, whose middle third is the element (so the field runs from
 * -100% to 200% each way): `fx` and `fy` are 0 to 1 across the field. Whole percents, and near one of
 * the nine presets it lands on it.
 */
export function pointFromField(fx: number, fy: number, snap = 4): PercentPoint {
    const at = (f: number) => {
        const percent = Math.round(Math.min(1, Math.max(0, f)) * 300 - 100);
        for (const preset of [0, 50, 100]) if (Math.abs(percent - preset) <= snap) return preset;
        return percent;
    };
    return { x: at(fx), y: at(fy) };
}
