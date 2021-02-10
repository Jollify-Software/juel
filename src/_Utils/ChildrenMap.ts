import { LitElement, TemplateResult } from "lit-element";

export function ChildrenMap(el: HTMLElement, map: (el: HTMLElement, index: number) => TemplateResult): TemplateResult[] {
    return (Array.prototype.slice.call(el.children) as HTMLElement[])
                .map(map);
}