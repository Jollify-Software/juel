import { getTextNodes } from "./GetTextNodes";

export function getSlottedTextNodes(element: HTMLSlotElement): Node[] {
    let nodes: Node[] = [];
    let assignedNodes = Array.from(element.assignedNodes());
    for (let n of assignedNodes) {
        if (n.nodeType == Node.TEXT_NODE) {
            nodes.push(n);
        } else if (n.nodeType == Node.ELEMENT_NODE) {
            let nn = getTextNodes(n);
            if (nn && nn.length > 0) {
                nn.forEach(x => nodes.push(x));
            }
        }
    }
    return nodes;
}