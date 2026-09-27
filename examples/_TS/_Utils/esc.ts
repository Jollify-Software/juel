// Escape a value for interpolation into innerHTML. Anything that comes from
// the URL (route params, rest) must go through this.
export function esc(value: unknown): string {
    return String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
}
