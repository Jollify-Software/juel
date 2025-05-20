export function findAll(selector: string, after: HTMLElement, callback: (el: HTMLElement) => void) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let foundStart = false;

    while (walker.nextNode()) {
        const node = walker.currentNode as HTMLElement;
        if (node === after) {
            foundStart = true;
            continue;
        }
        if (foundStart && node.matches(selector)) {
            callback(node);
        }
    }
}

export function findAllUntil(selector: string, after: HTMLElement, until: string, callback: (el: HTMLElement) => void) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let foundStart = false;

    while (walker.nextNode()) {
        const node = walker.currentNode as HTMLElement;
        if (node === after) {
            foundStart = true;
            continue;
        }
        if (!foundStart) continue;

        if (node.matches(until)) break;

        if (node.matches(selector)) {
            callback(node);
        }
    }
}