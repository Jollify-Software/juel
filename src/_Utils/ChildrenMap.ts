import { LitElement, TemplateResult } from "lit";

export function ChildrenMap(el: HTMLElement, map: (el: HTMLElement, index: number) => TemplateResult, ...exclude: string[]): TemplateResult[] {
    if (exclude && exclude.length > 0) {
        return (Array.prototype.slice.call(el.children) as HTMLElement[])
            .filter(el => exclude.some(str => !el.matches(str)))
            .map(map);
    } else {
        return (Array.prototype.slice.call(el.children) as HTMLElement[])
            .map(map);
    }
}