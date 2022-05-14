import { LitElement, TemplateResult } from "lit";

export function ChildrenMap(el: HTMLElement, map: (el: HTMLElement, index: number) => TemplateResult, ...exclude: string[]): TemplateResult[] {
    let children: HTMLElement[] = (Array.prototype.slice.call(el.children) as HTMLElement[]);
    console.log(children.length + " number of children");
    if (exclude && exclude.length > 0) {
        return children
            .filter(el => exclude.some(str => !el.matches(str)))
            .map(map);
    } else {
        return children
            .map(map);
    }
}