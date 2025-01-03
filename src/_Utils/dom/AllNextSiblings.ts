import { GetNextOrParentNextSibling } from "./GetNextOrParentNextSibling";

export function AllNextSiblings(element: HTMLElement, excludeSelector: string = null,
    action: (element: HTMLElement, index: number) => void, parentUntilSelector: string = null) {
    let siblings: HTMLElement[] = [];
    let index = 0;
    let currentElement = GetNextOrParentNextSibling(element, excludeSelector);

    while (currentElement) {
        const nextSibling = currentElement.nextElementSibling; // Store the next sibling
        if (excludeSelector && currentElement.matches(excludeSelector)) {
            currentElement = nextSibling; // Proceed to the next sibling
            continue;
        }
        siblings.push(currentElement as HTMLElement);
        
        if (action) {
            console.log("Push element")
            action(currentElement as HTMLElement, index);
        }

        currentElement = nextSibling; // Proceed to the next sibling
    }

    if (parentUntilSelector && element.parentElement && (element.parentElement.matches(parentUntilSelector) == false) &&
        element.parentElement.tagName != "BODY") {
        AllNextSiblings(element.parentElement, excludeSelector, action);
    }
    return siblings;
}