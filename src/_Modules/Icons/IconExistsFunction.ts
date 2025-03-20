export function IconExists(name: string, svg: boolean = true): boolean {
    let style = getComputedStyle(document.body);
    let icon = style.getPropertyValue(`--icon-${name}`);
    console.log(icon);
    if (icon) {
        return true;
    }
    return false;
}