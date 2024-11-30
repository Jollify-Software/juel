export function getSingleTextContent(nodes: Node[]) {
    return nodes.reduce((acc, node) => acc + node.textContent.trim() + " ", "").trim();
}