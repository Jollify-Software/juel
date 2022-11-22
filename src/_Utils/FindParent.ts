export function FindParent(element: HTMLElement, predicate: (node: Node) => boolean) {
    while ((element = element.parentElement) && 
        predicate(element.parentElement)) {            
    }
    return element;
}