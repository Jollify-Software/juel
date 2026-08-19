import { CopyStyles } from "./CopyStyles";

export function CopyComputedStyles(sourceElement: HTMLElement, targetElement: HTMLElement) {
    const computedStyles = window.getComputedStyle(sourceElement);
    CopyStyles(computedStyles, targetElement);
}