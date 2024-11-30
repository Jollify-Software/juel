export function getSlottedTextNodes(element: HTMLSlotElement): Node[] {
    return element ? Array.from(element.assignedNodes()).filter(node => node.nodeType === Node.TEXT_NODE) as Node[] : [];
}