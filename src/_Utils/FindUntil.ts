export function FindUntil(element: HTMLElement, what: string, until: string = null, breakFunc: () => void = null) {
    var result: HTMLElement[] = [];
    let children = Array.from(element.children) as HTMLElement[];
    for (let child of children) {
        if (child.matches(what)) { 
            result.push(child);
        }
        if(until && child.matches(until) ) {
            if (breakFunc) {
                breakFunc();
            }
            console.log("Break!!")
            break;
        } else {
            FindUntil(child, what, until);
        }
    };
    return result;
}

export function FindNextUntil(element: HTMLElement, what: string, until: string) {
    let wallHit = false;
    let $element = $(element);
    let elements = FindUntil(element, what, until);

    if (element.nextElementSibling) {
        let siblings = $element.nextAll().toArray();
        for (let parent of siblings) {
            elements = elements.concat(
                FindUntil(parent, what, until, () => wallHit = true)
            );
            if (wallHit) {
                break;
            }
        }
    }

    if (wallHit == false && element.parentElement) {
        let parentSiblings = $element.parent().nextAll().toArray();
        for (let parent of parentSiblings) {
            elements = elements.concat(
                FindUntil(parent, what, until, () => wallHit = true)
            );
            if (wallHit) {
                break;
            }
        }
    }

    return elements;
}