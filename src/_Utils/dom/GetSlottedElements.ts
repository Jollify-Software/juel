export function getSlottedElements(element: HTMLSlotElement): HTMLElement[] {
    return element ? Array.from(element.assignedNodes()).filter(node => node.nodeType === Node.ELEMENT_NODE) as HTMLElement[] : [];
}