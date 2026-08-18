export function FindParent(element: Element, predicate: (node: Element) => boolean): Element | null {
    let current: Element | null = element;
    while (current) {
        // parentElement doesn't cross a shadow boundary — once it's null, check
        // whether we're at the top of a shadow tree and, if so, continue from
        // the host element rather than stopping (or worse, crashing on the
        // next .parentElement/.nodeName access against null).
        const rootNode = current.getRootNode();
        const next: Element | null = current.parentElement
            ?? (rootNode instanceof ShadowRoot ? rootNode.host : null);
        if (!next) return null;
        if (predicate(next)) return next;
        current = next;
    }
    return null;
}