export function isOverflown(element) {
    let juelMedia = element.querySelector('juel-media[background]');
    if (juelMedia) {
        return false;
    }
    return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
}
export function isOverflownX(element) {
    let juelMedia = element.querySelector('juel-media[background]');
    if (juelMedia) {
        return false;
    }
    return element.scrollWidth > element.clientWidth;
}
export function isOverflownY(element: HTMLElement) {
    let sub = 0;
    let juelMedia = element.querySelector('juel-media[background]');
    if (juelMedia) {
        return false;
    }
    return (element.scrollHeight - sub) > (element.clientHeight);
}