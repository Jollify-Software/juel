export function GetNextOrParentNextSibling(element: HTMLElement, excludeSelector: string = null) {
    let currentElement = element.nextElementSibling;
    if ((!currentElement) && element.parentElement) {
        currentElement = element.parentElement.nextElementSibling;
    }
    if (!currentElement && element.parentElement) {
        return GetNextOrParentNextSibling(element.parentElement, excludeSelector);
    }
    return currentElement;
}