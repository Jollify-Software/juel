export function IconExists(name: string, el: HTMLElement = null): boolean {
    console.log(window.document.body);
    let style = el ? getComputedStyle(el) : getComputedStyle(window.document.body);
    console.log(style);
    let icon = style.getPropertyValue(`--icon-${name}`);
    console.log(icon);
    if (icon) {
        console.log(`Icon ${name} exists`);
        return true;
    }
    return false;
}