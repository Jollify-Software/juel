import { AllNextSiblings } from "./AllNextSiblings";

export function moveAllNextSiblingsTo(element: HTMLElement, moveTo: HTMLElement, excludeSelector: string = null): void {
    // Check if the startElement is valid
    if (!element || !(element instanceof HTMLElement)) {
        return;
    }

    AllNextSiblings(element, excludeSelector, (e, i) => moveTo.append(e));
}