export function FocusNextTabbable(selector: string) {
    let elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (elements.length === 0) {
        return;
    }
    let current = document.activeElement as HTMLElement;
    let currentIndex = elements.indexOf(current);
    let start = currentIndex >= 0 ? currentIndex + 1 : 0;
    for (let i = 0; i < elements.length; i++) {
        let candidate = elements[(start + i) % elements.length];
        if (!(candidate as any).disabled && candidate.offsetParent !== null) {
            candidate.focus();
            return;
        }
    }
}
