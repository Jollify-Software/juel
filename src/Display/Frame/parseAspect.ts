/** `16:9`, `16/9`, `1280x720` → width / height; null if not a ratio. */
export function parseAspect(aspect: string | null | undefined): number | null {
    const m = /^\s*(\d+(?:\.\d+)?)\s*[:/x×]\s*(\d+(?:\.\d+)?)\s*$/i.exec(aspect ?? '');
    if (!m) return null;
    const w = parseFloat(m[1]), h = parseFloat(m[2]);
    return w > 0 && h > 0 ? w / h : null;
}
