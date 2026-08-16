export function NextAllMatching(element: Element, selector: string): Element[] {
    let siblings: Element[] = [];
    let sibling = element.nextElementSibling;
    while (sibling) {
        if (sibling.matches(selector)) {
            siblings.push(sibling);
        }
        sibling = sibling.nextElementSibling;
    }
    return siblings;
}
