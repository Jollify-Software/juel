export function GetChildren(el: HTMLElement): HTMLElement[] {
    return (Array.prototype.slice.call(el.children) as HTMLElement[]);
}