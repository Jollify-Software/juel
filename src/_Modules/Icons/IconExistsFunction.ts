export function IconExists(name: string, svg: boolean = true): boolean {
    let style = getComputedStyle(document.body);
    let icon = style.getPropertyValue(`--icon-${name}`);
    if (icon) {
        return true;
    }
    return false;
}