// The viewer's table preview: the first rows of a CSV, or of a JSON array of
// objects (charts and quizzes read both). Anything else shows as text.

/** How many data rows the preview shows. */
export const MaxTableRows = 20;

/** The header row then up to `MaxTableRows` rows, or undefined if `text` isn't a table. */
export function tableOf(name: string, text: string): string[][] | undefined {
    if (/\.csv$/i.test(name)) {
        const rows = text.split(/\r?\n/).filter(Boolean).slice(0, MaxTableRows + 1).map(parseCsvLine);
        return rows.length ? rows : undefined;
    }
    if (/\.json$/i.test(name)) {
        try {
            const data = JSON.parse(text);
            if (Array.isArray(data) && data.length && data.every(r => r && typeof r === 'object' && !Array.isArray(r))) {
                const shown = data.slice(0, MaxTableRows);
                const keys = [...new Set(shown.flatMap(r => Object.keys(r)))];
                return [keys, ...shown.map(r => keys.map(k => r[k] === undefined ? '' : String(r[k])))];
            }
        } catch { /* not JSON (or cut short): shown as text */ }
    }
    return undefined;
}

/** One CSV line: commas, and "quoted" cells with "" for a quote. */
export function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let cell = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') quoted = false;
            else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { cells.push(cell); cell = ''; }
        else cell += c;
    }
    cells.push(cell);
    return cells;
}
