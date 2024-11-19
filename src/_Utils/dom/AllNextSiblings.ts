export function AllNextSiblings(element: HTMLElement, excludeSelector: string = null, action: (element: HTMLElement, index: number) => void) {
    let siblings: HTMLElement[] = [];
    let index = 0;
    let currentElement = element.nextElementSibling;
    while (currentElement) {
        const nextSibling = currentElement.nextElementSibling; // Store the next sibling
        if (excludeSelector && currentElement.matches(excludeSelector)) {
            currentElement = nextSibling; // Proceed to the next sibling
            continue;
        }
        siblings.push(currentElement as HTMLElement);
        
        if (action) {
            action(currentElement as HTMLElement, index);
        }

        currentElement = nextSibling; // Proceed to the next sibling
    }
    return siblings;
}