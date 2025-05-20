export function generateIdFromText(text: string): string {
    return text.replace(/\s+/g, '-').toLowerCase();
}