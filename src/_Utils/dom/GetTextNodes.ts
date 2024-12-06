export function getTextNodes(element) {
    const textNodes = [];

    function collectTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            node.childNodes.forEach(collectTextNodes);
        }
    }

    collectTextNodes(element);
    return textNodes;
}