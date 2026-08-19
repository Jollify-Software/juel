export function IconExists(name: string, el: HTMLElement = null): boolean {
    let style = el ? getComputedStyle(el) : getComputedStyle(window.document.body);
    let icon = style.getPropertyValue(`--icon-${name}`);
    return !!icon;
}