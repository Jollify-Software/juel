/**
 * Recursively finds matching elements until a stopping condition is met.
 */
export function FindUntil(element: HTMLElement, what: string, until: string = null, breakFunc: () => void = null): HTMLElement[] {
    const result: HTMLElement[] = [];
    const children = Array.from(element.children) as HTMLElement[];

    for (const child of children) {
        if (child.matches(what)) {
            result.push(child);
        }
        if (until && child.matches(until)) {
            if (breakFunc) breakFunc();
            break;
        } else {
            result.push(...FindUntil(child, what, until, breakFunc));
        }
    }

    return result;
}

/**
 * Walks DOM forward from the given element, collecting matches until an "until" match is found.
 */
export function FindNextUntil(element: HTMLElement, what: string, until: string): HTMLElement[] {
    const result: HTMLElement[] = [];
    let current = element.nextElementSibling as HTMLElement;

    while (current) {
        if (current.matches(until)) break;

        if (current.matches(what)) {
            result.push(current);
        }

        result.push(...FindUntil(current, what, until, () => {}));

        current = current.nextElementSibling as HTMLElement;
    }

    return result;
}