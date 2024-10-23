import { CopyStyles } from "./CopyStyles";

export function CopyComputedStyles(sourceElement: HTMLElement, targetElement: HTMLElement) {
    // Get the computed styles of the source element
const computedStyles = window.getComputedStyle(sourceElement);
console.log("Computed Styles");
console.log(computedStyles)
CopyStyles(computedStyles, targetElement);
}